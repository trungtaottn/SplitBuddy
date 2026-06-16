use axum::{
    extract::{Multipart, State},
    Json,
};
use std::path::Path as StdPath;
use tokio::fs;
use uuid::Uuid;

use crate::api::admin::require_admin;
use crate::api::admin_dto::{MusicTrack, MusicTrackResponse};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn upload_music(
    State(state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<MusicTrackResponse>>, AppError> {
    require_admin(&auth_user)?;

    let upload_dir = StdPath::new("uploads/music");
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    let mut track_name = String::new();
    let mut saved_filename = String::new();
    let mut file_size: i64 = 0;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e)))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "name" {
            track_name = field.text().await.unwrap_or_default();
        } else if field_name == "file" {
            let original_filename = field.file_name().unwrap_or("track.mp3").to_string();
            let content_type = field.content_type().unwrap_or("").to_string();

            tracing::debug!(
                "Uploading file: {} with content-type: {}",
                original_filename,
                content_type
            );

            let ext = original_filename
                .rsplit('.')
                .next()
                .unwrap_or("mp3")
                .to_lowercase();

            let valid_extensions = ["mp3", "m4a", "wav", "ogg", "flac", "aac", "wma"];
            if !valid_extensions.contains(&ext.as_str()) && !content_type.starts_with("audio/") {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: format!(
                        "File must be an audio file. Got: {} ({})",
                        ext, content_type
                    ),
                });
            }

            let filename = format!(
                "{}_{}.{}",
                Uuid::new_v4(),
                sanitize_filename(&original_filename),
                ext
            );
            let filepath = upload_dir.join(&filename);
            tracing::debug!("Will save to: {:?}", filepath);

            let data = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read file bytes: {:?}", e);
                AppError::Internal(anyhow::anyhow!("Failed to read file data: {}", e))
            })?;
            tracing::debug!("Read {} bytes", data.len());

            if data.len() > 50 * 1024 * 1024 {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: "File size must be less than 50MB".to_string(),
                });
            }

            file_size = data.len() as i64;

            fs::write(&filepath, &data).await.map_err(|e| {
                tracing::error!("Failed to write file: {:?}", e);
                AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e))
            })?;
            tracing::debug!("File saved successfully");

            saved_filename = filename;

            if track_name.is_empty() {
                track_name = original_filename
                    .rsplit('/')
                    .next()
                    .unwrap_or(&original_filename)
                    .rsplit('.')
                    .skip(1)
                    .collect::<Vec<_>>()
                    .into_iter()
                    .rev()
                    .collect::<Vec<_>>()
                    .join(".");
                if track_name.is_empty() {
                    track_name = original_filename;
                }
            }
        }
    }

    if saved_filename.is_empty() {
        return Err(AppError::Validation {
            field: "file".to_string(),
            message: "No audio file provided".to_string(),
        });
    }

    let file_path = format!("uploads/music/{}", saved_filename);
    tracing::debug!(
        "Saving track to DB: name={}, filename={}, size={}",
        track_name,
        saved_filename,
        file_size
    );

    let track: MusicTrack = sqlx::query_as(
        r#"
        INSERT INTO music_tracks (name, filename, file_path, file_size, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, filename, file_path, file_size, duration_seconds, uploaded_by, created_at
        "#
    )
    .bind(&track_name)
    .bind(&saved_filename)
    .bind(&file_path)
    .bind(file_size)
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to save music track to database: {:?}", e);
        AppError::Internal(anyhow::anyhow!("Database error: {}", e))
    })?;

    Ok(ok(MusicTrackResponse {
        id: track.id,
        name: track.name,
        src: format!("/uploads/music/{}", track.filename),
    }))
}

fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
        .collect::<String>()
        .chars()
        .take(50)
        .collect()
}
