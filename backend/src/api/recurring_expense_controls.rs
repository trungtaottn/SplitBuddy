use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::recurring_expense_guards::find_recurring_in_session;
use crate::api::sessions::authz::require_session_owner_or_admin;
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::domain::recurring_expense::scheduler;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;

pub async fn pause_recurring_expense(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let _existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    RecurringExpenseRepository::pause(pool, recurring_id).await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpensePause,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_id)
    .log(pool)
    .await
    .ok();

    Ok(StatusCode::NO_CONTENT)
}

pub async fn resume_recurring_expense(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let _existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    RecurringExpenseRepository::resume(pool, recurring_id).await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpenseResume,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_id)
    .log(pool)
    .await
    .ok();

    Ok(StatusCode::NO_CONTENT)
}

pub async fn skip_next_occurrence(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    let new_next_run = scheduler::calculate_next_run(
        existing.next_run,
        existing.frequency,
        existing.interval_count,
        &existing.timezone,
    )
    .map_err(|e| AppError::Validation {
        field: "timezone".to_string(),
        message: e,
    })?;

    RecurringExpenseRepository::skip_next(pool, recurring_id, new_next_run).await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpenseSkip,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_id)
    .log(pool)
    .await
    .ok();

    Ok(StatusCode::NO_CONTENT)
}
