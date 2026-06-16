use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::domain::user::User;

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

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct FeatureFlagPublic {
    pub key: String,
    pub enabled: bool,
}

#[derive(Deserialize, ToSchema)]
pub struct RefreshTokenRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub refresh_token: String,
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

#[derive(Serialize, ToSchema)]
pub struct WsTicketResponse {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub ticket: String,
    #[schema(example = 30)]
    pub expires_in_seconds: u64,
}
