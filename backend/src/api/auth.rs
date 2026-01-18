use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::domain::user::User;
use crate::error::AppError;
use crate::middleware::auth::{create_token, generate_refresh_token, hash_refresh_token};
use crate::repository::user_repo::UserRepository;
use crate::utils::password::{hash_password_async, verify_password_async};
use chrono::{Duration, Utc};

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

#[derive(Deserialize, Validate, ToSchema)]
pub struct RegisterRequest {
    #[schema(example = "user@example.com")]
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[schema(example = "password123", min_length = 6)]
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: String,
    #[schema(example = "Nguyen Van A")]
    #[validate(length(min = 1, message = "Full name is required"))]
    pub full_name: String,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    #[schema(example = "user@example.com")]
    pub email: String,
    #[schema(example = "password123")]
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct AuthResponse {
    pub user: UserResponse,
    #[schema(example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")]
    pub access_token: String,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub refresh_token: String,
}

#[derive(Serialize, ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    #[schema(example = "user@example.com")]
    pub email: String,
    #[schema(example = "Nguyen Van A")]
    pub full_name: String,
    pub avatar_url: Option<String>,
    #[schema(example = "user")]
    pub role: String,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            role: user.role,
        }
    }
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

    let access_token = create_token(&state.config, user.id, &user.role)?;
    let refresh_token = generate_refresh_token();
    let refresh_token_hash = hash_refresh_token(&refresh_token);

    // Store refresh token in database (expires in 7 days)
    let expires_at = Utc::now() + Duration::days(7);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&refresh_token_hash)
    .bind(expires_at)
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store refresh token: {:?}", e);
        AppError::Database(e)
    })?;

    Ok(created(AuthResponse {
        user: user.into(),
        access_token,
        refresh_token,
    }))
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

    let access_token = create_token(&state.config, user.id, &user.role)?;
    let refresh_token = generate_refresh_token();
    let refresh_token_hash = hash_refresh_token(&refresh_token);

    // Store refresh token in database (expires in 7 days)
    let expires_at = Utc::now() + Duration::days(7);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&refresh_token_hash)
    .bind(expires_at)
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store refresh token: {:?}", e);
        AppError::Database(e)
    })?;

    Ok(ok(AuthResponse {
        user: user.into(),
        access_token,
        refresh_token,
    }))
}

// Feature flags - public endpoint (no auth required) - with caching
#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct FeatureFlagPublic {
    pub key: String,
    pub enabled: bool,
}

async fn get_features(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<FeatureFlagPublic>>>, AppError> {
    use crate::cache::CachedFeatureFlag;

    tracing::info!("get_features handler called");

    // Try to get from cache first
    const CACHE_KEY: &str = "all_public_features";

    if let Some(cached) = state.cache.all_features.get(CACHE_KEY).await {
        tracing::info!("Cache hit for features");
        // Convert cached features to public format
        let features: Vec<FeatureFlagPublic> = cached
            .iter()
            .map(|f| FeatureFlagPublic {
                key: f.key.clone(),
                enabled: f.enabled,
            })
            .collect();
        return Ok(ok(features));
    }

    tracing::info!("Cache miss, fetching from database");

    // Cache miss - fetch from database
    let features: Vec<FeatureFlagPublic> =
        sqlx::query_as(r#"SELECT key, enabled FROM feature_flags ORDER BY key ASC"#)
            .fetch_all(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Database error fetching features: {:?}", e);
                AppError::Database(e)
            })?;

    tracing::info!("Fetched {} features from database", features.len());

    // Store in cache for future requests
    let cached_features: Vec<CachedFeatureFlag> = features
        .iter()
        .map(|f| CachedFeatureFlag {
            id: uuid::Uuid::nil(), // We don't have ID in public view
            key: f.key.clone(),
            name: f.key.clone(),
            description: None,
            enabled: f.enabled,
            module: None,
        })
        .collect();

    state
        .cache
        .all_features
        .insert(CACHE_KEY.to_string(), cached_features)
        .await;

    Ok(ok(features))
}

#[derive(Deserialize, ToSchema)]
pub struct RefreshTokenRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub refresh_token: String,
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
    let new_refresh_token_hash = hash_refresh_token(&new_refresh_token);

    // Store new refresh token
    let expires_at = Utc::now() + Duration::days(7);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&new_refresh_token_hash)
    .bind(expires_at)
    .execute(&state.pool)
    .await?;

    Ok(ok(AuthResponse {
        user: user.into(),
        access_token,
        refresh_token: new_refresh_token,
    }))
}

#[derive(Deserialize, Validate, ToSchema)]
pub struct ForgotPasswordRequest {
    #[schema(example = "user@example.com")]
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
}

#[derive(Serialize, ToSchema)]
pub struct ForgotPasswordResponse {
    #[schema(example = "Password reset email sent if account exists")]
    pub message: String,
}

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
/// Request password reset - sends email with reset link
/// Note: Always returns success to prevent email enumeration attacks
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<Json<ApiResponse<ForgotPasswordResponse>>, AppError> {
    let repo = UserRepository::new(state.pool.clone());

    // Find user by email
    if let Some(user) = repo.find_by_email(&payload.email).await? {
        // Generate reset token
        let reset_token = generate_refresh_token();
        let token_hash = hash_refresh_token(&reset_token);

        // Token expires in 1 hour
        let expires_at = Utc::now() + Duration::hours(1);

        // Store reset token in database
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

        // TODO: Send email with reset link
        // For now, log the token (in production, send via email service)
        tracing::info!(
            "Password reset requested for user {} - Token: {} (expires in 1 hour)",
            user.email,
            reset_token
        );

        // In production, integrate with email service (SendGrid, Mailgun, etc.)
        // Example:
        // email_service.send_password_reset(
        //     &user.email,
        //     &format!("https://yourapp.com/reset-password?token={}", reset_token)
        // ).await?;
    }

    // Always return success to prevent email enumeration
    Ok(ok(ForgotPasswordResponse {
        message: "If an account with that email exists, a password reset link has been sent."
            .to_string(),
    }))
}

#[derive(Deserialize, Validate, ToSchema)]
pub struct ResetPasswordRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub token: String,
    #[schema(example = "newpassword123", min_length = 6)]
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub new_password: String,
}

#[derive(Serialize, ToSchema)]
pub struct ResetPasswordResponse {
    #[schema(example = "Password reset successful")]
    pub message: String,
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
/// Reset password using reset token
pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ApiResponse<ResetPasswordResponse>>, AppError> {
    let token_hash = hash_refresh_token(&payload.token);

    // Find reset token in database
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

    // Check if token is already used
    if token_row.used_at.is_some() {
        return Err(AppError::InvalidToken);
    }

    // Check if token is expired
    if token_row.expires_at < Utc::now() {
        return Err(AppError::TokenExpired);
    }

    // Hash new password
    let password_hash = hash_password_async(payload.new_password).await?;

    // Update user password
    let repo = UserRepository::new(state.pool.clone());
    repo.update_password(token_row.user_id, password_hash)
        .await?;

    // Mark token as used
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

    // Revoke all refresh tokens for this user (security best practice)
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

    // Audit log: password reset
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

/// WebSocket ticket request (authenticated endpoint)
#[derive(Serialize, ToSchema)]
pub struct WsTicketResponse {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub ticket: String,
    #[schema(example = 30)]
    pub expires_in_seconds: u64,
}

#[utoipa::path(
    post,
    path = "/api/auth/ws-ticket",
    tag = "auth",
    responses(
        (status = 200, description = "WebSocket ticket generated", body = WsTicketResponse),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearerAuth" = [])
    )
)]
/// Generate a short-lived ticket for WebSocket authentication
/// This avoids exposing JWT tokens in URL query parameters
pub async fn get_ws_ticket(
    State(state): State<AppState>,
    auth_user: crate::middleware::auth::AuthUser,
) -> Result<Json<ApiResponse<WsTicketResponse>>, AppError> {
    use crate::cache::WsTicket;
    use chrono::Utc;

    // Generate a unique ticket ID
    let ticket_id = Uuid::new_v4();

    // Create ticket with 30 second expiration
    let ticket = WsTicket {
        user_id: auth_user.user_id,
        role: auth_user.role,
        expires_at: Utc::now() + chrono::Duration::seconds(30),
    };

    // Store ticket in cache (auto-expires after 30 seconds)
    state.cache.store_ws_ticket(ticket_id, ticket).await;

    Ok(ok(WsTicketResponse {
        ticket: ticket_id.to_string(),
        expires_in_seconds: 30,
    }))
}
