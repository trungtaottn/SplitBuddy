use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::game_repo::{CreateCustomQuestion, CreateGameHistory, GameRepository};
use crate::repository::session_repo::SessionRepository;

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

pub async fn get_game_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Query(query): Query<HistoryQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::GameHistoryWithPlayer>>>, AppError> {
    require_feature_enabled(&state, "games").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let history = game_repo
        .get_session_history(session_id, query.limit.unwrap_or(50))
        .await?;

    Ok(ok(history))
}

pub async fn add_game_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(mut payload): Json<CreateGameHistory>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<crate::repository::game_repo::GameHistoryEntry>>,
    ),
    AppError,
> {
    require_feature_enabled(&state, "games").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    payload.session_id = Some(session_id);

    let game_repo = GameRepository::new(state.pool.clone());
    let entry = game_repo.add_history(payload).await?;

    Ok(created(entry))
}

#[derive(Deserialize)]
pub struct CustomQuestionQuery {
    pub game_type: Option<String>,
}

pub async fn get_custom_questions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<CustomQuestionQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::CustomQuestion>>>, AppError> {
    require_feature_enabled(&state, "games").await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let questions = game_repo
        .get_user_custom_questions(auth_user.user_id, query.game_type)
        .await?;

    Ok(ok(questions))
}

pub async fn create_custom_question(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCustomQuestion>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<crate::repository::game_repo::CustomQuestion>>,
    ),
    AppError,
> {
    require_feature_enabled(&state, "games").await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let question = game_repo
        .create_custom_question(auth_user.user_id, payload)
        .await?;

    Ok(created(question))
}

pub async fn delete_custom_question(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(question_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    require_feature_enabled(&state, "games").await?;

    let game_repo = GameRepository::new(state.pool.clone());
    game_repo
        .delete_custom_question(auth_user.user_id, question_id)
        .await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub async fn get_random_custom(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(game_type): Path<String>,
) -> Result<Json<ApiResponse<Option<crate::repository::game_repo::CustomQuestion>>>, AppError> {
    require_feature_enabled(&state, "games").await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let question = game_repo
        .get_random_custom_question(auth_user.user_id, &game_type)
        .await?;

    Ok(ok(question))
}

pub async fn get_session_stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::DrinkingStatsWithName>>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_drinking_counter").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let stats = game_repo.get_session_stats(session_id).await?;

    Ok(ok(stats))
}

#[derive(Deserialize)]
pub struct RecordDrinkRequest {
    pub participant_id: Uuid,
    pub drinks: i32,
    pub lost: Option<bool>,
}

pub async fn record_drink(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<RecordDrinkRequest>,
) -> Result<Json<ApiResponse<crate::repository::game_repo::DrinkingStats>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_drinking_counter").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let stats = game_repo
        .record_drink(
            session_id,
            payload.participant_id,
            payload.drinks,
            payload.lost.unwrap_or(false),
        )
        .await?;

    Ok(ok(stats))
}

#[derive(Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i64>,
}

pub async fn get_leaderboard(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::LeaderboardEntry>>>, AppError> {
    require_feature_enabled(&state, "games").await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let leaderboard = game_repo.get_leaderboard(query.limit.unwrap_or(10)).await?;

    Ok(ok(leaderboard))
}
