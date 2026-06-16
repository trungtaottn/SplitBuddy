use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::users_dto::{AddBankAccountRequest, BankAccountResponse, UpdateBankAccountRequest};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn list_bank_accounts(
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

pub async fn add_bank_account(
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

pub async fn update_bank_account(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(account_id): Path<Uuid>,
    Json(payload): Json<UpdateBankAccountRequest>,
) -> Result<Json<ApiResponse<BankAccountResponse>>, AppError> {
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

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
        "\n        UPDATE user_bank_accounts\n        SET \n            bank_name = COALESCE($1, bank_name),\n            account_number = COALESCE($2, account_number),\n            account_holder_name = COALESCE($3, account_holder_name),\n            is_default = COALESCE($4, is_default),\n            qr_image_url = COALESCE($5, qr_image_url),\n            updated_at = NOW()\n        WHERE id = $6 AND user_id = $7\n        RETURNING id, bank_name, account_number, account_holder_name, is_default, qr_image_url, created_at\n        ",
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

pub async fn delete_bank_account(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(account_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
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
