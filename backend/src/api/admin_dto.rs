use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::audit::AuditLogEntry;

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    100
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub per_page: i64,
    pub total: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: T,
    pub pagination: PaginationMeta,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub full_name: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct FeatureFlag {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub module: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct ToggleFeatureRequest {
    pub enabled: bool,
}

#[derive(Serialize)]
pub struct BulkToggleResponse {
    pub updated_count: i64,
    pub module: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MusicTrack {
    pub id: Uuid,
    pub name: String,
    pub filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub duration_seconds: Option<i32>,
    pub uploaded_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct MusicTrackResponse {
    pub id: Uuid,
    pub name: String,
    pub src: String,
}

#[derive(Deserialize)]
pub struct AddMusicUrlRequest {
    pub name: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct AuditLogsResponse {
    pub logs: Vec<AuditLogEntry>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}
