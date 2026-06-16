use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_my_wrapped))
        .route("/generate", get(generate_wrapped))
}

#[derive(Debug, Deserialize)]
pub struct WrappedQuery {
    pub year: Option<i32>,
    pub period: Option<String>, // 'yearly', 'q1', 'q2', 'q3', 'q4'
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WrappedStats {
    // Basic stats
    pub total_sessions: i64,
    pub total_spent: f64,
    pub total_received: f64,
    pub avg_per_session: f64,

    // Time patterns
    pub favorite_day: Option<String>,
    pub favorite_month: Option<String>,
    pub late_night_sessions: i64,

    // Social stats
    pub unique_partners: i64,
    pub top_partner: Option<PartnerStat>,
    pub top_3_partners: Vec<PartnerStat>,
    pub groups_count: i64,
    pub favorite_group: Option<GroupStat>,

    // Location stats
    pub unique_locations: i64,
    pub favorite_location: Option<String>,

    // Achievements
    pub achievements_earned: i64,
    pub top_achievement: Option<String>,

    // Fun facts
    pub biggest_session: Option<SessionStat>,
    pub longest_streak_weeks: i64,
    pub generous_score: f64, // % times you paid more than your share

    // Titles earned this period
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

// Get cached wrapped or generate new
async fn get_my_wrapped(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<WrappedQuery>,
) -> Result<Json<ApiResponse<WrappedStats>>, (axum::http::StatusCode, String)> {
    let year = query.year.unwrap_or_else(|| chrono::Utc::now().year());
    let period = query.period.unwrap_or_else(|| "yearly".to_string());

    // Try to get cached wrapped
    let cached: Option<WrappedData> = sqlx::query_as(
        r#"
        SELECT id, user_id, year, period, stats, generated_at
        FROM user_wrapped
        WHERE user_id = $1 AND year = $2 AND period = $3
        "#,
    )
    .bind(auth_user.user_id)
    .bind(year)
    .bind(&period)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(wrapped) = cached {
        let stats: WrappedStats = serde_json::from_value(wrapped.stats)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        return Ok(Json(ApiResponse::new(stats)));
    }

    // Generate new wrapped
    let stats = generate_wrapped_stats(&state.pool, auth_user.user_id, year, &period).await?;

    // Cache it
    if let Ok(stats_json) = serde_json::to_value(&stats) {
        let _ = sqlx::query(
            r#"
            INSERT INTO user_wrapped (user_id, year, period, stats)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, year, period) 
            DO UPDATE SET stats = $4, generated_at = NOW()
            "#,
        )
        .bind(auth_user.user_id)
        .bind(year)
        .bind(&period)
        .bind(stats_json)
        .execute(&state.pool)
        .await;
    }

    Ok(Json(ApiResponse::new(stats)))
}

// Force regenerate wrapped
async fn generate_wrapped(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<WrappedQuery>,
) -> Result<Json<ApiResponse<WrappedStats>>, (axum::http::StatusCode, String)> {
    let year = query.year.unwrap_or_else(|| chrono::Utc::now().year());
    let period = query.period.unwrap_or_else(|| "yearly".to_string());

    let stats = generate_wrapped_stats(&state.pool, auth_user.user_id, year, &period).await?;

    // Update cache
    if let Ok(stats_json) = serde_json::to_value(&stats) {
        let _ = sqlx::query(
            r#"
            INSERT INTO user_wrapped (user_id, year, period, stats)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, year, period) 
            DO UPDATE SET stats = $4, generated_at = NOW()
            "#,
        )
        .bind(auth_user.user_id)
        .bind(year)
        .bind(&period)
        .bind(stats_json)
        .execute(&state.pool)
        .await;
    }

    Ok(Json(ApiResponse::new(stats)))
}

async fn generate_wrapped_stats(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    year: i32,
    period: &str,
) -> Result<WrappedStats, (axum::http::StatusCode, String)> {
    let (start_date, end_date) = get_date_range(year, period);

    // Total sessions attended
    let total_sessions: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT s.id)
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1 
          AND s.session_date >= $2 
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Total spent (from bills where user paid)
    let total_spent: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(bp.amount_paid::float), 0)
        FROM bill_payers bp
        JOIN bills b ON b.id = bp.bill_id
        JOIN sessions s ON s.id = b.session_id
        JOIN participants p ON p.id = bp.participant_id
        WHERE p.user_id = $1
          AND s.session_date >= $2 
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((Some(0.0),));

    // Total received (from debts settled to user)
    let total_received: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(d.amount::float), 0)
        FROM debts d
        JOIN sessions s ON s.id = d.session_id
        WHERE d.creditor_id = $1 
          AND d.status = 'settled'
          AND s.session_date >= $2 
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((Some(0.0),));

    // Favorite day of week
    let favorite_day: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT TO_CHAR(s.session_date, 'Day') as day
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1
          AND s.session_date >= $2 
          AND s.session_date < $3
        GROUP BY TO_CHAR(s.session_date, 'Day')
        ORDER BY COUNT(*) DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Unique partners
    let unique_partners: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT p2.user_id)
        FROM participants p1
        JOIN participants p2 ON p2.session_id = p1.session_id AND p2.user_id != p1.user_id
        JOIN sessions s ON s.id = p1.session_id
        WHERE p1.user_id = $1 AND p2.user_id IS NOT NULL
          AND s.session_date >= $2 
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Top partner
    let top_partner: Option<(Uuid, String, i64)> = sqlx::query_as(
        r#"
        SELECT p2.user_id, u.full_name, COUNT(DISTINCT s.id) as sessions_count
        FROM participants p1
        JOIN participants p2 ON p2.session_id = p1.session_id AND p2.user_id != p1.user_id
        JOIN sessions s ON s.id = p1.session_id
        JOIN users u ON u.id = p2.user_id
        WHERE p1.user_id = $1 AND p2.user_id IS NOT NULL
          AND s.session_date >= $2 
          AND s.session_date < $3
        GROUP BY p2.user_id, u.full_name
        ORDER BY sessions_count DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Unique locations
    let unique_locations: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT LOWER(COALESCE(s.location, '')))
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1 AND s.location IS NOT NULL AND s.location != ''
          AND s.session_date >= $2 
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Favorite location
    let favorite_location: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT s.location
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1 AND s.location IS NOT NULL AND s.location != ''
          AND s.session_date >= $2 
          AND s.session_date < $3
        GROUP BY s.location
        ORDER BY COUNT(*) DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Achievements earned this period
    let achievements_earned: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM user_achievements
        WHERE user_id = $1
          AND unlocked_at >= $2::timestamptz
          AND unlocked_at < $3::timestamptz
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Groups count
    let groups_count: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT gm.group_id)
        FROM group_members gm
        WHERE gm.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    let total_spent_val = total_spent.0.unwrap_or(0.0);
    let avg_per_session = if total_sessions.0 > 0 {
        total_spent_val / total_sessions.0 as f64
    } else {
        0.0
    };

    Ok(WrappedStats {
        total_sessions: total_sessions.0,
        total_spent: total_spent_val,
        total_received: total_received.0.unwrap_or(0.0),
        avg_per_session,
        favorite_day: favorite_day.map(|d| d.0.trim().to_string()),
        favorite_month: None,
        late_night_sessions: 0,
        unique_partners: unique_partners.0,
        top_partner: top_partner.map(|(id, name, count)| PartnerStat {
            user_id: id,
            name,
            sessions_together: count,
            total_spent_together: 0.0,
        }),
        top_3_partners: vec![],
        groups_count: groups_count.0,
        favorite_group: None,
        unique_locations: unique_locations.0,
        favorite_location: favorite_location.map(|l| l.0),
        achievements_earned: achievements_earned.0,
        top_achievement: None,
        biggest_session: None,
        longest_streak_weeks: 0,
        generous_score: 0.0,
        titles: vec![],
    })
}

fn get_date_range(year: i32, period: &str) -> (String, String) {
    match period {
        "q1" => (format!("{}-01-01", year), format!("{}-04-01", year)),
        "q2" => (format!("{}-04-01", year), format!("{}-07-01", year)),
        "q3" => (format!("{}-07-01", year), format!("{}-10-01", year)),
        "q4" => (format!("{}-10-01", year), format!("{}-01-01", year + 1)),
        _ => (format!("{}-01-01", year), format!("{}-01-01", year + 1)),
    }
}

use chrono::Datelike;
