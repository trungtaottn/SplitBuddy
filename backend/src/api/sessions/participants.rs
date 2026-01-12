use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::ParticipantResponse;

#[derive(Deserialize, Validate)]
pub struct AddParticipantRequest {
    pub user_id: Option<Uuid>,
    #[validate(length(
        min = 1,
        max = 100,
        message = "Guest name must be between 1 and 100 characters"
    ))]
    pub guest_name: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateParticipantRequest {
    pub guest_name: Option<String>,
}

#[derive(Deserialize)]
pub struct ParticipantPathParams {
    pub id: Uuid,
    pub pid: Uuid,
}

pub async fn add_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<AddParticipantRequest>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<ParticipantResponse>>,
    ),
    AppError,
> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    if payload.user_id.is_none() && payload.guest_name.is_none() {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Either user_id or guest_name must be provided".to_string(),
        });
    }

    let participant = repo
        .add_participant(session_id, payload.user_id, payload.guest_name)
        .await?;

    Ok(created(participant))
}

pub async fn update_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
    Json(payload): Json<UpdateParticipantRequest>,
) -> Result<Json<ApiResponse<ParticipantResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(params.id, auth_user.user_id).await?;

    // Update participant (only guest_name can be updated)
    let participant = repo
        .update_participant(params.pid, payload.guest_name)
        .await?;

    Ok(ok(participant))
}

pub async fn delete_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(params.id, auth_user.user_id).await?;

    // Check if participant has any bills
    let has_bills: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
        SELECT 1 FROM bill_payers WHERE participant_id = $1
        UNION
        SELECT 1 FROM bill_splits WHERE participant_id = $1
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if has_bills {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tham gia đã có trong hóa đơn".to_string(),
        });
    }

    // Check if participant is the session owner
    let is_owner: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM session_participants sp
            JOIN sessions s ON sp.session_id = s.id
            WHERE sp.id = $1 AND sp.user_id = s.created_by
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if is_owner {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tạo session".to_string(),
        });
    }

    // Delete participant
    repo.delete_participant(params.pid).await?;

    Ok(ok(()))
}
