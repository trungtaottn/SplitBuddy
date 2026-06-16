use axum::{
    extract::{Path, State},
    routing::{delete, get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::games_content::{get_challenge, get_never_have_i_ever, get_truth_or_dare};
use crate::api::games_dice::roll_dice;
use crate::api::games_dto::{SpinRequest, SpinResult};
use crate::api::games_repository_handlers::{
    add_game_history, create_custom_question, delete_custom_question, get_custom_questions,
    get_game_history, get_leaderboard, get_random_custom, get_session_stats, record_drink,
};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::{
    response::{ok, ApiResponse},
    AppState,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/truth-or-dare", get(get_truth_or_dare))
        .route("/never-have-i-ever", get(get_never_have_i_ever))
        .route("/challenges", get(get_challenge))
        .route("/dice", get(roll_dice))
        // History
        .route(
            "/history/:session_id",
            get(get_game_history).post(add_game_history),
        )
        // Custom Questions
        .route(
            "/custom",
            get(get_custom_questions).post(create_custom_question),
        )
        .route("/custom/:id", delete(delete_custom_question))
        .route("/custom/random/:game_type", get(get_random_custom))
        // Stats
        .route("/stats/:session_id", get(get_session_stats))
        .route("/stats/:session_id/drink", post(record_drink))
        .route("/leaderboard", get(get_leaderboard))
}

pub async fn spin_wheel(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<SpinRequest>,
) -> Result<Json<ApiResponse<SpinResult>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_spin_wheel").await?;

    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Get random participant
    #[derive(sqlx::FromRow)]
    struct ParticipantRow {
        id: Uuid,
        display_name: String,
    }

    let winner: Option<ParticipantRow> = sqlx::query_as(
        r#"
        SELECT 
            sp.id,
            COALESCE(u.full_name, sp.guest_name, 'Unknown') as display_name
        FROM session_participants sp
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sp.session_id = $1
        ORDER BY RANDOM()
        LIMIT 1
        "#,
    )
    .bind(session_id)
    .fetch_optional(&state.pool)
    .await?;

    let winner = winner.ok_or(AppError::Validation {
        field: "participants".to_string(),
        message: "No participants found".to_string(),
    })?;

    let spin_type = payload.spin_type.unwrap_or_else(|| "random".to_string());
    let spin_id = Uuid::new_v4();

    // Save spin history
    sqlx::query!(
        r#"
        INSERT INTO spin_history (id, session_id, winner_participant_id, spin_type, custom_task, spun_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        "#,
        spin_id,
        session_id,
        winner.id,
        spin_type,
        payload.custom_task,
        auth_user.user_id
    )
    .execute(&state.pool)
    .await?;

    // Get created_at
    let created_at: (chrono::DateTime<chrono::Utc>,) =
        sqlx::query_as("SELECT created_at FROM spin_history WHERE id = $1")
            .bind(spin_id)
            .fetch_one(&state.pool)
            .await?;

    Ok(ok(SpinResult {
        id: spin_id,
        winner_id: winner.id,
        winner_name: winner.display_name,
        spin_type,
        custom_task: payload.custom_task,
        created_at: created_at.0,
    }))
}

pub async fn get_spin_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<SpinResult>>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_spin_wheel").await?;

    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let history: Vec<SpinResult> = sqlx::query_as(
        r#"
        SELECT 
            sh.id,
            sh.winner_participant_id as winner_id,
            COALESCE(u.full_name, sp.guest_name, 'Unknown') as winner_name,
            sh.spin_type,
            sh.custom_task,
            sh.created_at
        FROM spin_history sh
        JOIN session_participants sp ON sh.winner_participant_id = sp.id
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sh.session_id = $1
        ORDER BY sh.created_at DESC
        LIMIT 20
        "#,
    )
    .bind(session_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(history))
}
