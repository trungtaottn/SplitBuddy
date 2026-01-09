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
