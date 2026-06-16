use crate::domain::recurring_expense::{
    RecurringExpense, RecurringExpenseSnapshot, RecurringExpenseSnapshotRow, RecurringFrequency,
};
use crate::error::AppError;
use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

#[derive(Debug, sqlx::FromRow)]
pub struct RecurringExceptionRow {
    pub id: Uuid,
    pub recurring_expense_id: Uuid,
    pub exception_date: NaiveDate,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Repository for recurring expenses
pub struct RecurringExpenseRepository;

impl RecurringExpenseRepository {
    /// Create a new recurring expense
    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        pool: &PgPool,
        session_id: Uuid,
        name: String,
        description: Option<String>,
        amount: f64,
        currency_code: String,
        category_id: Option<Uuid>,
        split_strategy: String,
        frequency: RecurringFrequency,
        interval_count: i32,
        start_date: NaiveDate,
        end_date: Option<NaiveDate>,
        next_run: DateTime<Utc>,
        timezone: String,
        created_by: Uuid,
    ) -> Result<RecurringExpense, AppError> {
        let frequency_str = match frequency {
            RecurringFrequency::Daily => "DAILY",
            RecurringFrequency::Weekly => "WEEKLY",
            RecurringFrequency::Monthly => "MONTHLY",
        };

        let row = sqlx::query(
            r#"
            INSERT INTO recurring_expenses (
                session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency, interval_count, start_date, end_date,
                next_run, timezone, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::recurring_frequency, $9, $10, $11, $12, $13, $14)
            RETURNING 
                id, session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency::text as frequency_str, interval_count, start_date, end_date,
                next_run, last_run, timezone, is_active, created_by, created_at, updated_at
            "#,
        )
        .bind(session_id)
        .bind(&name)
        .bind(&description)
        .bind(amount)
        .bind(&currency_code)
        .bind(category_id)
        .bind(&split_strategy)
        .bind(frequency_str)
        .bind(interval_count)
        .bind(start_date)
        .bind(end_date)
        .bind(next_run)
        .bind(&timezone)
        .bind(created_by)
        .fetch_one(pool)
        .await?;

        Self::row_to_recurring_expense(row)
    }

    /// Get recurring expense by ID
    pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<RecurringExpense>, AppError> {
        let row = sqlx::query(
            r#"
            SELECT 
                id, session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency::text as frequency_str, interval_count, start_date, end_date,
                next_run, last_run, timezone, is_active, created_by, created_at, updated_at
            FROM recurring_expenses
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok(Some(Self::row_to_recurring_expense(r)?)),
            None => Ok(None),
        }
    }

    /// Get all recurring expenses for a session
    pub async fn find_by_session(
        pool: &PgPool,
        session_id: Uuid,
    ) -> Result<Vec<RecurringExpense>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id, session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency::text as frequency_str, interval_count, start_date, end_date,
                next_run, last_run, timezone, is_active, created_by, created_at, updated_at
            FROM recurring_expenses
            WHERE session_id = $1
            ORDER BY next_run ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        rows.into_iter()
            .map(Self::row_to_recurring_expense)
            .collect()
    }

    /// Get all active recurring expenses that need to run
    #[allow(dead_code)]
    pub async fn find_due_expenses(
        pool: &PgPool,
        now: DateTime<Utc>,
    ) -> Result<Vec<RecurringExpense>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT 
                id, session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency::text as frequency_str, interval_count, start_date, end_date,
                next_run, last_run, timezone, is_active, created_by, created_at, updated_at
            FROM recurring_expenses
            WHERE is_active = TRUE 
              AND next_run <= $1
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            ORDER BY next_run ASC
            LIMIT 100
            "#,
        )
        .bind(now)
        .fetch_all(pool)
        .await?;

        rows.into_iter()
            .map(Self::row_to_recurring_expense)
            .collect()
    }

    /// Update recurring expense
    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        pool: &PgPool,
        id: Uuid,
        name: Option<String>,
        description: Option<Option<String>>,
        amount: Option<f64>,
        category_id: Option<Option<Uuid>>,
        split_strategy: Option<String>,
        frequency: Option<RecurringFrequency>,
        interval_count: Option<i32>,
        start_date: Option<NaiveDate>,
        end_date: Option<Option<NaiveDate>>,
        timezone: Option<String>,
    ) -> Result<RecurringExpense, AppError> {
        // First fetch current values
        let current = Self::find_by_id(pool, id).await?.ok_or(AppError::NotFound(
            "Recurring expense not found".to_string(),
        ))?;

        let frequency_str = frequency.map(|f| match f {
            RecurringFrequency::Daily => "DAILY",
            RecurringFrequency::Weekly => "WEEKLY",
            RecurringFrequency::Monthly => "MONTHLY",
        });

        let row = sqlx::query(
            r#"
            UPDATE recurring_expenses
            SET 
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                amount = COALESCE($4, amount),
                category_id = COALESCE($5, category_id),
                split_strategy = COALESCE($6, split_strategy),
                frequency = COALESCE($7::recurring_frequency, frequency),
                interval_count = COALESCE($8, interval_count),
                start_date = COALESCE($9, start_date),
                end_date = COALESCE($10, end_date),
                timezone = COALESCE($11, timezone),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING 
                id, session_id, name, description, amount, currency_code, category_id,
                split_strategy, frequency::text as frequency_str, interval_count, start_date, end_date,
                next_run, last_run, timezone, is_active, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(description.unwrap_or(current.description))
        .bind(amount)
        .bind(category_id.unwrap_or(current.category_id))
        .bind(split_strategy)
        .bind(frequency_str)
        .bind(interval_count)
        .bind(start_date)
        .bind(end_date.unwrap_or(current.end_date))
        .bind(timezone)
        .fetch_one(pool)
        .await?;

        Self::row_to_recurring_expense(row)
    }

    /// Pause a recurring expense
    pub async fn pause(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE recurring_expenses
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Resume a recurring expense
    pub async fn resume(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE recurring_expenses
            SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn list_exceptions(
        pool: &PgPool,
        recurring_id: Uuid,
    ) -> Result<Vec<RecurringExceptionRow>, AppError> {
        let rows = sqlx::query_as(
            r#"
            SELECT id, recurring_expense_id, exception_date, reason, created_at
            FROM recurring_expense_exceptions
            WHERE recurring_expense_id = $1
            ORDER BY exception_date ASC
            "#,
        )
        .bind(recurring_id)
        .fetch_all(pool)
        .await?;

        Ok(rows)
    }

    pub async fn add_exception(
        pool: &PgPool,
        recurring_id: Uuid,
        exception_date: NaiveDate,
        reason: Option<String>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO recurring_expense_exceptions (recurring_expense_id, exception_date, reason)
            VALUES ($1, $2, $3)
            ON CONFLICT (recurring_expense_id, exception_date) DO NOTHING
            "#,
        )
        .bind(recurring_id)
        .bind(exception_date)
        .bind(reason)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn remove_exception(
        pool: &PgPool,
        recurring_id: Uuid,
        exception_date: NaiveDate,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            DELETE FROM recurring_expense_exceptions
            WHERE recurring_expense_id = $1 AND exception_date = $2
            "#,
        )
        .bind(recurring_id)
        .bind(exception_date)
        .execute(pool)
        .await?;

        Ok(())
    }

    #[allow(dead_code)]
    pub async fn has_exception(
        pool: &PgPool,
        recurring_id: Uuid,
        exception_date: NaiveDate,
    ) -> Result<bool, AppError> {
        let exists: Option<bool> = sqlx::query_scalar(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM recurring_expense_exceptions
                WHERE recurring_expense_id = $1 AND exception_date = $2
            )
            "#,
        )
        .bind(recurring_id)
        .bind(exception_date)
        .fetch_one(pool)
        .await?;

        Ok(exists.unwrap_or(false))
    }

    /// Skip next occurrence (move next_run forward)
    pub async fn skip_next(
        pool: &PgPool,
        id: Uuid,
        new_next_run: DateTime<Utc>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE recurring_expenses
            SET next_run = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(new_next_run)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Update next_run and last_run after execution
    #[allow(dead_code)]
    pub async fn mark_executed(
        tx: &mut Transaction<'_, Postgres>,
        id: Uuid,
        executed_at: DateTime<Utc>,
        new_next_run: DateTime<Utc>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE recurring_expenses
            SET 
                last_run = $2,
                next_run = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(executed_at)
        .bind(new_next_run)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    /// Delete a recurring expense
    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            DELETE FROM recurring_expenses
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Create a snapshot of the recurring expense configuration
    #[allow(dead_code)]
    pub async fn create_snapshot(
        tx: &mut Transaction<'_, Postgres>,
        recurring_expense_id: Uuid,
        snapshot: RecurringExpenseSnapshot,
    ) -> Result<RecurringExpenseSnapshotRow, AppError> {
        let snapshot_json = serde_json::to_value(&snapshot).map_err(|e| AppError::Validation {
            field: "snapshot".to_string(),
            message: format!("Failed to serialize snapshot: {}", e),
        })?;

        let row = sqlx::query(
            r#"
            INSERT INTO recurring_expense_snapshots (recurring_expense_id, snapshot_data)
            VALUES ($1, $2)
            RETURNING id, recurring_expense_id, snapshot_data, created_at
            "#,
        )
        .bind(recurring_expense_id)
        .bind(&snapshot_json)
        .fetch_one(&mut **tx)
        .await?;

        Ok(RecurringExpenseSnapshotRow {
            id: row.get("id"),
            recurring_expense_id: row.get("recurring_expense_id"),
            snapshot_data: row.get("snapshot_data"),
            created_at: row.get("created_at"),
        })
    }

    /// Get all snapshots for a recurring expense
    #[allow(dead_code)]
    pub async fn get_snapshots(
        pool: &PgPool,
        recurring_expense_id: Uuid,
    ) -> Result<Vec<RecurringExpenseSnapshotRow>, AppError> {
        let rows = sqlx::query(
            r#"
            SELECT id, recurring_expense_id, snapshot_data, created_at
            FROM recurring_expense_snapshots
            WHERE recurring_expense_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(recurring_expense_id)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| RecurringExpenseSnapshotRow {
                id: row.get("id"),
                recurring_expense_id: row.get("recurring_expense_id"),
                snapshot_data: row.get("snapshot_data"),
                created_at: row.get("created_at"),
            })
            .collect())
    }

    /// Helper to convert a database row to RecurringExpense
    fn row_to_recurring_expense(row: sqlx::postgres::PgRow) -> Result<RecurringExpense, AppError> {
        let frequency_str: String = row.get("frequency_str");
        let frequency = match frequency_str.as_str() {
            "DAILY" => RecurringFrequency::Daily,
            "WEEKLY" => RecurringFrequency::Weekly,
            "MONTHLY" => RecurringFrequency::Monthly,
            _ => {
                return Err(AppError::Validation {
                    field: "frequency".to_string(),
                    message: format!("Invalid frequency: {}", frequency_str),
                })
            }
        };

        Ok(RecurringExpense {
            id: row.get("id"),
            session_id: row.get("session_id"),
            name: row.get("name"),
            description: row.get("description"),
            amount: row
                .get::<sqlx::types::Decimal, _>("amount")
                .to_string()
                .parse()
                .unwrap_or(0.0),
            currency_code: row.get("currency_code"),
            category_id: row.get("category_id"),
            split_strategy: row.get("split_strategy"),
            frequency,
            interval_count: row.get("interval_count"),
            start_date: row.get("start_date"),
            end_date: row.get("end_date"),
            next_run: row.get("next_run"),
            last_run: row.get("last_run"),
            timezone: row.get("timezone"),
            is_active: row.get("is_active"),
            created_by: row.get("created_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }
}
