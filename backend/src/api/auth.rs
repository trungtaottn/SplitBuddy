use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::api::auth_dto::{AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest};
use crate::api::auth_features::get_features;
use crate::api::auth_password_reset::{forgot_password, reset_password};
use crate::api::auth_tokens::{issue_auth_response, store_refresh_token};
use crate::api::auth_ws_ticket::get_ws_ticket;
use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::{create_token, generate_refresh_token, hash_refresh_token};
use crate::repository::user_repo::UserRepository;
use crate::utils::password::{hash_password_async, verify_password_async};
use chrono::Utc;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh_token))
        .route("/forgot-password", post(forgot_password))
        .route("/reset-password", post(reset_password))
        .route("/features", get(get_features))
        .route("/ws-ticket", post(get_ws_ticket))
}

#[utoipa::path(
    post,
    path = "/api/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "User registered successfully", body = AuthResponse),
        (status = 400, description = "Validation error"),
        (status = 409, description = "Email already exists")
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<AuthResponse>>), AppError> {
    let repo = UserRepository::new(state.pool.clone());

    if repo.find_by_email(&payload.email).await?.is_some() {
        return Err(AppError::EmailAlreadyExists {
            email: payload.email,
        });
    }

    let password_hash = hash_password_async(payload.password.clone()).await?;

    let user = repo
        .create(&payload.email, &password_hash, &payload.full_name)
        .await?;

    // Audit log: new user registration
    let _ = AuditLogBuilder::new(AuditAction::Register, AuditEntityType::User)
        .user(user.id, Some(user.email.clone()))
        .entity_id(user.id)
        .description(format!("New user registered: {}", user.email))
        .save(&state.pool)
        .await;

    Ok(created(
        issue_auth_response(&state.pool, &state.config, user).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/api/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid credentials")
    )
)]
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<ApiResponse<AuthResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    let user = repo
        .find_by_email(&payload.email)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    if !verify_password_async(payload.password.clone(), user.password_hash.clone()).await? {
        return Err(AppError::InvalidCredentials);
    }

    // Audit log: successful login
    let _ = AuditLogBuilder::new(AuditAction::Login, AuditEntityType::User)
        .user(user.id, Some(user.email.clone()))
        .entity_id(user.id)
        .save(&state.pool)
        .await;

    Ok(ok(
        issue_auth_response(&state.pool, &state.config, user).await?
    ))
}

#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "auth",
    request_body = RefreshTokenRequest,
    responses(
        (status = 200, description = "Token refreshed successfully", body = AuthResponse),
        (status = 401, description = "Invalid or expired refresh token")
    )
)]
/// Refresh access token using refresh token
/// This allows users to get a new access token without re-authenticating
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<Json<ApiResponse<AuthResponse>>, AppError> {
    let refresh_token_hash = hash_refresh_token(&payload.refresh_token);

    // Find refresh token in database
    #[derive(sqlx::FromRow)]
    struct RefreshTokenRow {
        user_id: Uuid,
        expires_at: chrono::DateTime<chrono::Utc>,
        revoked_at: Option<chrono::DateTime<chrono::Utc>>,
    }

    let token_row: Option<RefreshTokenRow> = sqlx::query_as(
        r#"
        SELECT user_id, expires_at, revoked_at
        FROM refresh_tokens
        WHERE token_hash = $1
        "#,
    )
    .bind(&refresh_token_hash)
    .fetch_optional(&state.pool)
    .await?;

    let token_row = token_row.ok_or(AppError::InvalidToken)?;

    // Check if token is revoked
    if token_row.revoked_at.is_some() {
        return Err(AppError::InvalidToken);
    }

    // Check if token is expired
    if token_row.expires_at < Utc::now() {
        return Err(AppError::TokenExpired);
    }

    // Get user info
    let repo = UserRepository::new(state.pool.clone());
    let user = repo
        .find_by_id(token_row.user_id)
        .await?
        .ok_or(AppError::UserNotFound {
            user_id: token_row.user_id,
        })?;

    // Revoke old refresh token (token rotation for security)
    sqlx::query(
        r#"
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE token_hash = $1
        "#,
    )
    .bind(&refresh_token_hash)
    .execute(&state.pool)
    .await?;

    // Generate new tokens
    let access_token = create_token(&state.config, user.id, &user.role)?;
    let new_refresh_token = generate_refresh_token();
    store_refresh_token(&state.pool, user.id, &new_refresh_token).await?;

    Ok(ok(AuthResponse {
        user: user.into(),
        access_token,
        refresh_token: new_refresh_token,
    }))
}
