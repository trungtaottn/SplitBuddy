use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::game_repo::{CreateCustomQuestion, CreateGameHistory, GameRepository};
use crate::repository::session_repo::SessionRepository;

use super::{
    response::{created, ok, ApiResponse},
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

async fn get_truth_or_dare(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let include_adult = query.include_adult.unwrap_or(false);

    let content: Option<GameContentResponse> = if let Some(ref difficulty) = query.difficulty {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'truth_or_dare' AND is_active = true AND difficulty = $1
            ORDER BY RANDOM()
            LIMIT 1
            "#,
            difficulty
        )
        .fetch_optional(&state.pool)
        .await?
    } else if include_adult {
        sqlx::query_as!(
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
        .await?
    } else {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'truth_or_dare' AND is_active = true 
              AND (difficulty IS NULL OR difficulty != '18+')
            ORDER BY RANDOM()
            LIMIT 1
            "#
        )
        .fetch_optional(&state.pool)
        .await?
    };

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::GameContentNotFound {
            game_type: "truth_or_dare".to_string(),
        }),
    }
}

async fn get_never_have_i_ever(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let include_adult = query.include_adult.unwrap_or(false);

    let content: Option<GameContentResponse> = if let Some(ref difficulty) = query.difficulty {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'never_have_i_ever' AND is_active = true AND difficulty = $1
            ORDER BY RANDOM()
            LIMIT 1
            "#,
            difficulty
        )
        .fetch_optional(&state.pool)
        .await?
    } else if include_adult {
        sqlx::query_as!(
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
        .await?
    } else {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'never_have_i_ever' AND is_active = true 
              AND (difficulty IS NULL OR difficulty != '18+')
            ORDER BY RANDOM()
            LIMIT 1
            "#
        )
        .fetch_optional(&state.pool)
        .await?
    };

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::GameContentNotFound {
            game_type: "never_have_i_ever".to_string(),
        }),
    }
}

async fn get_challenge(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    let include_adult = query.include_adult.unwrap_or(false);

    let content: Option<GameContentResponse> = if let Some(ref difficulty) = query.difficulty {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'challenge' AND is_active = true AND difficulty = $1
            ORDER BY RANDOM()
            LIMIT 1
            "#,
            difficulty
        )
        .fetch_optional(&state.pool)
        .await?
    } else if include_adult {
        sqlx::query_as!(
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
        .await?
    } else {
        sqlx::query_as!(
            GameContentResponse,
            r#"
            SELECT id, game_type, content_type, content, difficulty
            FROM game_content
            WHERE game_type = 'challenge' AND is_active = true 
              AND (difficulty IS NULL OR difficulty != '18+')
            ORDER BY RANDOM()
            LIMIT 1
            "#
        )
        .fetch_optional(&state.pool)
        .await?
    };

    match content {
        Some(c) => Ok(ok(c)),
        None => Err(AppError::GameContentNotFound {
            game_type: "challenge".to_string(),
        }),
    }
}

#[derive(Serialize)]
pub struct DiceResult {
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub is_double: bool,
    pub rule_name: String,
    pub rule_description: String,
    pub action: String,
    pub severity: String, // "safe", "mild", "spicy", "extreme"
    pub target: String,   // "self", "choose", "all", "left", "right", "none"
}

async fn roll_dice(_auth_user: AuthUser) -> Result<Json<ApiResponse<DiceResult>>, AppError> {
    let mut rng = rand::thread_rng();

    let dice1: u8 = rng.gen_range(1..=6);
    let dice2: u8 = rng.gen_range(1..=6);
    let total = dice1 + dice2;
    let is_double = dice1 == dice2;

    let (rule_name, rule_description, action, severity, target) = if is_double {
        match dice1 {
            1 => (
                "Snake Eyes",
                "Đôi 1 - Xui xẻo nhất!",
                "Uống 2 shot và làm 1 thử thách",
                "extreme",
                "self",
            ),
            2 => (
                "Đôi Nhị",
                "May mắn thoát nạn",
                "Được miễn uống lượt này",
                "safe",
                "none",
            ),
            3 => (
                "Three Man",
                "Bạn là Three Man!",
                "Mỗi khi ai đó roll ra 3, bạn phải uống",
                "spicy",
                "self",
            ),
            4 => (
                "Floor Master",
                "Chạm sàn!",
                "Tất cả chạm sàn, người cuối uống 2 shot",
                "mild",
                "all",
            ),
            5 => (
                "Thumb Master",
                "Bạn là Thumb Master!",
                "Đặt ngón tay lên bàn bất kỳ lúc nào, người cuối uống",
                "mild",
                "self",
            ),
            6 => (
                "Đôi Lục - VƯƠNG",
                "Bạn là VƯƠNG!",
                "Chọn 2 người bất kỳ uống 2 shot mỗi người",
                "extreme",
                "choose",
            ),
            _ => ("???", "Không xác định", "Không có gì", "safe", "none"),
        }
    } else {
        match total {
            2 => (
                "Snake Eyes",
                "Tổng 2 - Xui nhất!",
                "Uống 3 shot",
                "extreme",
                "self",
            ),
            3 => ("Ba Que", "Số xui!", "Uống 1 shot", "mild", "self"),
            4 => (
                "Whores",
                "Tất cả nữ!",
                "Các bạn nữ uống 1 shot",
                "mild",
                "all",
            ),
            5 => (
                "Thumb Master",
                "Đặt ngón cái!",
                "Bạn là Thumb Master đến lượt tiếp",
                "safe",
                "self",
            ),
            6 => (
                "Dicks",
                "Tất cả nam!",
                "Các bạn nam uống 1 shot",
                "mild",
                "all",
            ),
            7 => (
                "Heaven",
                "Giơ tay lên trời!",
                "Người cuối giơ tay uống 2 shot",
                "spicy",
                "all",
            ),
            8 => (
                "Mate",
                "Chọn bạn nhậu!",
                "Chọn 1 người, cả 2 cùng uống mỗi lần bạn uống",
                "mild",
                "choose",
            ),
            9 => (
                "Rhyme Time",
                "Thời gian gieo vần!",
                "Nói 1 từ, người tiếp theo phải vần, ai thua uống",
                "spicy",
                "all",
            ),
            10 => (
                "Categories",
                "Đặt chủ đề!",
                "Chọn 1 category (bia, xe,...), ai không nghĩ ra uống",
                "spicy",
                "all",
            ),
            11 => (
                "Make a Rule",
                "Đặt luật mới!",
                "Tạo 1 rule mới cho cả bàn, ai vi phạm uống",
                "spicy",
                "self",
            ),
            12 => (
                "Social!",
                "Tất cả cùng uống!",
                "Cả bàn nâng ly và uống cùng nhau!",
                "extreme",
                "all",
            ),
            _ => ("???", "Không xác định", "Roll lại", "safe", "none"),
        }
    };

    Ok(ok(DiceResult {
        dice1,
        dice2,
        total,
        is_double,
        rule_name: rule_name.to_string(),
        rule_description: rule_description.to_string(),
        action: action.to_string(),
        severity: severity.to_string(),
        target: target.to_string(),
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

// ============ GAME HISTORY ============

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

async fn get_game_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Query(query): Query<HistoryQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::GameHistoryWithPlayer>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let game_repo = GameRepository::new(state.pool.clone());
    let history = game_repo
        .get_session_history(session_id, query.limit.unwrap_or(50))
        .await?;

    Ok(ok(history))
}

async fn add_game_history(
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
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    payload.session_id = Some(session_id);

    let game_repo = GameRepository::new(state.pool.clone());
    let entry = game_repo.add_history(payload).await?;

    Ok(created(entry))
}

// ============ CUSTOM QUESTIONS ============

#[derive(Deserialize)]
pub struct CustomQuestionQuery {
    pub game_type: Option<String>,
}

async fn get_custom_questions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<CustomQuestionQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::CustomQuestion>>>, AppError> {
    let game_repo = GameRepository::new(state.pool.clone());
    let questions = game_repo
        .get_user_custom_questions(auth_user.user_id, query.game_type)
        .await?;

    Ok(ok(questions))
}

async fn create_custom_question(
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
    let game_repo = GameRepository::new(state.pool.clone());
    let question = game_repo
        .create_custom_question(auth_user.user_id, payload)
        .await?;

    Ok(created(question))
}

async fn delete_custom_question(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(question_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let game_repo = GameRepository::new(state.pool.clone());
    game_repo
        .delete_custom_question(auth_user.user_id, question_id)
        .await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

async fn get_random_custom(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(game_type): Path<String>,
) -> Result<Json<ApiResponse<Option<crate::repository::game_repo::CustomQuestion>>>, AppError> {
    let game_repo = GameRepository::new(state.pool.clone());
    let question = game_repo
        .get_random_custom_question(auth_user.user_id, &game_type)
        .await?;

    Ok(ok(question))
}

// ============ DRINKING STATS ============

async fn get_session_stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::DrinkingStatsWithName>>>, AppError> {
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

async fn record_drink(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<RecordDrinkRequest>,
) -> Result<Json<ApiResponse<crate::repository::game_repo::DrinkingStats>>, AppError> {
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

async fn get_leaderboard(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<LeaderboardQuery>,
) -> Result<Json<ApiResponse<Vec<crate::repository::game_repo::LeaderboardEntry>>>, AppError> {
    let game_repo = GameRepository::new(state.pool.clone());
    let leaderboard = game_repo.get_leaderboard(query.limit.unwrap_or(10)).await?;

    Ok(ok(leaderboard))
}
