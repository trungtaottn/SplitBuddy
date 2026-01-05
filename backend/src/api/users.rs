use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::user_repo::UserRepository;
use crate::utils::password::{hash_password, verify_password};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_me).put(update_me))
        .route("/me/password", post(change_password))
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

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Serialize)]
pub struct MessageResponse {
    pub message: String,
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

async fn change_password(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<ChangePasswordRequest>,
) -> Result<Json<ApiResponse<MessageResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    let user = repo
        .find_by_id(auth_user.user_id)
        .await?
        .ok_or(AppError::UserNotFound {
            user_id: auth_user.user_id,
        })?;

    // Verify current password
    if !verify_password(&payload.current_password, &user.password_hash)? {
        return Err(AppError::InvalidCredentials);
    }

    // Validate new password
    if payload.new_password.len() < 6 {
        return Err(AppError::Validation { 
            field: "new_password".to_string(), 
            message: "Mật khẩu mới phải có ít nhất 6 ký tự".to_string() 
        });
    }

    // Hash and update
    let new_hash = hash_password(&payload.new_password)?;

    repo.update_password(auth_user.user_id, new_hash).await?;

    Ok(ok(MessageResponse {
        message: "Đổi mật khẩu thành công".to_string(),
    }))
}
