use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use rust_decimal::Decimal;
use serde::Serialize;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("User not found: {user_id}")]
    UserNotFound { user_id: Uuid },

    #[error("Session not found: {session_id}")]
    SessionNotFound { session_id: Uuid },

    #[error("Bill not found: {bill_id}")]
    BillNotFound { bill_id: Uuid },

    #[error("Game content not found for type: {game_type}")]
    GameContentNotFound { game_type: String },

    #[error("Invalid bill amount: {amount}. Must be greater than 0")]
    InvalidBillAmount { amount: Decimal },

    #[error("Unauthorized: {message}")]
    Unauthorized { message: String },

    #[error("Forbidden: {message}")]
    Forbidden { message: String },

    #[error("Validation error: {field} - {message}")]
    Validation { field: String, message: String },

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Email already exists: {email}")]
    EmailAlreadyExists { email: String },

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Feature disabled: {feature}")]
    FeatureDisabled { feature: String },

    #[error("Internal server error")]
    Internal(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
    meta: ResponseMeta,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct ResponseMeta {
    timestamp: chrono::DateTime<chrono::Utc>,
}

impl AppError {
    fn error_code(&self) -> &'static str {
        match self {
            AppError::Database(_) => "E_DATABASE",
            AppError::UserNotFound { .. } => "E_USER_NOT_FOUND",
            AppError::SessionNotFound { .. } => "E_SESSION_NOT_FOUND",
            AppError::BillNotFound { .. } => "E_BILL_NOT_FOUND",
            AppError::GameContentNotFound { .. } => "E_GAME_CONTENT_NOT_FOUND",
            AppError::InvalidBillAmount { .. } => "E_BILL_INVALID_AMOUNT",
            AppError::Unauthorized { .. } => "E_AUTH_UNAUTHORIZED",
            AppError::Forbidden { .. } => "E_AUTH_FORBIDDEN",
            AppError::Validation { .. } => "E_VALIDATION",
            AppError::InvalidCredentials => "E_AUTH_INVALID_CREDENTIALS",
            AppError::EmailAlreadyExists { .. } => "E_USER_EMAIL_EXISTS",
            AppError::InvalidToken => "E_AUTH_INVALID_TOKEN",
            AppError::TokenExpired => "E_AUTH_TOKEN_EXPIRED",
            AppError::FeatureDisabled { .. } => "E_FEATURE_DISABLED",
            AppError::Internal(_) => "E_INTERNAL",
        }
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::UserNotFound { .. } => StatusCode::NOT_FOUND,
            AppError::SessionNotFound { .. } => StatusCode::NOT_FOUND,
            AppError::BillNotFound { .. } => StatusCode::NOT_FOUND,
            AppError::GameContentNotFound { .. } => StatusCode::NOT_FOUND,
            AppError::InvalidBillAmount { .. } => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Unauthorized { .. } => StatusCode::UNAUTHORIZED,
            AppError::Forbidden { .. } => StatusCode::FORBIDDEN,
            AppError::Validation { .. } => StatusCode::BAD_REQUEST,
            AppError::InvalidCredentials => StatusCode::UNAUTHORIZED,
            AppError::EmailAlreadyExists { .. } => StatusCode::CONFLICT,
            AppError::InvalidToken => StatusCode::UNAUTHORIZED,
            AppError::TokenExpired => StatusCode::UNAUTHORIZED,
            AppError::FeatureDisabled { .. } => StatusCode::SERVICE_UNAVAILABLE,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Log errors for debugging
        match &self {
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
            }
            _ => {
                tracing::warn!("Application error: {}", self);
            }
        }
        
        let status = self.status_code();
        let error_response = ErrorResponse {
            error: ErrorDetail {
                code: self.error_code().to_string(),
                message: self.to_string(),
                details: None,
            },
            meta: ResponseMeta {
                timestamp: chrono::Utc::now(),
            },
        };

        (status, Json(error_response)).into_response()
    }
}
