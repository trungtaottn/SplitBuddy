use axum::{
    extract::{Path, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
        .route("/users", post(create_user))
        .route("/users/:id/password", put(reset_password))
        .route("/features", get(list_features))
        .route("/features/:key", put(toggle_feature))
}

#[derive(Serialize, sqlx::FromRow)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub full_name: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub new_password: String,
}

fn require_admin(auth_user: &AuthUser) -> Result<(), AppError> {
    if auth_user.role != "admin" {
        return Err(AppError::Forbidden {
            message: "Admin access required".to_string(),
        });
    }
    Ok(())
}

async fn list_users(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<UserResponse>>>, AppError> {
    require_admin(&auth_user)?;

    let users: Vec<UserResponse> = sqlx::query_as(
        r#"
        SELECT id, email, full_name, role, avatar_url, created_at
        FROM users
        WHERE role != 'admin'
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(users))
}

async fn create_user(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, AppError> {
    require_admin(&auth_user)?;

    // Check if email exists
    let exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_optional(&state.pool)
    .await?;

    if exists.is_some() {
        return Err(AppError::EmailAlreadyExists {
            email: payload.email,
        });
    }

    // Hash password
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to hash password: {}", e)))?
        .to_string();

    let id = Uuid::new_v4();
    let user: UserResponse = sqlx::query_as(
        r#"
        INSERT INTO users (id, email, full_name, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'user', NOW(), NOW())
        RETURNING id, email, full_name, role, avatar_url, created_at
        "#
    )
    .bind(id)
    .bind(&payload.email)
    .bind(&payload.full_name)
    .bind(&password_hash)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(user))
}

async fn reset_password(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_admin(&auth_user)?;

    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(payload.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to hash password: {}", e)))?
        .to_string();

    sqlx::query!(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        password_hash,
        user_id
    )
    .execute(&state.pool)
    .await?;

    Ok(ok(()))
}

// Feature Flags

#[derive(Serialize, sqlx::FromRow)]
pub struct FeatureFlag {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct ToggleFeatureRequest {
    pub enabled: bool,
}

async fn list_features(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<FeatureFlag>>>, AppError> {
    require_admin(&auth_user)?;

    let features: Vec<FeatureFlag> = sqlx::query_as(
        r#"
        SELECT id, key, name, description, enabled, created_at, updated_at
        FROM feature_flags
        ORDER BY key ASC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(features))
}

async fn toggle_feature(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(key): Path<String>,
    Json(payload): Json<ToggleFeatureRequest>,
) -> Result<Json<ApiResponse<FeatureFlag>>, AppError> {
    require_admin(&auth_user)?;

    let feature: FeatureFlag = sqlx::query_as(
        r#"
        UPDATE feature_flags 
        SET enabled = $1, updated_at = NOW()
        WHERE key = $2
        RETURNING id, key, name, description, enabled, created_at, updated_at
        "#
    )
    .bind(payload.enabled)
    .bind(&key)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(feature))
}
