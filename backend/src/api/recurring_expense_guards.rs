use uuid::Uuid;

use crate::domain::recurring_expense::RecurringExpense;
use crate::error::AppError;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;

pub async fn require_recurring_session_participant(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    session_id: Uuid,
) -> Result<(), AppError> {
    let is_participant: Option<bool> = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)",
    )
    .bind(session_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if is_participant.unwrap_or(false) {
        Ok(())
    } else {
        Err(AppError::Forbidden {
            message: "You are not a participant of this session".to_string(),
        })
    }
}

pub async fn find_recurring_in_session(
    pool: &sqlx::PgPool,
    session_id: Uuid,
    recurring_id: Uuid,
) -> Result<RecurringExpense, AppError> {
    let recurring_expense = RecurringExpenseRepository::find_by_id(pool, recurring_id)
        .await?
        .ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

    if recurring_expense.session_id == session_id {
        Ok(recurring_expense)
    } else {
        Err(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))
    }
}
