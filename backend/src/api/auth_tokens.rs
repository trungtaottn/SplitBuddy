use chrono::{Duration, Utc};
use sqlx::PgPool;

use crate::api::auth_dto::AuthResponse;
use crate::config::Config;
use crate::domain::user::User;
use crate::error::AppError;
use crate::middleware::auth::{create_token, generate_refresh_token, hash_refresh_token};

const REFRESH_TOKEN_TTL_DAYS: i64 = 7;

pub async fn issue_auth_response(
    pool: &PgPool,
    config: &Config,
    user: User,
) -> Result<AuthResponse, AppError> {
    let access_token = create_token(config, user.id, &user.role)?;
    let refresh_token = generate_refresh_token();
    store_refresh_token(pool, user.id, &refresh_token).await?;

    Ok(AuthResponse {
        user: user.into(),
        access_token,
        refresh_token,
    })
}

pub async fn store_refresh_token(
    pool: &PgPool,
    user_id: uuid::Uuid,
    refresh_token: &str,
) -> Result<(), AppError> {
    let refresh_token_hash = hash_refresh_token(refresh_token);
    let expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_TTL_DAYS);

    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user_id)
    .bind(&refresh_token_hash)
    .bind(expires_at)
    .execute(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store refresh token: {:?}", e);
        AppError::Database(e)
    })?;

    Ok(())
}
