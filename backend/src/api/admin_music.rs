use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::path::Path as StdPath;
use tokio::fs;
use uuid::Uuid;

use crate::api::admin::require_admin;
use crate::api::admin_dto::{
    AddMusicUrlRequest, MusicTrack, MusicTrackResponse, PaginatedResponse, PaginationMeta,
    PaginationQuery,
};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn list_music(
    State(state): State<AppState>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<Vec<MusicTrackResponse>>>>, AppError> {
    let page = pagination.page.max(1);
    let limit = pagination.limit.clamp(1, 100);
    let offset = (page - 1) * limit;

    let tracks: Vec<MusicTrack> = sqlx::query_as(
        r#"
        SELECT id, name, filename, file_path, file_size, duration_seconds, uploaded_by, created_at
        FROM music_tracks
        ORDER BY created_at ASC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*)::bigint FROM music_tracks"#)
        .fetch_one(&state.pool)
        .await?;

    let total_pages = (total + limit - 1) / limit;

    let response: Vec<MusicTrackResponse> = tracks
        .into_iter()
        .map(|t| MusicTrackResponse {
            id: t.id,
            name: t.name,
            // If filename starts with http, it's a URL - return as-is
            src: if t.filename.starts_with("http") {
                t.filename
            } else {
                format!("/uploads/music/{}", t.filename)
            },
        })
        .collect();

    Ok(ok(PaginatedResponse {
        data: response,
        pagination: PaginationMeta {
            page,
            per_page: limit,
            total,
            total_pages,
        },
    }))
}

pub async fn delete_music(
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
        sqlx::query("DELETE FROM music_tracks WHERE id = $1")
            .bind(id)
            .execute(&state.pool)
            .await?;
    }

    Ok(ok(()))
}

pub async fn add_music_url(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<AddMusicUrlRequest>,
) -> Result<Json<ApiResponse<MusicTrackResponse>>, AppError> {
    require_admin(&auth_user)?;

    if payload.name.trim().is_empty() {
        return Err(AppError::Validation {
            field: "name".to_string(),
            message: "Tên bài hát không được để trống".to_string(),
        });
    }

    if payload.url.trim().is_empty() {
        return Err(AppError::Validation {
            field: "url".to_string(),
            message: "URL không được để trống".to_string(),
        });
    }

    // Save to database with URL as the source
    let track: MusicTrack = sqlx::query_as(
        r#"
        INSERT INTO music_tracks (name, filename, file_path, file_size, uploaded_by)
        VALUES ($1, $2, $3, 0, $4)
        RETURNING id, name, filename, file_path, file_size, duration_seconds, uploaded_by, created_at
        "#
    )
    .bind(payload.name.trim())
    .bind(&payload.url) // Store URL in filename field
    .bind(&payload.url) // Store URL in file_path field
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to save music URL to database: {:?}", e);
        AppError::Internal(anyhow::anyhow!("Database error: {}", e))
    })?;

    Ok(ok(MusicTrackResponse {
        id: track.id,
        name: track.name,
        src: track.filename, // URL is stored in filename
    }))
}
