use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Datelike, TimeZone, Utc};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::recurring_expense_dto::{
    parse_positive_money, CreateRecurringExpenseRequest, RecurringExpenseResponse,
};
use crate::api::sessions::authz::require_session_owner_or_admin;
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;
use crate::repository::session_repo::SessionRepository;

pub async fn create_recurring_expense(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(req): Json<CreateRecurringExpenseRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let pool = &state.pool;
    let user_id = auth_user.user_id;

    let session_repo = SessionRepository::new(pool.clone());
    let session_currency = session_repo
        .get_session_base_currency(session_id)
        .await
        .map_err(|_| AppError::SessionNotFound { session_id })?;
    require_session_owner_or_admin(pool, &auth_user, session_id).await?;

    let amount = parse_positive_money("amount", &req.amount)?;

    let interval_count = req.interval_count.unwrap_or(1);
    if interval_count <= 0 {
        return Err(AppError::Validation {
            field: "interval_count".to_string(),
            message: "Interval count must be positive".to_string(),
        });
    }

    if !["EQUAL", "CUSTOM", "WEIGHTED"].contains(&req.split_strategy.as_str()) {
        return Err(AppError::Validation {
            field: "split_strategy".to_string(),
            message: "Invalid split strategy".to_string(),
        });
    }

    if let Some(end_date) = req.end_date {
        if end_date < req.start_date {
            return Err(AppError::Validation {
                field: "end_date".to_string(),
                message: "End date must be after start date".to_string(),
            });
        }
    }

    let timezone = req.timezone.clone().unwrap_or_else(|| "UTC".to_string());
    let tz: chrono_tz::Tz = timezone.parse().map_err(|_| AppError::Validation {
        field: "timezone".to_string(),
        message: format!("Invalid timezone: {}", timezone),
    })?;

    let start_time = req.start_time.unwrap_or_else(|| "00:00".to_string());
    let time_parts: Vec<&str> = start_time.split(':').collect();
    let hour = time_parts
        .first()
        .and_then(|h| h.parse::<u32>().ok())
        .unwrap_or(0);
    let minute = time_parts
        .get(1)
        .and_then(|m| m.parse::<u32>().ok())
        .unwrap_or(0);

    let next_run_local = tz
        .with_ymd_and_hms(
            req.start_date.year(),
            req.start_date.month(),
            req.start_date.day(),
            hour,
            minute,
            0,
        )
        .single()
        .ok_or(AppError::Validation {
            field: "start_date".to_string(),
            message: "Invalid start date/time combination".to_string(),
        })?;

    let next_run = next_run_local.with_timezone(&Utc);
    let currency_code = req.currency_code.unwrap_or(session_currency);

    let recurring_expense = RecurringExpenseRepository::create(
        pool,
        session_id,
        req.name,
        req.description,
        amount,
        currency_code,
        req.category_id,
        req.split_strategy,
        req.frequency,
        interval_count,
        req.start_date,
        req.end_date,
        next_run,
        timezone,
        user_id,
    )
    .await?;

    AuditLogBuilder::new(
        AuditAction::RecurringExpenseCreate,
        AuditEntityType::RecurringExpense,
    )
    .user(user_id, None)
    .entity_id(recurring_expense.id)
    .metadata(serde_json::json!({
        "name": recurring_expense.name,
        "frequency": recurring_expense.frequency,
        "amount": recurring_expense.amount.to_string(),
    }))
    .log(pool)
    .await
    .ok();

    Ok((
        StatusCode::CREATED,
        Json(RecurringExpenseResponse::from(recurring_expense)),
    ))
}
