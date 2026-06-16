use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::NaiveDate;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::recurring_expense_dto::{ExceptionRequest, ExceptionResponse};
use crate::api::recurring_expense_guards::{
    find_recurring_in_session, require_recurring_session_participant,
};
use crate::api::sessions::authz::require_session_owner_or_admin;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;

pub async fn list_exceptions(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;

    require_recurring_session_participant(pool, user_id, session_id).await?;
    let _existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    let rows = RecurringExpenseRepository::list_exceptions(pool, recurring_id).await?;
    let response = rows
        .into_iter()
        .map(|row| ExceptionResponse {
            id: row.id,
            recurring_expense_id: row.recurring_expense_id,
            date: row.exception_date,
            reason: row.reason,
            created_at: row.created_at,
        })
        .collect::<Vec<_>>();

    Ok(Json(response))
}

pub async fn add_exception(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<ExceptionRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let _existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    RecurringExpenseRepository::add_exception(
        pool,
        recurring_id,
        payload.date,
        payload.reason.clone(),
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_exception(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id, date)): Path<(Uuid, Uuid, NaiveDate)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let _existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    RecurringExpenseRepository::remove_exception(pool, recurring_id, date).await?;

    Ok(StatusCode::NO_CONTENT)
}
