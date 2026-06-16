use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::recurring_expense_dto::{
    parse_positive_money, RecurringExpenseResponse, UpdateRecurringExpenseRequest,
};
use crate::api::recurring_expense_guards::{
    find_recurring_in_session, require_recurring_session_participant,
};
use crate::api::sessions::authz::require_session_owner_or_admin;
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;

pub async fn list_recurring_expenses(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;

    require_recurring_session_participant(pool, user_id, session_id).await?;

    let recurring_expenses = RecurringExpenseRepository::find_by_session(pool, session_id).await?;

    let responses: Vec<RecurringExpenseResponse> = recurring_expenses
        .into_iter()
        .map(RecurringExpenseResponse::from)
        .collect();

    Ok(Json(responses))
}

pub async fn get_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;

    require_recurring_session_participant(pool, user_id, session_id).await?;
    let recurring_expense = find_recurring_in_session(pool, session_id, recurring_id).await?;

    Ok(Json(RecurringExpenseResponse::from(recurring_expense)))
}

pub async fn update_recurring_expense(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateRecurringExpenseRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    let amount = req
        .amount
        .as_deref()
        .map(|amount| parse_positive_money("amount", amount))
        .transpose()?;

    if let Some(interval_count) = req.interval_count {
        if interval_count <= 0 {
            return Err(AppError::Validation {
                field: "interval_count".to_string(),
                message: "Interval count must be positive".to_string(),
            });
        }
    }

    if let Some(ref split_strategy) = req.split_strategy {
        if !["EQUAL", "CUSTOM", "WEIGHTED"].contains(&split_strategy.as_str()) {
            return Err(AppError::Validation {
                field: "split_strategy".to_string(),
                message: "Invalid split strategy".to_string(),
            });
        }
    }

    let updated = RecurringExpenseRepository::update(
        pool,
        recurring_id,
        req.name,
        req.description.map(Some),
        amount,
        req.category_id.map(Some),
        req.split_strategy,
        req.frequency,
        req.interval_count,
        req.start_date,
        req.end_date.map(Some),
        req.timezone,
    )
    .await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpenseUpdate,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_id)
    .metadata(serde_json::json!({
        "old_name": existing.name,
        "new_name": updated.name,
    }))
    .log(pool)
    .await
    .ok();

    Ok(Json(RecurringExpenseResponse::from(updated)))
}

pub async fn delete_recurring_expense(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let existing = find_recurring_in_session(pool, session_id, recurring_id).await?;

    RecurringExpenseRepository::delete(pool, recurring_id).await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpenseDelete,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_id)
    .metadata(serde_json::json!({
        "name": existing.name,
    }))
    .log(pool)
    .await
    .ok();

    Ok(StatusCode::NO_CONTENT)
}
