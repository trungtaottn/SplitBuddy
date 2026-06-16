//! In-app notifications API
//!
//! Provides endpoints for managing user notifications.

use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::notifications_dto::{
    ListNotificationsQuery, NotificationListResponse, NotificationPreferencesResponse,
    NotificationResponse, UnreadCountResponse, UpdatePreferencesRequest,
};
use crate::api::notifications_push::{send_test_push, subscribe_push, unsubscribe_push};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_notifications))
        .route("/unread-count", get(get_unread_count))
        .route("/:id/read", put(mark_as_read))
        .route("/mark-all-read", post(mark_all_as_read))
        .route("/push/subscribe", post(subscribe_push))
        .route("/push/unsubscribe", post(unsubscribe_push))
        .route("/push/test", post(send_test_push))
        .route("/preferences", get(get_preferences).put(update_preferences))
}

/// List notifications for the authenticated user
async fn list_notifications(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<ListNotificationsQuery>,
) -> Result<Json<ApiResponse<NotificationListResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    let page = query.page.max(1);
    let limit = query.limit.clamp(1, 100);
    let offset = (page - 1) * limit;

    let notifications: Vec<NotificationResponse> = if query.unread_only {
        sqlx::query_as(
            r#"
            SELECT id, user_id, type::text as notification_type, title, message, data, is_read, created_at, read_at
            FROM notifications
            WHERE user_id = $1 AND is_read = false
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            r#"
            SELECT id, user_id, type::text as notification_type, title, message, data, is_read, created_at, read_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?
    };

    let total: i64 = if query.unread_only {
        sqlx::query_scalar(
            "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false",
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar("SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1")
            .bind(auth_user.user_id)
            .fetch_one(&state.pool)
            .await?
    };

    let unread_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false",
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(NotificationListResponse {
        notifications,
        total,
        unread_count,
    }))
}

/// Get unread notification count
async fn get_unread_count(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<UnreadCountResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false",
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(UnreadCountResponse { count }))
}

/// Mark a single notification as read
async fn mark_as_read(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(notification_id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    let result = sqlx::query(
        r#"
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(notification_id)
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::Validation {
            field: "notification_id".to_string(),
            message: "Notification not found".to_string(),
        });
    }

    Ok(ok(()))
}

/// Mark all notifications as read
async fn mark_all_as_read(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    sqlx::query(
        r#"
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE user_id = $1 AND is_read = false
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await?;

    Ok(ok(()))
}

/// Get notification preferences
pub async fn get_preferences(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<NotificationPreferencesResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    let prefs: Option<NotificationPreferencesResponse> = sqlx::query_as(
        r#"
        SELECT debt_reminders, settlement_notifications, session_invites, bill_updates, game_events
        FROM notification_preferences
        WHERE user_id = $1
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_optional(&state.pool)
    .await?;

    let prefs = prefs.unwrap_or(NotificationPreferencesResponse {
        debt_reminders: true,
        settlement_notifications: true,
        session_invites: true,
        bill_updates: true,
        game_events: false,
    });

    Ok(ok(prefs))
}

/// Update notification preferences
pub async fn update_preferences(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UpdatePreferencesRequest>,
) -> Result<Json<ApiResponse<NotificationPreferencesResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    sqlx::query(
        r#"
        INSERT INTO notification_preferences (user_id, debt_reminders, settlement_notifications, session_invites, bill_updates, game_events, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            debt_reminders = COALESCE(EXCLUDED.debt_reminders, notification_preferences.debt_reminders),
            settlement_notifications = COALESCE(EXCLUDED.settlement_notifications, notification_preferences.settlement_notifications),
            session_invites = COALESCE(EXCLUDED.session_invites, notification_preferences.session_invites),
            bill_updates = COALESCE(EXCLUDED.bill_updates, notification_preferences.bill_updates),
            game_events = COALESCE(EXCLUDED.game_events, notification_preferences.game_events),
            updated_at = NOW()
        "#,
    )
    .bind(auth_user.user_id)
    .bind(payload.debt_reminders.unwrap_or(true))
    .bind(payload.settlement_notifications.unwrap_or(true))
    .bind(payload.session_invites.unwrap_or(true))
    .bind(payload.bill_updates.unwrap_or(true))
    .bind(payload.game_events.unwrap_or(false))
    .execute(&state.pool)
    .await?;

    let prefs: NotificationPreferencesResponse = sqlx::query_as(
        r#"
        SELECT debt_reminders, settlement_notifications, session_invites, bill_updates, game_events
        FROM notification_preferences
        WHERE user_id = $1
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(prefs))
}
