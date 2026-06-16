use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{created, ok, ApiResponse};
use crate::api::sessions::{
    BulkArchiveRequest, BulkArchiveResponse, CreateSessionRequest, PaginatedResponse,
    PaginationMeta, SessionDetailResponse, SessionQuery, SessionResponse,
};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::cache::CachedSession;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;
use crate::utils::forex::normalize_currency;

use super::authz::require_session_owner_or_admin;

pub(super) async fn list_sessions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<SessionQuery>,
) -> Result<Json<PaginatedResponse<Vec<SessionResponse>>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    let (sessions, total) = repo
        .find_by_user_paginated(
            auth_user.user_id,
            query.search.as_deref(),
            query.status.as_deref(),
            query.from,
            query.to,
            query.include_archived,
            query.page,
            query.limit,
        )
        .await?;

    let total_pages = (total as f64 / query.limit as f64).ceil() as i64;

    Ok(Json(PaginatedResponse {
        data: sessions,
        meta: PaginationMeta {
            total,
            page: query.page,
            limit: query.limit,
            total_pages,
        },
    }))
}

pub(super) async fn create_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<SessionResponse>>), AppError> {
    require_feature_enabled(&state, "sessions").await?;

    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    let name = payload.name.trim().to_string();
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation {
            field: "name".to_string(),
            message: "Session name must be between 1 and 200 characters".to_string(),
        });
    }

    let location = payload
        .location
        .as_ref()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty());

    let base_currency = match payload.base_currency.as_deref() {
        Some(code) => Some(normalize_currency(code)?),
        None => None,
    };

    let timezone = payload
        .timezone
        .as_ref()
        .map(|tz| tz.trim().to_string())
        .filter(|tz| !tz.is_empty());

    let repo = SessionRepository::new(state.pool.clone());

    let session = repo
        .create_with_participants(
            &name,
            location.as_deref(),
            payload.session_date,
            auth_user.user_id,
            payload.group_id,
            payload.participant_ids.as_deref(),
            payload.guest_names.as_deref(),
            base_currency.as_deref(),
            timezone.as_deref(),
        )
        .await?;

    let feed_repo = crate::repository::feed_repo::FeedRepository::new(state.pool.clone());
    let _ = feed_repo
        .create_activity(
            auth_user.user_id,
            "session_created",
            session.id,
            "session",
            serde_json::json!({
                 "name": session.name,
                 "location": session.location
            }),
        )
        .await;

    Ok(created(session))
}

pub(super) async fn get_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionDetailResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    if let Some(cached) = state.cache.get_session(session_id).await {
        repo.verify_participant(session_id, auth_user.user_id)
            .await?;

        return Ok(ok(SessionDetailResponse {
            id: cached.id,
            name: cached.name,
            location: cached.location,
            status: cached.status,
            created_by: cached.created_by,
            created_at: cached.created_at,
            session_date: cached.session_date,
            total_amount: cached.total_amount,
            group_id: cached.group_id,
            base_currency: cached.base_currency,
            minimize_debts: cached.minimize_debts,
            timezone: cached.timezone,
            archived_at: cached.archived_at,
            participants: cached.participants,
        }));
    }

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    state
        .cache
        .cache_session(CachedSession {
            id: session.id,
            name: session.name.clone(),
            location: session.location.clone(),
            status: session.status,
            created_by: session.created_by,
            created_at: session.created_at,
            session_date: session.session_date,
            total_amount: session.total_amount,
            group_id: session.group_id,
            base_currency: session.base_currency.clone(),
            minimize_debts: session.minimize_debts,
            timezone: session.timezone.clone(),
            archived_at: session.archived_at,
            participants: session.participants.clone(),
        })
        .await;

    Ok(ok(session))
}

pub(super) async fn delete_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;
    repo.delete(session_id).await?;
    state.cache.invalidate_session(session_id).await;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub(super) async fn archive_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    let debt_repo = crate::repository::session::SessionDebtRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;

    if debt_repo.has_unsettled_debts(session_id).await? {
        return Err(AppError::Validation {
            field: "session".to_string(),
            message: "Cannot archive session with pending debts. Please settle all debts first."
                .to_string(),
        });
    }

    let session = repo.set_archived(session_id, true).await?;

    state.cache.invalidate_session(session_id).await;
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "ARCHIVED".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

pub(super) async fn restore_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;
    let session = repo.set_archived(session_id, false).await?;

    state.cache.invalidate_session(session_id).await;
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "ACTIVE".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

pub(super) async fn bulk_archive_sessions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<BulkArchiveRequest>,
) -> Result<Json<ApiResponse<BulkArchiveResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    if payload.session_ids.is_empty() {
        return Err(AppError::Validation {
            field: "session_ids".to_string(),
            message: "session_ids cannot be empty".to_string(),
        });
    }

    let archived_ids: Vec<Uuid> = if auth_user.role == "admin" {
        sqlx::query_scalar(
            r#"
        UPDATE sessions
        SET archived_at = NOW(), updated_at = NOW()
        WHERE id = ANY($1) AND archived_at IS NULL
        RETURNING id
        "#,
        )
        .bind(&payload.session_ids)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"
        UPDATE sessions
        SET archived_at = NOW(), updated_at = NOW()
        WHERE id = ANY($1) AND created_by = $2 AND archived_at IS NULL
        RETURNING id
        "#,
        )
        .bind(&payload.session_ids)
        .bind(auth_user.user_id)
        .fetch_all(&state.pool)
        .await?
    };

    let archived_set: std::collections::HashSet<Uuid> = archived_ids.iter().copied().collect();
    let skipped_ids = payload
        .session_ids
        .into_iter()
        .filter(|id| !archived_set.contains(id))
        .collect::<Vec<_>>();

    Ok(ok(BulkArchiveResponse {
        archived_ids,
        skipped_ids,
    }))
}
