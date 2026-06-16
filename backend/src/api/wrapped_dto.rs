use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct WrappedQuery {
    pub year: Option<i32>,
    pub period: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WrappedStats {
    pub total_sessions: i64,
    pub total_spent: f64,
    pub total_received: f64,
    pub avg_per_session: f64,
    pub favorite_day: Option<String>,
    pub favorite_month: Option<String>,
    pub late_night_sessions: i64,
    pub unique_partners: i64,
    pub top_partner: Option<PartnerStat>,
    pub top_3_partners: Vec<PartnerStat>,
    pub groups_count: i64,
    pub favorite_group: Option<GroupStat>,
    pub unique_locations: i64,
    pub favorite_location: Option<String>,
    pub achievements_earned: i64,
    pub top_achievement: Option<String>,
    pub biggest_session: Option<SessionStat>,
    pub longest_streak_weeks: i64,
    pub generous_score: f64,
    pub titles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PartnerStat {
    pub user_id: Uuid,
    pub name: String,
    pub sessions_together: i64,
    pub total_spent_together: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GroupStat {
    pub group_id: Uuid,
    pub name: String,
    pub sessions_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionStat {
    pub session_id: Uuid,
    pub name: String,
    pub total_amount: f64,
    pub date: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct WrappedData {
    pub id: Uuid,
    pub user_id: Uuid,
    pub year: i32,
    pub period: String,
    pub stats: serde_json::Value,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}
