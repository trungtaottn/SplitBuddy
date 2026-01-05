use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::domain::user::User;
use crate::error::AppError;
use crate::middleware::auth::create_token;
use crate::repository::user_repo::UserRepository;
use crate::utils::password::{hash_password, verify_password};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/features", get(get_features))
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

    let password_hash = hash_password(&payload.password)?;

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

    let token = create_token(&state.config, user.id, &user.role)?;

    Ok(created(AuthResponse {
        user: user.into(),
        access_token: token,
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

    if !verify_password(&payload.password, &user.password_hash)? {
        return Err(AppError::InvalidCredentials);
    }

    // Audit log: successful login
    let _ = AuditLogBuilder::new(AuditAction::Login, AuditEntityType::User)
        .user(user.id, Some(user.email.clone()))
        .entity_id(user.id)
        .save(&state.pool)
        .await;

    let token = create_token(&state.config, user.id, &user.role)?;

    Ok(ok(AuthResponse {
        user: user.into(),
        access_token: token,
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
    let features: Vec<FeatureFlagPublic> = sqlx::query_as(
        r#"SELECT key, enabled FROM feature_flags ORDER BY key ASC"#
    )
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
        })
        .collect();
    
    state.cache.all_features.insert(CACHE_KEY.to_string(), cached_features).await;

    Ok(ok(features))
}
