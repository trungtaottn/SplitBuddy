use axum::{
    extract::{Query, State},
    Json,
};

use crate::api::feature_flags::require_feature_enabled;
use crate::api::games_dto::{GameContentResponse, GameQuery};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn get_truth_or_dare(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_truth_dare").await?;

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
            "\n            SELECT id, game_type, content_type, content, difficulty\n            FROM game_content\n            WHERE game_type = 'truth_or_dare' AND is_active = true \n              AND (difficulty IS NULL OR difficulty != '18+')\n            ORDER BY RANDOM()\n            LIMIT 1\n            "
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

pub async fn get_never_have_i_ever(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_never_have_i").await?;

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
            "\n            SELECT id, game_type, content_type, content, difficulty\n            FROM game_content\n            WHERE game_type = 'never_have_i_ever' AND is_active = true \n              AND (difficulty IS NULL OR difficulty != '18+')\n            ORDER BY RANDOM()\n            LIMIT 1\n            "
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

pub async fn get_challenge(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<GameQuery>,
) -> Result<Json<ApiResponse<GameContentResponse>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_challenges").await?;

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
            "\n            SELECT id, game_type, content_type, content, difficulty\n            FROM game_content\n            WHERE game_type = 'challenge' AND is_active = true \n              AND (difficulty IS NULL OR difficulty != '18+')\n            ORDER BY RANDOM()\n            LIMIT 1\n            "
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
