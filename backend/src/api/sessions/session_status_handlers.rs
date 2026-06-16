use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::sessions::{SessionResponse, UpdateMinimizeDebtsRequest};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::domain::session::SessionStatus;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::authz::require_session_owner_or_admin;

pub(super) async fn close_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;
    let session = repo
        .update_status(session_id, SessionStatus::Closed)
        .await?;

    state.cache.invalidate_session(session_id).await;
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "closed".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

pub(super) async fn reopen_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;
    let session = repo
        .update_status(session_id, SessionStatus::Active)
        .await?;

    state.cache.invalidate_session(session_id).await;
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "active".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

pub(super) async fn update_minimize_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<UpdateMinimizeDebtsRequest>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;

    let session = repo
        .update_minimize_debts(session_id, payload.minimize_debts)
        .await?;

    state.cache.invalidate_session(session_id).await;
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::SessionUpdated { session_id })
        .await;
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
        .await;

    Ok(ok(session))
}
