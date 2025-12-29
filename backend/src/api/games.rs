use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::{response::{ok, ApiResponse}, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/truth-or-dare", get(get_truth_or_dare))
        .route("/never-have-i-ever", get(get_never_have_i_ever))
        .route("/challenges", get(get_challenge))
        .route("/dice", get(roll_dice))
}

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
}

async fn get_truth_or_dare(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let content: Option<GameContentResponse> = sqlx::query_as!(
        GameContentResponse,
        r#"
        SELECT id, game_type, content_type, content, difficulty
        FROM game_content
        WHERE game_type = 'truth_or_dare' AND is_active = true
        ORDER BY RANDOM()
        LIMIT 1
        "#
    )
    .fetch_optional(&state.pool)
    .await?;

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::Validation {
            field: "game_content".to_string(),
            message: "No game content found".to_string(),
        }),
    }
}

async fn get_never_have_i_ever(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let content: Option<GameContentResponse> = sqlx::query_as!(
        GameContentResponse,
        r#"
        SELECT id, game_type, content_type, content, difficulty
        FROM game_content
        WHERE game_type = 'never_have_i_ever' AND is_active = true
        ORDER BY RANDOM()
        LIMIT 1
        "#
    )
    .fetch_optional(&state.pool)
    .await?;

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::Validation {
            field: "game_content".to_string(),
            message: "No game content found".to_string(),
        }),
    }
}

async fn get_challenge(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let content: Option<GameContentResponse> = sqlx::query_as!(
        GameContentResponse,
        r#"
        SELECT id, game_type, content_type, content, difficulty
        FROM game_content
        WHERE game_type = 'challenge' AND is_active = true
        ORDER BY RANDOM()
        LIMIT 1
        "#
    )
    .fetch_optional(&state.pool)
    .await?;

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::Validation {
            field: "game_content".to_string(),
            message: "No game content found".to_string(),
        }),
    }
}

#[derive(Serialize)]
pub struct DiceResult {
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub is_double: bool,
    pub message: String,
}

async fn roll_dice(
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<DiceResult>>, AppError> {
    let mut rng = rand::thread_rng();
    
    let dice1: u8 = rng.gen_range(1..=6);
    let dice2: u8 = rng.gen_range(1..=6);
    let total = dice1 + dice2;
    let is_double = dice1 == dice2;
    
    let message = if is_double {
        format!("🎲 ĐÔI {}! Chọn người uống!", dice1)
    } else if total == 7 {
        "🍻 Ra 7! Cả bàn cùng uống!".to_string()
    } else if total >= 10 {
        format!("🔥 Tổng {}! Người quay phải uống {} shot!", total, total - 8)
    } else {
        format!("🎲 Tổng: {}", total)
    };

    Ok(ok(DiceResult {
        dice1,
        dice2,
        total,
        is_double,
        message,
    }))
}

// Spin wheel endpoints - added to sessions
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

pub async fn spin_wheel(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<SpinRequest>,
) -> Result<Json<ApiResponse<SpinResult>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    
    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id).await?;
    
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
        "#
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
    let created_at: (chrono::DateTime<chrono::Utc>,) = sqlx::query_as(
        "SELECT created_at FROM spin_history WHERE id = $1"
    )
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
    let repo = SessionRepository::new(state.pool.clone());
    
    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id).await?;

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
        "#
    )
    .bind(session_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(history))
}
