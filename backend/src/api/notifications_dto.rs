use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

#[derive(Deserialize)]
pub struct UnsubscribePushRequest {
    pub endpoint: String,
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

#[derive(Deserialize)]
pub struct TestPushRequest {
    pub title: String,
    pub body: String,
}
