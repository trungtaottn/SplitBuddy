use axum::{extract::State, Json};
use uuid::Uuid;

use crate::api::personas_dto::{Achievement, UserAchievement};
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::middleware::auth::AuthUser;

pub async fn get_all_achievements(
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

pub async fn get_my_achievements(
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

pub async fn check_achievements(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<String>>>, (axum::http::StatusCode, String)> {
    let mut newly_unlocked: Vec<String> = Vec::new();

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

    if sessions_created.0 >= 10
        && try_unlock_achievement(&state.pool, auth_user.user_id, "party_starter").await
    {
        newly_unlocked.push("party_starter".to_string());
    }

    if sessions_attended.0 >= 100
        && try_unlock_achievement(&state.pool, auth_user.user_id, "centurion").await
    {
        newly_unlocked.push("centurion".to_string());
    }

    let user_created: Option<(chrono::DateTime<chrono::Utc>,)> =
        sqlx::query_as("SELECT created_at FROM users WHERE id = $1")
            .bind(auth_user.user_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if let Some((created_at,)) = user_created {
        let founding_cutoff = chrono::DateTime::from_timestamp(1_748_736_000, 0)
            .unwrap_or(chrono::DateTime::<chrono::Utc>::MIN_UTC);
        if created_at < founding_cutoff
            && try_unlock_achievement(&state.pool, auth_user.user_id, "founding_member").await
        {
            newly_unlocked.push("founding_member".to_string());
        }
    }

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

            let _ = feed_repo
                .create_activity(
                    auth_user.user_id,
                    "achievement_unlocked",
                    auth_user.user_id,
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
