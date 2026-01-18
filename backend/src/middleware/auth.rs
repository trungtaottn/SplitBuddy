use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::AppState;
use crate::config::Config;
use crate::error::AppError;
use sha2::{Digest, Sha256};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub role: String,
}

pub fn create_token(config: &Config, user_id: Uuid, role: &str) -> Result<String, AppError> {
    let now = Utc::now();
    let exp = now + Duration::hours(config.jwt_expiration_hours);

    let claims = Claims {
        sub: user_id,
        role: role.to_string(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create token: {}", e)))
}

/// Generate a secure random refresh token
pub fn generate_refresh_token() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    use base64::{engine::general_purpose, Engine as _};
    general_purpose::STANDARD.encode(bytes)
}

/// Hash a refresh token for storage (SHA-256)
pub fn hash_refresh_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn verify_token(config: &Config, token: &str) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
        _ => AppError::InvalidToken,
    })?;

    Ok(token_data.claims)
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or(AppError::Unauthorized {
                message: "Missing authorization header".to_string(),
            })?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized {
                message: "Invalid authorization header format".to_string(),
            })?;

        let claims = verify_token(&state.config, token)?;

        // Role is now included in JWT claims - no DB query needed!
        Ok(AuthUser {
            user_id: claims.sub,
            role: claims.role,
        })
    }
}
