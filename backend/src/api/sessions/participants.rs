use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{created, ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::authz::require_session_owner_or_admin;
use super::ParticipantResponse;

#[derive(Deserialize, Validate)]
pub struct AddParticipantRequest {
    pub user_id: Option<Uuid>,
    #[validate(length(
        min = 1,
        max = 100,
        message = "Guest name must be between 1 and 100 characters"
    ))]
    pub guest_name: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateParticipantRequest {
    pub guest_name: Option<String>,
    pub default_weight: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Deserialize)]
pub struct ParticipantPathParams {
    pub id: Uuid,
    pub pid: Uuid,
}

pub async fn add_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<AddParticipantRequest>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<ParticipantResponse>>,
    ),
    AppError,
> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, session_id).await?;

    if payload.user_id.is_none() && payload.guest_name.is_none() {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Either user_id or guest_name must be provided".to_string(),
        });
    }

    let participant = repo
        .add_participant(session_id, payload.user_id, payload.guest_name)
        .await?;

    // Create notification for user if they were added to the session
    if let Some(user_id) = payload.user_id {
        tracing::info!(
            "[NOTIFICATION DEBUG] User {} was added to session {}, checking preferences...",
            user_id,
            session_id
        );

        // Check if user has session_invites notifications enabled
        let prefs_enabled: bool = sqlx::query_scalar(
            r#"
            SELECT COALESCE(session_invites, true)
            FROM notification_preferences
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await?
        .unwrap_or(true); // Default to enabled if preferences don't exist

        tracing::info!(
            "[NOTIFICATION DEBUG] Preference check result: {}",
            prefs_enabled
        );

        if prefs_enabled {
            // Get session name for notification
            let session_name: String =
                sqlx::query_scalar("SELECT name FROM sessions WHERE id = $1")
                    .bind(session_id)
                    .fetch_one(&state.pool)
                    .await?;

            // Get inviter name
            let inviter_name: String =
                sqlx::query_scalar("SELECT full_name FROM users WHERE id = $1")
                    .bind(auth_user.user_id)
                    .fetch_one(&state.pool)
                    .await?;

            tracing::info!(
                "[NOTIFICATION DEBUG] Creating notification: '{}' invited by '{}' to session '{}'",
                user_id,
                inviter_name,
                session_name
            );

            // Create notification
            let notification_id = uuid::Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
                VALUES ($1, $2, 'session_invite', $3, $4, $5, false, NOW())
                "#,
            )
            .bind(notification_id)
            .bind(user_id)
            .bind(format!("Bạn được thêm vào session: {}", session_name))
            .bind(format!("{} đã thêm bạn vào session '{}'", inviter_name, session_name))
            .bind(serde_json::json!({
                "session_id": session_id,
                "session_name": session_name,
                "inviter_id": auth_user.user_id,
                "inviter_name": inviter_name
            }))
            .execute(&state.pool)
            .await?;

            tracing::info!(
                "[NOTIFICATION DEBUG] ✅ Notification {} created successfully!",
                notification_id
            );

            // Send real-time notification
            state
                .ws_manager
                .send_to_user(
                    user_id,
                    WsEvent::NotificationReceived {
                        notification_id,
                        title: format!("Bạn được thêm vào session: {}", session_name),
                        notification_type: "session_invite".to_string(),
                    },
                )
                .await;
        } else {
            tracing::info!("[NOTIFICATION DEBUG] ❌ Notification NOT created - user has disabled session_invites");
        }
    } else {
        tracing::info!("[NOTIFICATION DEBUG] No user_id provided, this is a guest participant - no notification created");
    }

    // Broadcast participant added event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::ParticipantChanged {
                session_id,
                action: "added".to_string(),
            },
        )
        .await;

    Ok(created(participant))
}

pub async fn update_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
    Json(payload): Json<UpdateParticipantRequest>,
) -> Result<Json<ApiResponse<ParticipantResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, params.id).await?;

    // Update participant (guest_name, default_weight, is_active)
    let participant = repo
        .update_participant(
            params.pid,
            payload.guest_name,
            payload.default_weight,
            payload.is_active,
        )
        .await?;

    // Invalidate cache if weights or active status changed (affects debt calculation)
    if payload.default_weight.is_some() || payload.is_active.is_some() {
        state.cache.invalidate_session(params.id).await;
    }

    // Broadcast participant updated event
    state
        .ws_manager
        .broadcast_to_session(
            params.id,
            WsEvent::ParticipantChanged {
                session_id: params.id,
                action: "updated".to_string(),
            },
        )
        .await;

    Ok(ok(participant))
}

pub async fn delete_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());

    require_session_owner_or_admin(&state.pool, &auth_user, params.id).await?;

    // Check if participant has any bills
    let has_bills: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
        SELECT 1 FROM bill_payers WHERE participant_id = $1
        UNION
        SELECT 1 FROM bill_splits WHERE participant_id = $1
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if has_bills {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tham gia đã có trong hóa đơn".to_string(),
        });
    }

    // Check if participant is the session owner
    let is_owner: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM session_participants sp
            JOIN sessions s ON sp.session_id = s.id
            WHERE sp.id = $1 AND sp.user_id = s.created_by
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if is_owner {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tạo session".to_string(),
        });
    }

    // Delete participant
    repo.delete_participant(params.pid).await?;

    // Broadcast participant removed event
    state
        .ws_manager
        .broadcast_to_session(
            params.id,
            WsEvent::ParticipantChanged {
                session_id: params.id,
                action: "removed".to_string(),
            },
        )
        .await;

    Ok(ok(()))
}
