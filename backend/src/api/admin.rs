use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::path::Path as StdPath;
use tokio::fs;
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id/password", put(reset_password))
        .route("/features", get(list_features))
        .route("/features/:key", put(toggle_feature))
        .route("/music", get(list_music).post(upload_music).layer(DefaultBodyLimit::max(50 * 1024 * 1024))) // 50MB limit
        .route("/music/:id", delete(delete_music))
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

// Music Management

#[derive(Serialize, sqlx::FromRow)]
pub struct MusicTrack {
    pub id: Uuid,
    pub name: String,
    pub filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub duration_seconds: Option<i32>,
    pub uploaded_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct MusicTrackResponse {
    pub id: Uuid,
    pub name: String,
    pub src: String,
}

async fn list_music(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<MusicTrackResponse>>>, AppError> {
    let tracks: Vec<MusicTrack> = sqlx::query_as(
        r#"
        SELECT id, name, filename, file_path, file_size, duration_seconds, uploaded_by, created_at
        FROM music_tracks
        ORDER BY created_at ASC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    let response: Vec<MusicTrackResponse> = tracks
        .into_iter()
        .map(|t| MusicTrackResponse {
            id: t.id,
            name: t.name,
            src: format!("/uploads/music/{}", t.filename),
        })
        .collect();

    Ok(ok(response))
}

async fn upload_music(
    State(state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<MusicTrackResponse>>, AppError> {
    require_admin(&auth_user)?;

    // Create uploads directory if it doesn't exist
    let upload_dir = StdPath::new("uploads/music");
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    let mut track_name = String::new();
    let mut saved_filename = String::new();
    let mut file_size: i64 = 0;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e))
    })? {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "name" {
            track_name = field.text().await.unwrap_or_default();
        } else if field_name == "file" {
            let original_filename = field.file_name().unwrap_or("track.mp3").to_string();
            let content_type = field.content_type().unwrap_or("").to_string();
            
            tracing::debug!("Uploading file: {} with content-type: {}", original_filename, content_type);

            // Get file extension
            let ext = original_filename
                .rsplit('.')
                .next()
                .unwrap_or("mp3")
                .to_lowercase();

            // Validate file type by extension (more reliable than content-type)
            let valid_extensions = ["mp3", "m4a", "wav", "ogg", "flac", "aac", "wma"];
            if !valid_extensions.contains(&ext.as_str()) && !content_type.starts_with("audio/") {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: format!("File must be an audio file. Got: {} ({})", ext, content_type),
                });
            }

            // Generate unique filename
            let filename = format!("{}_{}.{}", Uuid::new_v4(), sanitize_filename(&original_filename), ext);
            let filepath = upload_dir.join(&filename);
            tracing::debug!("Will save to: {:?}", filepath);

            // Read file data
            let data = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read file bytes: {:?}", e);
                AppError::Internal(anyhow::anyhow!("Failed to read file data: {}", e))
            })?;
            tracing::debug!("Read {} bytes", data.len());

            // Limit file size (50MB for audio)
            if data.len() > 50 * 1024 * 1024 {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: "File size must be less than 50MB".to_string(),
                });
            }

            file_size = data.len() as i64;

            // Save file
            fs::write(&filepath, &data).await.map_err(|e| {
                tracing::error!("Failed to write file: {:?}", e);
                AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e))
            })?;
            tracing::debug!("File saved successfully");

            saved_filename = filename;

            // Use original filename as track name if not provided
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

    // Save to database
    let file_path = format!("uploads/music/{}", saved_filename);
    tracing::debug!("Saving track to DB: name={}, filename={}, size={}", track_name, saved_filename, file_size);
    
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

async fn delete_music(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_admin(&auth_user)?;

    // Get track info first
    let track: Option<MusicTrack> = sqlx::query_as(
        "SELECT id, name, filename, file_path, file_size, duration_seconds, uploaded_by, created_at FROM music_tracks WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(track) = track {
        // Delete file from disk
        let filepath = StdPath::new(&track.file_path);
        if filepath.exists() {
            let _ = fs::remove_file(filepath).await;
        }

        // Delete from database
        sqlx::query!("DELETE FROM music_tracks WHERE id = $1", id)
            .execute(&state.pool)
            .await?;
    }

    Ok(ok(()))
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
