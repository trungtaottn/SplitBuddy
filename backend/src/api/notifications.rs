//! In-app notifications API
//!
//! Provides endpoints for managing user notifications and a service
//! for creating notifications from other parts of the application.

use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::ws::WsEvent;
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

/// Notification types matching the database enum
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "notification_type", rename_all = "snake_case")]
pub enum NotificationType {
    SettlementRequest,
    SettlementConfirmed,
    SettlementRejected,
    BillAdded,
    AddedToSession,
    RemovedFromSession,
    SessionClosed,
    AchievementUnlocked,
    System,
}

impl std::fmt::Display for NotificationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NotificationType::SettlementRequest => write!(f, "settlement_request"),
            NotificationType::SettlementConfirmed => write!(f, "settlement_confirmed"),
            NotificationType::SettlementRejected => write!(f, "settlement_rejected"),
            NotificationType::BillAdded => write!(f, "bill_added"),
            NotificationType::AddedToSession => write!(f, "added_to_session"),
            NotificationType::RemovedFromSession => write!(f, "removed_from_session"),
            NotificationType::SessionClosed => write!(f, "session_closed"),
            NotificationType::AchievementUnlocked => write!(f, "achievement_unlocked"),
            NotificationType::System => write!(f, "system"),
        }
    }
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

fn default_page() -> i64 { 1 }
fn default_limit() -> i64 { 20 }

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
            "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false"
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1"
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    };

    let unread_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false"
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
        "SELECT COUNT(*)::bigint FROM notifications WHERE user_id = $1 AND is_read = false"
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

/// Notification Service for creating notifications from other parts of the app
#[derive(Clone)]
pub struct NotificationService {
    pool: PgPool,
}

impl NotificationService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a notification and optionally push via WebSocket
    pub async fn create(
        &self,
        user_id: Uuid,
        notification_type: NotificationType,
        title: &str,
        message: &str,
        data: Option<serde_json::Value>,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        let id = Uuid::new_v4();
        let data = data.unwrap_or(serde_json::json!({}));

        sqlx::query(
            r#"
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES ($1, $2, $3::notification_type, $4, $5, $6)
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(notification_type.to_string())
        .bind(title)
        .bind(message)
        .bind(&data)
        .execute(&self.pool)
        .await?;

        // Push via WebSocket if manager is provided
        if let Some(ws) = ws_manager {
            ws.send_to_user(
                user_id,
                WsEvent::NotificationReceived {
                    notification_id: id,
                    title: title.to_string(),
                    notification_type: notification_type.to_string(),
                },
            )
            .await;
        }

        Ok(id)
    }

    /// Helper: Notify about settlement request
    pub async fn notify_settlement_request(
        &self,
        creditor_id: Uuid,
        debtor_name: &str,
        amount: &str,
        session_name: &str,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        self.create(
            creditor_id,
            NotificationType::SettlementRequest,
            "Yêu cầu thanh toán",
            &format!("{} yêu cầu xác nhận đã thanh toán {} cho phiên \"{}\"", debtor_name, amount, session_name),
            Some(serde_json::json!({
                "debtor_name": debtor_name,
                "amount": amount,
                "session_name": session_name
            })),
            ws_manager,
        )
        .await
    }

    /// Helper: Notify about settlement confirmed
    pub async fn notify_settlement_confirmed(
        &self,
        debtor_id: Uuid,
        creditor_name: &str,
        amount: &str,
        session_name: &str,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        self.create(
            debtor_id,
            NotificationType::SettlementConfirmed,
            "Thanh toán đã được xác nhận",
            &format!("{} đã xác nhận thanh toán {} cho phiên \"{}\"", creditor_name, amount, session_name),
            Some(serde_json::json!({
                "creditor_name": creditor_name,
                "amount": amount,
                "session_name": session_name
            })),
            ws_manager,
        )
        .await
    }

    /// Helper: Notify about bill added
    pub async fn notify_bill_added(
        &self,
        user_id: Uuid,
        creator_name: &str,
        bill_description: &str,
        amount: &str,
        session_name: &str,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        self.create(
            user_id,
            NotificationType::BillAdded,
            "Hóa đơn mới",
            &format!("{} đã thêm hóa đơn \"{}\" ({}) trong phiên \"{}\"", creator_name, bill_description, amount, session_name),
            Some(serde_json::json!({
                "creator_name": creator_name,
                "bill_description": bill_description,
                "amount": amount,
                "session_name": session_name
            })),
            ws_manager,
        )
        .await
    }

    /// Helper: Notify user added to session
    pub async fn notify_added_to_session(
        &self,
        user_id: Uuid,
        session_name: &str,
        added_by: &str,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        self.create(
            user_id,
            NotificationType::AddedToSession,
            "Được thêm vào phiên nhậu",
            &format!("{} đã thêm bạn vào phiên \"{}\"", added_by, session_name),
            Some(serde_json::json!({
                "session_name": session_name,
                "added_by": added_by
            })),
            ws_manager,
        )
        .await
    }

    /// Helper: Notify about achievement unlocked
    pub async fn notify_achievement_unlocked(
        &self,
        user_id: Uuid,
        achievement_name: &str,
        achievement_description: &str,
        xp_reward: i32,
        ws_manager: Option<&crate::api::WsManager>,
    ) -> Result<Uuid, AppError> {
        self.create(
            user_id,
            NotificationType::AchievementUnlocked,
            "🏆 Thành tựu mới!",
            &format!("Bạn đã đạt được thành tựu \"{}\" và nhận {} XP!", achievement_name, xp_reward),
            Some(serde_json::json!({
                "achievement_name": achievement_name,
                "achievement_description": achievement_description,
                "xp_reward": xp_reward
            })),
            ws_manager,
        )
        .await
    }
}
