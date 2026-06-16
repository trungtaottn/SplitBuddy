use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

use crate::domain::recurring_expense::{RecurringExpense, RecurringFrequency};
use crate::error::AppError;

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
    pub start_time: Option<String>,
    pub timezone: Option<String>,
}

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

pub fn parse_positive_money(field: &str, value: &str) -> Result<Decimal, AppError> {
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
