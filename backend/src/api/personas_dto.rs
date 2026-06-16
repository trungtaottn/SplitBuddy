use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserPersona {
    pub user_id: Uuid,
    pub avatar_style: String,
    pub avatar_accessories: serde_json::Value,
    pub avatar_background: String,
    pub avatar_frame: String,
    pub level: i32,
    pub xp: i32,
    pub current_title: Option<String>,
    pub display_badges: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Achievement {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: String,
    pub category: String,
    pub xp_reward: i32,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserAchievement {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: String,
    pub category: String,
    pub unlocked_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePersonaRequest {
    pub avatar_style: Option<String>,
    pub avatar_accessories: Option<Vec<String>>,
    pub avatar_background: Option<String>,
    pub avatar_frame: Option<String>,
    pub current_title: Option<String>,
    pub display_badges: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct PersonaWithUser {
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub persona: UserPersona,
    pub achievements_count: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub user_id: Uuid,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub level: i32,
    pub xp: i32,
    pub current_title: Option<String>,
}
