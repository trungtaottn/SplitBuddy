use axum::{extract::State, Json};
use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::api::auth_dto::{
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse,
};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::{generate_refresh_token, hash_refresh_token};
use crate::repository::user_repo::UserRepository;
use crate::utils::password::hash_password_async;

#[utoipa::path(
    post,
    path = "/api/auth/forgot-password",
    tag = "auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Password reset email sent (if account exists)", body = ForgotPasswordResponse),
        (status = 400, description = "Validation error")
    )
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<Json<ApiResponse<ForgotPasswordResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    if let Some(user) = repo.find_by_email(&payload.email).await? {
        let reset_token = generate_refresh_token();
        let token_hash = hash_refresh_token(&reset_token);
        let expires_at = Utc::now() + Duration::hours(1);

        sqlx::query(
            r#"
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user.id)
        .bind(&token_hash)
        .bind(expires_at)
        .execute(&state.pool)
        .await?;

        tracing::info!(
            "Password reset requested for user {} - Token: {} (expires in 1 hour)",
            user.email,
            reset_token
        );
    }

    Ok(ok(ForgotPasswordResponse {
        message: "If an account with that email exists, a password reset link has been sent."
            .to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/auth/reset-password",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset successful", body = ResetPasswordResponse),
        (status = 400, description = "Validation error or invalid/expired token")
    )
)]
pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ApiResponse<ResetPasswordResponse>>, AppError> {
    let token_hash = hash_refresh_token(&payload.token);

    #[derive(sqlx::FromRow)]
    struct ResetTokenRow {
        user_id: Uuid,
        expires_at: chrono::DateTime<chrono::Utc>,
        used_at: Option<chrono::DateTime<chrono::Utc>>,
    }

    let token_row: Option<ResetTokenRow> = sqlx::query_as(
        r#"
        SELECT user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        "#,
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await?;

    let token_row = token_row.ok_or(AppError::InvalidToken)?;

    if token_row.used_at.is_some() {
        return Err(AppError::InvalidToken);
    }

    if token_row.expires_at < Utc::now() {
        return Err(AppError::TokenExpired);
    }

    let password_hash = hash_password_async(payload.new_password).await?;

    let repo = UserRepository::new(state.pool.clone());
    repo.update_password(token_row.user_id, password_hash)
        .await?;

    sqlx::query(
        r#"
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE token_hash = $1
        "#,
    )
    .bind(&token_hash)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        r#"
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
        "#,
    )
    .bind(token_row.user_id)
    .execute(&state.pool)
    .await?;

    let _ = AuditLogBuilder::new(AuditAction::PasswordReset, AuditEntityType::User)
        .user(token_row.user_id, None)
        .entity_id(token_row.user_id)
        .description("Password reset via reset token")
        .save(&state.pool)
        .await;

    Ok(ok(ResetPasswordResponse {
        message: "Password reset successful. Please login with your new password.".to_string(),
    }))
}
