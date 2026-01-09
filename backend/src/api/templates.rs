use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_templates).post(create_template))
        .route(
            "/:id",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
        .route("/:id/create-session", post(create_session_from_template))
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub location: Option<String>,
    pub participant_ids: Vec<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize, Validate)]
pub struct CreateTemplateRequest {
    #[validate(length(
        min = 1,
        max = 200,
        message = "Template name must be between 1 and 200 characters"
    ))]
    pub name: String,
    #[validate(length(max = 500, message = "Location must be less than 500 characters"))]
    pub location: Option<String>,
    pub participant_ids: Option<Vec<Uuid>>,
}

#[derive(Deserialize, Validate)]
pub struct UpdateTemplateRequest {
    #[validate(length(max = 200, message = "Template name must be less than 200 characters"))]
    pub name: Option<String>,
    #[validate(length(max = 500, message = "Location must be less than 500 characters"))]
    pub location: Option<String>,
    pub participant_ids: Option<Vec<Uuid>>,
}

#[derive(Deserialize)]
pub struct CreateSessionFromTemplateRequest {
    pub session_date: Option<chrono::NaiveDate>,
    pub group_id: Option<Uuid>,
}

/// List all templates for the authenticated user
pub async fn list_templates(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<TemplateResponse>>>, AppError> {
    let templates: Vec<TemplateResponse> = sqlx::query_as(
        r#"
        SELECT id, name, location, participant_ids, created_at, updated_at
        FROM session_templates
        WHERE user_id = $1
        ORDER BY updated_at DESC
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(templates))
}

/// Get a specific template
pub async fn get_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(template_id): Path<Uuid>,
) -> Result<Json<ApiResponse<TemplateResponse>>, AppError> {
    let template: Option<TemplateResponse> = sqlx::query_as(
        r#"
        SELECT id, name, location, participant_ids, created_at, updated_at
        FROM session_templates
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(template_id)
    .bind(auth_user.user_id)
    .fetch_optional(&state.pool)
    .await?;

    let template = template.ok_or(AppError::Validation {
        field: "template_id".to_string(),
        message: "Template not found".to_string(),
    })?;

    Ok(ok(template))
}

/// Create a new template
pub async fn create_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<TemplateResponse>>), AppError> {
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    let template_id = Uuid::new_v4();
    let participant_ids = payload.participant_ids.unwrap_or_default();

    let template: TemplateResponse = sqlx::query_as(
        r#"
        INSERT INTO session_templates (id, user_id, name, location, participant_ids, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, location, participant_ids, created_at, updated_at
        "#,
    )
    .bind(template_id)
    .bind(auth_user.user_id)
    .bind(&payload.name)
    .bind(&payload.location)
    .bind(&participant_ids)
    .fetch_one(&state.pool)
    .await?;

    Ok(created(template))
}

/// Update a template
pub async fn update_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(template_id): Path<Uuid>,
    Json(payload): Json<UpdateTemplateRequest>,
) -> Result<Json<ApiResponse<TemplateResponse>>, AppError> {
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    // Verify ownership
    let exists: bool = sqlx::query_scalar(
        r#"SELECT EXISTS(SELECT 1 FROM session_templates WHERE id = $1 AND user_id = $2)"#,
    )
    .bind(template_id)
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    if !exists {
        return Err(AppError::Forbidden {
            message: "Template not found or access denied".to_string(),
        });
    }

    let template: TemplateResponse = sqlx::query_as(
        r#"
        UPDATE session_templates
        SET 
            name = COALESCE($1, name),
            location = COALESCE($2, location),
            participant_ids = COALESCE($3, participant_ids),
            updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING id, name, location, participant_ids, created_at, updated_at
        "#,
    )
    .bind(payload.name)
    .bind(payload.location)
    .bind(payload.participant_ids.as_ref())
    .bind(template_id)
    .bind(auth_user.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(template))
}

/// Delete a template
pub async fn delete_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(template_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let deleted = sqlx::query(r#"DELETE FROM session_templates WHERE id = $1 AND user_id = $2"#)
        .bind(template_id)
        .bind(auth_user.user_id)
        .execute(&state.pool)
        .await?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::Forbidden {
            message: "Template not found or access denied".to_string(),
        });
    }

    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// Create a session from a template
pub async fn create_session_from_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(template_id): Path<Uuid>,
    Json(payload): Json<CreateSessionFromTemplateRequest>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<crate::api::sessions::SessionResponse>>,
    ),
    AppError,
> {
    // Get template
    let template: Option<(String, Option<String>, Vec<Uuid>)> = sqlx::query_as(
        r#"
        SELECT name, location, participant_ids
        FROM session_templates
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(template_id)
    .bind(auth_user.user_id)
    .fetch_optional(&state.pool)
    .await?;

    let (name, location, participant_ids) = template.ok_or(AppError::Validation {
        field: "template_id".to_string(),
        message: "Template not found".to_string(),
    })?;

    // Create session using existing repository method
    use crate::repository::session_repo::SessionRepository;
    let repo = SessionRepository::new(state.pool.clone());

    let session = repo
        .create_with_participants(
            &name,
            location.as_deref(),
            payload.session_date,
            auth_user.user_id,
            payload.group_id,
            Some(&participant_ids),
            None,
        )
        .await?;

    Ok(created(session))
}
