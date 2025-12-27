use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::user_repo::UserRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_me).put(update_me))
}

#[derive(Serialize)]
pub struct UserProfileResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

async fn get_me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<UserProfileResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    let user = repo
        .find_by_id(auth_user.user_id)
        .await?
        .ok_or(AppError::UserNotFound {
            user_id: auth_user.user_id,
        })?;

    Ok(ok(UserProfileResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
    }))
}

async fn update_me(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<ApiResponse<UserProfileResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    let user = repo
        .update(auth_user.user_id, payload.full_name, payload.avatar_url)
        .await?
        .ok_or(AppError::UserNotFound {
            user_id: auth_user.user_id,
        })?;

    Ok(ok(UserProfileResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
    }))
}
