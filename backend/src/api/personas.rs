use axum::{
    extract::{Path, State},
    routing::{get, post, put},
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
        .route("/me", get(get_my_persona))
        .route("/me", put(update_my_persona))
        .route("/achievements", get(get_all_achievements))
        .route("/achievements/me", get(get_my_achievements))
        .route("/achievements/check", post(check_achievements))
        .route("/user/:user_id", get(get_user_persona))
        .route("/leaderboard", get(get_leaderboard))
}

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

// Get or create current user's persona
async fn get_my_persona(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<PersonaWithUser>>, (axum::http::StatusCode, String)> {
    // Ensure persona exists
    sqlx::query(
        r#"
        INSERT INTO user_personas (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let persona = sqlx::query_as::<_, UserPersona>(
        r#"
        SELECT user_id, avatar_style, avatar_accessories, avatar_background,
               avatar_frame, level, xp, current_title, display_badges
        FROM user_personas WHERE user_id = $1
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = sqlx::query_as::<_, (String, String, Option<String>)>(
        "SELECT full_name, email, avatar_url FROM users WHERE id = $1",
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let achievements_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM user_achievements WHERE user_id = $1")
            .bind(auth_user.user_id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(PersonaWithUser {
        user_id: auth_user.user_id,
        full_name: user.0,
        email: user.1,
        avatar_url: user.2,
        persona,
        achievements_count: achievements_count.0,
    })))
}

// Update current user's persona
async fn update_my_persona(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req): Json<UpdatePersonaRequest>,
) -> Result<Json<ApiResponse<UserPersona>>, (axum::http::StatusCode, String)> {
    // Ensure persona exists first
    sqlx::query(
        r#"
        INSERT INTO user_personas (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let persona = sqlx::query_as::<_, UserPersona>(
        r#"
        UPDATE user_personas SET
            avatar_style = COALESCE($2, avatar_style),
            avatar_accessories = COALESCE($3, avatar_accessories),
            avatar_background = COALESCE($4, avatar_background),
            avatar_frame = COALESCE($5, avatar_frame),
            current_title = COALESCE($6, current_title),
            display_badges = COALESCE($7, display_badges),
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING user_id, avatar_style, avatar_accessories, avatar_background,
                  avatar_frame, level, xp, current_title, display_badges
        "#,
    )
    .bind(auth_user.user_id)
    .bind(req.avatar_style)
    .bind(req.avatar_accessories.map(|v| serde_json::json!(v)))
    .bind(req.avatar_background)
    .bind(req.avatar_frame)
    .bind(req.current_title)
    .bind(req.display_badges.as_deref())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(persona)))
}

// Get all available achievements
async fn get_all_achievements(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<Achievement>>>, (axum::http::StatusCode, String)> {
    let achievements = sqlx::query_as::<_, Achievement>(
        r#"
        SELECT code, name, description, icon, category, xp_reward
        FROM achievements
        ORDER BY category, xp_reward DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(achievements)))
}

// Get current user's unlocked achievements
async fn get_my_achievements(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<UserAchievement>>>, (axum::http::StatusCode, String)> {
    let achievements = sqlx::query_as::<_, UserAchievement>(
        r#"
        SELECT a.code, a.name, a.description, a.icon, a.category, ua.unlocked_at
        FROM user_achievements ua
        JOIN achievements a ON a.code = ua.achievement_code
        WHERE ua.user_id = $1
        ORDER BY ua.unlocked_at DESC
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(achievements)))
}

// Check and unlock new achievements
async fn check_achievements(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<String>>>, (axum::http::StatusCode, String)> {
    let mut newly_unlocked: Vec<String> = Vec::new();

    // Get user stats
    let sessions_created: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM sessions WHERE created_by = $1")
            .bind(auth_user.user_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));

    let sessions_attended: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT s.id) FROM sessions s 
         JOIN participants p ON p.session_id = s.id 
         WHERE p.user_id = $1",
    )
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    // Check party_starter (10+ sessions created)
    if sessions_created.0 >= 10
        && try_unlock_achievement(&state.pool, auth_user.user_id, "party_starter").await
    {
        newly_unlocked.push("party_starter".to_string());
    }

    // Check centurion (100 sessions attended)
    if sessions_attended.0 >= 100
        && try_unlock_achievement(&state.pool, auth_user.user_id, "centurion").await
    {
        newly_unlocked.push("centurion".to_string());
    }

    // Check founding_member
    let user_created: Option<(chrono::DateTime<chrono::Utc>,)> =
        sqlx::query_as("SELECT created_at FROM users WHERE id = $1")
            .bind(auth_user.user_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if let Some((created_at,)) = user_created {
        // Static date string - use expect() since this is a compile-time constant
        let founding_cutoff = chrono::DateTime::parse_from_rfc3339("2026-06-01T00:00:00Z")
            .expect("Static date string should always parse")
            .with_timezone(&chrono::Utc);
        if created_at < founding_cutoff
            && try_unlock_achievement(&state.pool, auth_user.user_id, "founding_member").await
        {
            newly_unlocked.push("founding_member".to_string());
        }
    }

    // Add XP and create feed activity for newly unlocked achievements
    let feed_repo = crate::repository::feed_repo::FeedRepository::new(state.pool.clone());

    for code in &newly_unlocked {
        let achievement_info: Option<(String, i32)> =
            sqlx::query_as("SELECT name, xp_reward FROM achievements WHERE code = $1")
                .bind(code)
                .fetch_optional(&state.pool)
                .await
                .unwrap_or(None);

        if let Some((name, xp_reward)) = achievement_info {
            add_xp(&state.pool, auth_user.user_id, xp_reward).await;

            // Create Activity
            let _ = feed_repo
                .create_activity(
                    auth_user.user_id,
                    "achievement_unlocked",
                    auth_user.user_id, // Target is the user themselves vs specific achievement ID? Or maybe just user_id works.
                    "user_achievement",
                    serde_json::json!({
                         "achievement_code": code,
                         "achievement_name": name,
                         "xp_reward": xp_reward
                    }),
                )
                .await;
        }
    }

    Ok(Json(ApiResponse::new(newly_unlocked)))
}

async fn try_unlock_achievement(pool: &sqlx::PgPool, user_id: Uuid, code: &str) -> bool {
    sqlx::query(
        r#"
        INSERT INTO user_achievements (user_id, achievement_code)
        VALUES ($1, $2)
        ON CONFLICT (user_id, achievement_code) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(code)
    .execute(pool)
    .await
    .map(|r| r.rows_affected() > 0)
    .unwrap_or(false)
}

async fn add_xp(pool: &sqlx::PgPool, user_id: Uuid, xp: i32) {
    // Add XP and calculate new level (100 XP per level)
    let _ = sqlx::query(
        r#"
        UPDATE user_personas 
        SET xp = xp + $2,
            level = GREATEST(1, (xp + $2) / 100 + 1),
            updated_at = NOW()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .bind(xp)
    .execute(pool)
    .await;
}

// Get another user's persona (public view)
async fn get_user_persona(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
) -> Result<Json<ApiResponse<PersonaWithUser>>, (axum::http::StatusCode, String)> {
    let persona = sqlx::query_as::<_, UserPersona>(
        r#"
        SELECT user_id, avatar_style, avatar_accessories, avatar_background,
               avatar_frame, level, xp, current_title, display_badges
        FROM user_personas WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let persona = persona.ok_or((
        axum::http::StatusCode::NOT_FOUND,
        "User persona not found".to_string(),
    ))?;

    let user = sqlx::query_as::<_, (String, String, Option<String>)>(
        "SELECT full_name, email, avatar_url FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let achievements_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM user_achievements WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(PersonaWithUser {
        user_id,
        full_name: user.0,
        email: user.1,
        avatar_url: user.2,
        persona,
        achievements_count: achievements_count.0,
    })))
}

// Get leaderboard by XP
async fn get_leaderboard(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<LeaderboardEntry>>>, (axum::http::StatusCode, String)> {
    let leaderboard = sqlx::query_as::<_, LeaderboardEntry>(
        r#"
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.xp DESC) as rank,
            p.user_id,
            u.full_name,
            u.avatar_url,
            p.level,
            p.xp,
            p.current_title
        FROM user_personas p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.xp DESC
        LIMIT 50
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ApiResponse::new(leaderboard)))
}
