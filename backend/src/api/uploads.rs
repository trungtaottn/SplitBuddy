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
    Router::new()
        .route("/avatar", post(upload_avatar))
        .route("/receipt", post(upload_receipt))
        .route("/bank-qr", post(upload_bank_qr))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
}

/// Validate image file by checking magic bytes (file signature)
/// This is more secure than just checking content-type header
fn validate_image_magic_bytes(data: &[u8]) -> Option<&'static str> {
    if data.len() < 8 {
        return None;
    }

    // JPEG: FF D8 FF
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("jpg");
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Some("png");
    }

    // GIF: 47 49 46 38 (GIF87a or GIF89a)
    if data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
        return Some("gif");
    }

    // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
    if data.len() >= 12 && data.starts_with(&[0x52, 0x49, 0x46, 0x46]) && &data[8..12] == b"WEBP" {
        return Some("webp");
    }

    None
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

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" || name == "avatar" {
            // Read file data first
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

            // Validate file content by checking magic bytes (more secure than content-type header)
            let ext = validate_image_magic_bytes(&data).ok_or_else(|| AppError::Validation {
                field: "file".to_string(),
                message: "Invalid image file. Only JPEG, PNG, GIF, and WebP are supported."
                    .to_string(),
            })?;

            // Generate unique filename
            let filename = format!("{}_{}.{}", auth_user.user_id, Uuid::new_v4(), ext);
            let filepath = upload_dir.join(&filename);

            // Save file
            fs::write(&filepath, &data)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e)))?;

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

async fn upload_receipt(
    State(_state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    // Create uploads directory if it doesn't exist
    let upload_dir = Path::new("uploads/receipts");
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" || name == "receipt" {
            // Read file data first
            let data = field.bytes().await.map_err(|e| {
                AppError::Internal(anyhow::anyhow!("Failed to read file data: {}", e))
            })?;

            // Limit file size (10MB for receipts - may be larger than avatars)
            if data.len() > 10 * 1024 * 1024 {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: "File size must be less than 10MB".to_string(),
                });
            }

            // Validate file content by checking magic bytes
            let ext = validate_image_magic_bytes(&data).ok_or_else(|| AppError::Validation {
                field: "file".to_string(),
                message: "Invalid image file. Only JPEG, PNG, GIF, and WebP are supported."
                    .to_string(),
            })?;

            // Generate unique filename
            let filename = format!("{}_{}.{}", auth_user.user_id, Uuid::new_v4(), ext);
            let filepath = upload_dir.join(&filename);

            // Save file
            fs::write(&filepath, &data)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e)))?;

            // Return URL (relative to static file serving)
            let url = format!("/uploads/receipts/{}", filename);

            return Ok(ok(UploadResponse { url }));
        }
    }

    Err(AppError::Validation {
        field: "file".to_string(),
        message: "No file provided".to_string(),
    })
}

async fn upload_bank_qr(
    State(_state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    // Create uploads directory if it doesn't exist
    let upload_dir = Path::new("uploads/bank_qr");
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" || name == "qr" || name == "bank_qr" {
            // Read file data first
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

            // Validate image file content by checking magic bytes
            let ext = validate_image_magic_bytes(&data).ok_or_else(|| AppError::Validation {
                field: "file".to_string(),
                message: "Invalid image file. Only JPEG, PNG, GIF, and WebP are supported."
                    .to_string(),
            })?;

            // Generate unique filename
            let filename = format!("{}_{}.{}", auth_user.user_id, Uuid::new_v4(), ext);
            let filepath = upload_dir.join(&filename);

            // Save file
            fs::write(&filepath, &data)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e)))?;

            // Return URL (relative to static file serving)
            let url = format!("/uploads/bank_qr/{}", filename);

            return Ok(ok(UploadResponse { url }));
        }
    }

    Err(AppError::Validation {
        field: "file".to_string(),
        message: "No file provided".to_string(),
    })
}
