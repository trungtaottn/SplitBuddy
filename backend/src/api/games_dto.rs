use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, sqlx::FromRow)]
pub struct GameContentResponse {
    pub id: Uuid,
    pub game_type: String,
    pub content_type: String,
    pub content: String,
    pub difficulty: Option<String>,
}

#[derive(Deserialize)]
pub struct GameQuery {
    pub difficulty: Option<String>,
    pub include_adult: Option<bool>,
}

#[derive(Deserialize)]
pub struct SpinRequest {
    pub spin_type: Option<String>,
    pub custom_task: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct SpinResult {
    pub id: Uuid,
    pub winner_id: Uuid,
    pub winner_name: String,
    pub spin_type: String,
    pub custom_task: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
