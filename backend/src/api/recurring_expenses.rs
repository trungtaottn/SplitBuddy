use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::domain::recurring_expense::{scheduler, RecurringExpense, RecurringFrequency};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;
use crate::repository::session_repo::SessionRepository;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Datelike, NaiveDate, TimeZone, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ExceptionRequest {
    pub date: NaiveDate,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExceptionResponse {
    pub id: Uuid,
    pub recurring_expense_id: Uuid,
    pub date: NaiveDate,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Request to create a recurring expense
#[derive(Debug, Deserialize)]
pub struct CreateRecurringExpenseRequest {
    pub name: String,
    pub description: Option<String>,
    pub amount: String,
    pub currency_code: Option<String>,
    pub category_id: Option<Uuid>,
    pub split_strategy: String,
    pub frequency: RecurringFrequency,
    pub interval_count: Option<i32>,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub start_time: Option<String>, // HH:MM format
    pub timezone: Option<String>,
}

/// Request to update a recurring expense
#[derive(Debug, Deserialize)]
pub struct UpdateRecurringExpenseRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub amount: Option<String>,
    pub category_id: Option<Uuid>,
    pub split_strategy: Option<String>,
    pub frequency: Option<RecurringFrequency>,
    pub interval_count: Option<i32>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub timezone: Option<String>,
}

/// Response for recurring expense
#[derive(Debug, Serialize)]
pub struct RecurringExpenseResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub amount: String,
    pub currency_code: String,
    pub category_id: Option<Uuid>,
    pub split_strategy: String,
    pub frequency: RecurringFrequency,
    pub interval_count: i32,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub next_run: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub timezone: String,
    pub is_active: bool,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<RecurringExpense> for RecurringExpenseResponse {
    fn from(expense: RecurringExpense) -> Self {
        Self {
            id: expense.id,
            session_id: expense.session_id,
            name: expense.name,
            description: expense.description,
            amount: expense.amount.to_string(),
            currency_code: expense.currency_code,
            category_id: expense.category_id,
            split_strategy: expense.split_strategy,
            frequency: expense.frequency,
            interval_count: expense.interval_count,
            start_date: expense.start_date,
            end_date: expense.end_date,
            next_run: expense.next_run,
            last_run: expense.last_run,
            timezone: expense.timezone,
            is_active: expense.is_active,
            created_by: expense.created_by,
            created_at: expense.created_at,
            updated_at: expense.updated_at,
        }
    }
}

fn parse_positive_money(field: &str, value: &str) -> Result<Decimal, AppError> {
    let amount = Decimal::from_str(value.trim()).map_err(|_| AppError::Validation {
        field: field.to_string(),
        message: "Amount must be a valid decimal string".to_string(),
    })?;

    if amount <= Decimal::ZERO {
        return Err(AppError::Validation {
            field: field.to_string(),
            message: "Amount must be positive".to_string(),
        });
    }

    Ok(amount)
}

/// Create a new recurring expense for a session
pub async fn create_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(req): Json<CreateRecurringExpenseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify session exists and user has access
    let session_repo = SessionRepository::new(pool.clone());
    let session_currency = session_repo
        .get_session_base_currency(session_id)
        .await
        .map_err(|_| AppError::SessionNotFound { session_id })?;

    // Verify user is participant of session
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Validate request
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

    // Calculate initial next_run
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

    // Create recurring expense
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

    // Audit log
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

/// Get all recurring expenses for a session
pub async fn list_recurring_expenses(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    let recurring_expenses = RecurringExpenseRepository::find_by_session(pool, session_id).await?;

    let responses: Vec<RecurringExpenseResponse> = recurring_expenses
        .into_iter()
        .map(RecurringExpenseResponse::from)
        .collect();

    Ok(Json(responses))
}

/// Get a specific recurring expense
pub async fn get_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    let recurring_expense = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if recurring_expense.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    Ok(Json(RecurringExpenseResponse::from(recurring_expense)))
}

/// Update a recurring expense
pub async fn update_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateRecurringExpenseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Verify recurring expense exists and belongs to session
    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    // Validate updates
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

    // Update recurring expense
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

    // Audit log
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

/// Delete a recurring expense
pub async fn delete_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Verify recurring expense exists and belongs to session
    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    RecurringExpenseRepository::delete(pool, recurring_id).await?;

    // Audit log
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

/// Pause a recurring expense
pub async fn pause_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Verify recurring expense exists and belongs to session
    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    RecurringExpenseRepository::pause(pool, recurring_id).await?;

    // Audit log
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

/// Resume a recurring expense
pub async fn resume_recurring_expense(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Verify recurring expense exists and belongs to session
    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    RecurringExpenseRepository::resume(pool, recurring_id).await?;

    // Audit log
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

/// Skip the next occurrence of a recurring expense
pub async fn skip_next_occurrence(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    // Verify user has access
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    // Verify recurring expense exists and belongs to session
    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    // Calculate new next_run
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

    // Audit log
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

/// List exceptions for a recurring expense
pub async fn list_exceptions(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

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

/// Add an exception date (skip)
pub async fn add_exception(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<ExceptionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    RecurringExpenseRepository::add_exception(
        pool,
        recurring_id,
        payload.date,
        payload.reason.clone(),
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Remove an exception date
pub async fn remove_exception(
    State(state): State<AppState>,
    AuthUser { user_id, .. }: AuthUser,
    Path((session_id, recurring_id, date)): Path<(Uuid, Uuid, NaiveDate)>,
) -> Result<impl IntoResponse, AppError> {
    let pool = &state.pool;

    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !is_participant.unwrap_or(false) {
        return Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        });
    }

    let existing = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if existing.session_id != session_id {
        return Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ));
    }

    RecurringExpenseRepository::remove_exception(pool, recurring_id, date).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Router for recurring expense endpoints
pub fn routes() -> Router<AppState> {
    Router::new()
        // Routes under /api/recurring-expenses
        // List all recurring expenses for a session
        .route("/session/:session_id", get(list_recurring_expenses))
        // Create new recurring expense for a session
        .route("/session/:session_id", post(create_recurring_expense))
        // Get, update, delete specific recurring expense
        .route(
            "/session/:session_id/:recurring_id",
            get(get_recurring_expense)
                .put(update_recurring_expense)
                .delete(delete_recurring_expense),
        )
        // Control actions
        .route(
            "/session/:session_id/:recurring_id/pause",
            put(pause_recurring_expense),
        )
        .route(
            "/session/:session_id/:recurring_id/resume",
            put(resume_recurring_expense),
        )
        .route(
            "/session/:session_id/:recurring_id/skip",
            put(skip_next_occurrence),
        )
        .route(
            "/session/:session_id/:recurring_id/exceptions",
            get(list_exceptions).post(add_exception),
        )
        .route(
            "/session/:session_id/:recurring_id/exceptions/:date",
            axum::routing::delete(remove_exception),
        )
}
