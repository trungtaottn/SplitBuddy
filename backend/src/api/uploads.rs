use axum::{
    extract::{Multipart, State},
    routing::post,
    Json, Router,
};
use serde::Serialize;
use std::path::Path;
use tokio::fs;
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new().route("/avatar", post(upload_avatar))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
}

async fn upload_avatar(
    State(_state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    // Create uploads directory if it doesn't exist
    let upload_dir = Path::new("uploads/avatars");
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e))
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "file" || name == "avatar" {
            let content_type = field.content_type().unwrap_or("").to_string();
            
            // Validate file type
            if !content_type.starts_with("image/") {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: "File must be an image".to_string(),
                });
            }

            // Get file extension from content type
            let ext = match content_type.as_str() {
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/gif" => "gif",
                "image/webp" => "webp",
                _ => "jpg",
            };

            // Generate unique filename
            let filename = format!("{}_{}.{}", auth_user.user_id, Uuid::new_v4(), ext);
            let filepath = upload_dir.join(&filename);

            // Read file data
            let data = field.bytes().await.map_err(|e| {
                AppError::Internal(anyhow::anyhow!("Failed to read file data: {}", e))
            })?;

            // Limit file size (5MB)
            if data.len() > 5 * 1024 * 1024 {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: "File size must be less than 5MB".to_string(),
                });
            }

            // Save file
            fs::write(&filepath, &data).await.map_err(|e| {
                AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e))
            })?;

            // Return URL (relative to static file serving)
            let url = format!("/uploads/avatars/{}", filename);
            
            return Ok(ok(UploadResponse { url }));
        }
    }

    Err(AppError::Validation {
        field: "file".to_string(),
        message: "No file provided".to_string(),
    })
}
