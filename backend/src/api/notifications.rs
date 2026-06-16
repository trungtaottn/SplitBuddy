//! In-app notifications API
//!
//! Provides endpoints for managing user notifications.

use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub data: serde_json::Value,
    pub is_read: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ListNotificationsQuery {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub unread_only: bool,
}

fn default_page() -> i64 {
    1
}
fn default_limit() -> i64 {
    20
}

#[derive(Debug, Serialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<NotificationResponse>,
    pub total: i64,
    pub unread_count: i64,
}

#[derive(Debug, Serialize)]
pub struct UnreadCountResponse {
    pub count: i64,
}

/// List notifications for the authenticated user
async fn list_notifications(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<ListNotificationsQuery>,
) -> Result<Json<ApiResponse<NotificationListResponse>>, AppError> {
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

#[derive(Deserialize)]
pub struct PushSubscriptionRequest {
    pub endpoint: String,
    pub keys: PushSubscriptionKeys,
}

#[derive(Deserialize)]
pub struct PushSubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Serialize)]
pub struct PushSubscriptionResponse {
    pub message: String,
}

#[allow(dead_code)]
#[derive(Serialize)]
pub struct MessageResponse {
    pub message: String,
}

/// Subscribe to push notifications
pub async fn subscribe_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<PushSubscriptionRequest>,
) -> Result<Json<ApiResponse<PushSubscriptionResponse>>, AppError> {
    sqlx::query(
        r#"
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, endpoint) 
        DO UPDATE SET 
            p256dh_key = EXCLUDED.p256dh_key,
            auth_key = EXCLUDED.auth_key,
            updated_at = NOW()
        "#,
    )
    .bind(auth_user.user_id)
    .bind(&payload.endpoint)
    .bind(&payload.keys.p256dh)
    .bind(&payload.keys.auth)
    .execute(&state.pool)
    .await?;

    // Ensure notification preferences exist
    sqlx::query(
        r#"
        INSERT INTO notification_preferences (user_id, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await?;

    Ok(ok(PushSubscriptionResponse {
        message: "Push subscription registered successfully".to_string(),
    }))
}

#[derive(Deserialize)]
pub struct UnsubscribePushRequest {
    pub endpoint: String,
}

/// Unsubscribe from push notifications
pub async fn unsubscribe_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UnsubscribePushRequest>,
) -> Result<Json<ApiResponse<PushSubscriptionResponse>>, AppError> {
    sqlx::query(
        r#"
        DELETE FROM push_subscriptions
        WHERE user_id = $1 AND endpoint = $2
        "#,
    )
    .bind(auth_user.user_id)
    .bind(&payload.endpoint)
    .execute(&state.pool)
    .await?;

    Ok(ok(PushSubscriptionResponse {
        message: "Push subscription removed successfully".to_string(),
    }))
}

#[derive(Serialize, sqlx::FromRow)]
pub struct NotificationPreferencesResponse {
    pub debt_reminders: bool,
    pub settlement_notifications: bool,
    pub session_invites: bool,
    pub bill_updates: bool,
    pub game_events: bool,
}

#[derive(Deserialize)]
pub struct UpdatePreferencesRequest {
    pub debt_reminders: Option<bool>,
    pub settlement_notifications: Option<bool>,
    pub session_invites: Option<bool>,
    pub bill_updates: Option<bool>,
    pub game_events: Option<bool>,
}

/// Get notification preferences
pub async fn get_preferences(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<NotificationPreferencesResponse>>, AppError> {
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

#[derive(Deserialize)]
pub struct TestPushRequest {
    pub title: String,
    pub body: String,
}

/// Send a test push notification to self
pub async fn send_test_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<TestPushRequest>,
) -> Result<Json<ApiResponse<MessageResponse>>, AppError> {
    let count = state
        .push_service
        .send_notification(
            auth_user.user_id,
            &payload.title,
            &payload.body,
            Some("/"), // Click action URL
            None,      // Extra data
        )
        .await?;

    Ok(ok(MessageResponse {
        message: format!("Sent push notification to {} devices", count),
    }))
}
