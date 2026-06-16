use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::api::admin::require_admin;
use crate::api::admin_dto::{
    CreateUserRequest, PaginatedResponse, PaginationMeta, PaginationQuery, ResetPasswordRequest,
    UserResponse,
};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::utils::password::hash_password;

pub async fn list_users(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<Vec<UserResponse>>>>, AppError> {
    require_admin(&auth_user)?;

    let page = pagination.page.max(1);
    let limit = pagination.limit.clamp(1, 100);
    let offset = (page - 1) * limit;

    let users: Vec<UserResponse> = sqlx::query_as(
        r#"
        SELECT id, email, full_name, role, avatar_url, created_at
        FROM users
        WHERE role != 'admin'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total: i64 =
        sqlx::query_scalar(r#"SELECT COUNT(*)::bigint FROM users WHERE role != 'admin'"#)
            .fetch_one(&state.pool)
            .await?;

    let total_pages = (total + limit - 1) / limit;

    Ok(ok(PaginatedResponse {
        data: users,
        pagination: PaginationMeta {
            page,
            per_page: limit,
            total,
            total_pages,
        },
    }))
}

pub async fn create_user(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, AppError> {
    require_admin(&auth_user)?;

    let exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
        .bind(&payload.email)
        .fetch_optional(&state.pool)
        .await?;

    if exists.is_some() {
        return Err(AppError::EmailAlreadyExists {
            email: payload.email,
        });
    }

    let password_hash = hash_password(&payload.password)?;

    let id = Uuid::new_v4();
    let user: UserResponse = sqlx::query_as(
        r#"
        INSERT INTO users (id, email, full_name, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'user', NOW(), NOW())
        RETURNING id, email, full_name, role, avatar_url, created_at
        "#,
    )
    .bind(id)
    .bind(&payload.email)
    .bind(&payload.full_name)
    .bind(&password_hash)
    .fetch_one(&state.pool)
    .await?;

    Ok(ok(user))
}

pub async fn reset_password(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(user_id): Path<Uuid>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_admin(&auth_user)?;

    let password_hash = hash_password(&payload.new_password)?;

    sqlx::query!(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        password_hash,
        user_id
    )
    .execute(&state.pool)
    .await?;

    Ok(ok(()))
}
