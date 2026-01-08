//! Input validation utilities
//!
//! Provides ValidatedJson extractor that automatically validates request bodies
//! using the validator crate.

use axum::{
    async_trait,
    extract::{FromRequest, Request, rejection::JsonRejection},
    Json,
};
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::AppError;

/// A JSON extractor that automatically validates the request body
/// using the validator crate.
///
/// Usage:
/// ```rust
/// #[derive(Deserialize, Validate)]
/// struct CreateSessionRequest {
///     #[validate(length(min = 1, max = 100))]
///     name: String,
/// }
///
/// async fn create_session(
///     ValidatedJson(payload): ValidatedJson<CreateSessionRequest>,
/// ) -> Result<...> {
///     // payload is already validated
/// }
/// ```
pub struct ValidatedJson<T>(pub T);

#[async_trait]
impl<S, T> FromRequest<S> for ValidatedJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned + Validate,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let result: Result<Json<T>, JsonRejection> = Json::from_request(req, state).await;
        
        let Json(value) = result.map_err(|e| AppError::Validation {
            field: "body".to_string(),
            message: format!("Invalid JSON: {}", e),
        })?;

        value.validate().map_err(|e| {
            // Extract first validation error for a cleaner message
            let field_errors = e.field_errors();
            if let Some((field, errors)) = field_errors.into_iter().next() {
                let message = errors
                    .first()
                    .and_then(|err| err.message.as_ref())
                    .map(|m| m.to_string())
                    .unwrap_or_else(|| "Validation failed".to_string());
                
                AppError::Validation {
                    field: field.to_string(),
                    message,
                }
            } else {
                AppError::Validation {
                    field: "unknown".to_string(),
                    message: "Validation failed".to_string(),
                }
            }
        })?;

        Ok(ValidatedJson(value))
    }
}
