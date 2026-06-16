use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use uuid::Uuid;

use crate::api::personas_achievements::{
    check_achievements, get_all_achievements, get_my_achievements,
};
use crate::api::personas_dto::{
    LeaderboardEntry, PersonaWithUser, UpdatePersonaRequest, UserPersona,
};
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
