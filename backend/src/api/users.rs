use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};

use crate::api::response::{ok, ApiResponse};
use crate::api::users_bank_accounts::{
    add_bank_account, delete_bank_account, list_bank_accounts, update_bank_account,
};
use crate::api::users_dto::{
    ChangePasswordRequest, MessageResponse, UpdateProfileRequest, UserProfileResponse,
};
use crate::api::AppState;
use crate::cache::CachedUser;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::user_repo::UserRepository;
use crate::utils::password::{hash_password, verify_password};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_me).put(update_me))
        .route("/me/password", post(change_password))
        .route(
            "/me/bank-accounts",
            get(list_bank_accounts).post(add_bank_account),
        )
        .route(
            "/me/bank-accounts/:id",
            put(update_bank_account).delete(delete_bank_account),
        )
}

async fn get_me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<UserProfileResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    // Check cache first
    if let Some(cached) = state.cache.get_user(auth_user.user_id).await {
        return Ok(ok(UserProfileResponse {
            id: cached.id,
            email: cached.email,
            full_name: cached.full_name,
            avatar_url: cached.avatar_url,
            created_at: cached.created_at,
        }));
    }

    let user = repo
        .find_by_id(auth_user.user_id)
        .await?
        .ok_or(AppError::UserNotFound {
            user_id: auth_user.user_id,
        })?;

    // Cache the result
    state
        .cache
        .cache_user(CachedUser {
            id: user.id,
            email: user.email.clone(),
            full_name: user.full_name.clone(),
            avatar_url: user.avatar_url.clone(),
            created_at: user.created_at,
        })
        .await;

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

    // Invalidate cache
    state.cache.invalidate_user(auth_user.user_id).await;

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
            message: "Mật khẩu mới phải có ít nhất 6 ký tự".to_string(),
        });
    }

    // Hash and update
    let new_hash = hash_password(&payload.new_password)?;

    repo.update_password(auth_user.user_id, new_hash).await?;

    // Invalidate cache (security best practice)
    state.cache.invalidate_user(auth_user.user_id).await;

    Ok(ok(MessageResponse {
        message: "Đổi mật khẩu thành công".to_string(),
    }))
}
