use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
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

#[derive(Serialize, sqlx::FromRow)]
pub struct BankAccountResponse {
    pub id: Uuid,
    pub bank_name: String,
    pub account_number: String,
    pub account_holder_name: String,
    pub is_default: bool,
    pub qr_image_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize, Validate)]
pub struct AddBankAccountRequest {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Bank name must be between 1 and 100 characters"
    ))]
    pub bank_name: String,
    #[validate(length(
        min = 1,
        max = 50,
        message = "Account number must be between 1 and 50 characters"
    ))]
    pub account_number: String,
    #[validate(length(
        min = 1,
        max = 200,
        message = "Account holder name must be between 1 and 200 characters"
    ))]
    pub account_holder_name: String,
    pub is_default: Option<bool>,
    #[validate(length(max = 500, message = "QR image URL must be less than 500 characters"))]
    pub qr_image_url: Option<String>,
}

#[derive(Deserialize, Validate)]
pub struct UpdateBankAccountRequest {
    #[validate(length(max = 100, message = "Bank name must be less than 100 characters"))]
    pub bank_name: Option<String>,
    #[validate(length(max = 50, message = "Account number must be less than 50 characters"))]
    pub account_number: Option<String>,
    #[validate(length(
        max = 200,
        message = "Account holder name must be less than 200 characters"
    ))]
    pub account_holder_name: Option<String>,
    pub is_default: Option<bool>,
    #[validate(length(max = 500, message = "QR image URL must be less than 500 characters"))]
    pub qr_image_url: Option<String>,
}

use crate::api::response::created;
use validator::Validate;

async fn list_bank_accounts(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<BankAccountResponse>>>, AppError> {
    let accounts: Vec<BankAccountResponse> = sqlx::query_as(
        r#"
        SELECT id, bank_name, account_number, account_holder_name, is_default, qr_image_url, created_at
        FROM user_bank_accounts
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(accounts))
}

async fn add_bank_account(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<AddBankAccountRequest>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<BankAccountResponse>>,
    ),
    AppError,
> {
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    let is_default = payload.is_default.unwrap_or(false);

    // If setting as default, unset other defaults
    if is_default {
        sqlx::query(
            r#"
            UPDATE user_bank_accounts
            SET is_default = false
            WHERE user_id = $1
            "#,
        )
        .bind(auth_user.user_id)
        .execute(&state.pool)
        .await?;
    }

    let account_id = Uuid::new_v4();
    let account: BankAccountResponse = sqlx::query_as(
        r#"
        INSERT INTO user_bank_accounts (id, user_id, bank_name, account_number, account_holder_name, is_default, qr_image_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, bank_name, account_number, account_holder_name, is_default, qr_image_url, created_at
        "#,
    )
    .bind(account_id)
    .bind(auth_user.user_id)
    .bind(&payload.bank_name)
    .bind(&payload.account_number)
    .bind(&payload.account_holder_name)
    .bind(is_default)
    .bind(&payload.qr_image_url)
    .fetch_one(&state.pool)
    .await?;

    Ok(created(account))
}

async fn update_bank_account(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(account_id): Path<Uuid>,
    Json(payload): Json<UpdateBankAccountRequest>,
) -> Result<Json<ApiResponse<BankAccountResponse>>, AppError> {
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    // Verify ownership
    let exists: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(SELECT 1 FROM user_bank_accounts WHERE id = $1 AND user_id = $2)"#,
    )
    .bind(account_id)
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    if !exists {
        return Err(AppError::Forbidden {
            message: "Bank account not found or access denied".to_string(),
        });
    }

    // If setting as default, unset other defaults
    if payload.is_default == Some(true) {
        sqlx::query(
            r#"
            UPDATE user_bank_accounts
            SET is_default = false
            WHERE user_id = $1 AND id != $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(account_id)
        .execute(&state.pool)
        .await?;
    }

    let account: BankAccountResponse = sqlx::query_as(
        r#"
        UPDATE user_bank_accounts
        SET 
            bank_name = COALESCE($1, bank_name),
            account_number = COALESCE($2, account_number),
            account_holder_name = COALESCE($3, account_holder_name),
            is_default = COALESCE($4, is_default),
            qr_image_url = COALESCE($5, qr_image_url),
            updated_at = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING id, bank_name, account_number, account_holder_name, is_default, qr_image_url, created_at
        "#,
    )
    .bind(payload.bank_name)
    .bind(payload.account_number)
    .bind(payload.account_holder_name)
    .bind(payload.is_default)
    .bind(payload.qr_image_url)
    .bind(account_id)
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(account))
}

async fn delete_bank_account(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(account_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    // Verify ownership
    let deleted = sqlx::query(r#"DELETE FROM user_bank_accounts WHERE id = $1 AND user_id = $2"#)
        .bind(account_id)
        .bind(auth_user.user_id)
        .execute(&state.pool)
        .await?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::Forbidden {
            message: "Bank account not found or access denied".to_string(),
        });
    }

    Ok(axum::http::StatusCode::NO_CONTENT)
}
