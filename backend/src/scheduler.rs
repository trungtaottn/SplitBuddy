use chrono::Utc;
use rust_decimal::Decimal;
use sqlx::PgPool;
use std::str::FromStr;
use std::time::Duration;
use uuid::Uuid;

use crate::api::sessions::{PayerInput, SplitDetailInput};
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::domain::recurring_expense::scheduler::calculate_next_run;
use crate::domain::recurring_expense::RecurringFrequency;
use crate::error::AppError;
use crate::repository::recurring_expense_repo::RecurringExpenseRepository;
use crate::repository::session_repo::SessionRepository;
use crate::utils::forex::normalize_currency;

/// Background scheduler that processes recurring expenses
pub struct RecurringExpenseScheduler {
    pool: PgPool,
    interval: Duration,
}

impl RecurringExpenseScheduler {
    pub fn new(pool: PgPool, interval_seconds: u64) -> Self {
        Self {
            pool,
            interval: Duration::from_secs(interval_seconds),
        }
    }

    /// Start the scheduler in a background task
    pub fn spawn(self) {
        tokio::spawn(async move {
            tracing::info!(
                "Recurring expense scheduler started (interval: {}s)",
                self.interval.as_secs()
            );

            loop {
                tokio::time::sleep(self.interval).await;

                match self.process_due_expenses().await {
                    Ok(count) => {
                        if count > 0 {
                            tracing::info!(
                                "Recurring expense scheduler: processed {} expenses",
                                count
                            );
                        }
                    }
                    Err(e) => {
                        tracing::error!("Recurring expense scheduler error: {:?}", e);
                    }
                }
            }
        });
    }

    /// Process all due recurring expenses
    async fn process_due_expenses(&self) -> Result<usize, AppError> {
        let now = Utc::now();

        // Find all active recurring expenses that are due
        let due_expenses = RecurringExpenseRepository::find_due_expenses(&self.pool, now).await?;

        let mut processed_count = 0;

        for expense in due_expenses {
            // Process each expense in isolation with error handling
            match self.process_single_expense(&expense.id).await {
                Ok(true) => {
                    processed_count += 1;
                    tracing::info!(
                        "Successfully executed recurring expense: {} ({})",
                        expense.name,
                        expense.id
                    );
                }
                Ok(false) => {
                    // Already processed (idempotency check), skip
                    tracing::debug!(
                        "Skipped already-processed recurring expense: {}",
                        expense.id
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to execute recurring expense {} ({}): {:?}",
                        expense.name,
                        expense.id,
                        e
                    );
                    // Continue processing other expenses even if one fails
                }
            }
        }

        Ok(processed_count)
    }

    /// Process a single recurring expense with idempotency
    /// Returns Ok(true) if processed, Ok(false) if already processed, Err on failure
    async fn process_single_expense(&self, recurring_id: &Uuid) -> Result<bool, AppError> {
        // For logging within transaction errors, we need access to http_client
        // Since scheduler doesn't have it, we'll skip external forex calls
        // and use exchange_rate = 1.0 when same currency or stored rate
        // Use a transaction for atomicity
        let mut tx = self.pool.begin().await?;

        #[derive(sqlx::FromRow)]
        struct RecurringExpenseRow {
            id: Uuid,
            session_id: Uuid,
            name: String,
            description: Option<String>,
            amount: f64,
            currency_code: String,
            category_id: Option<Uuid>,
            split_strategy: String,
            frequency: String,
            interval_count: i32,
            next_run: chrono::DateTime<Utc>,
            last_run: Option<chrono::DateTime<Utc>>,
            end_date: Option<chrono::DateTime<Utc>>,
            timezone: String,
            is_active: bool,
        }

        // Re-fetch the expense within the transaction with FOR UPDATE lock
        let expense_opt: Option<RecurringExpenseRow> = sqlx::query_as(
            r#"
            SELECT 
                id, session_id, name, description, amount, currency_code,
                category_id, split_strategy, frequency, interval_count,
                next_run, last_run, end_date, timezone, is_active
            FROM recurring_expenses
            WHERE id = $1 AND is_active = true
            FOR UPDATE
            "#,
        )
        .bind(recurring_id)
        .fetch_optional(&mut *tx)
        .await?;

        let expense = match expense_opt {
            Some(e) => e,
            None => {
                // Expense doesn't exist or is inactive
                tx.rollback().await?;
                return Ok(false);
            }
        };

        let RecurringExpenseRow {
            id,
            session_id,
            name,
            description,
            amount,
            currency_code,
            category_id,
            split_strategy,
            frequency,
            interval_count,
            next_run,
            last_run: _last_run,
            end_date,
            timezone,
            is_active: _is_active,
        } = expense;

        let frequency_enum = match frequency.to_uppercase().as_str() {
            "DAILY" => RecurringFrequency::Daily,
            "WEEKLY" => RecurringFrequency::Weekly,
            "MONTHLY" => RecurringFrequency::Monthly,
            _ => {
                return Err(AppError::Validation {
                    field: "frequency".to_string(),
                    message: format!("Invalid frequency: {}", frequency),
                });
            }
        };

        // Check if it's actually due (double-check under lock)
        if next_run > Utc::now() {
            tx.rollback().await?;
            return Ok(false);
        }

        // Skip if this occurrence matches an exception date (local timezone)
        if let Ok(tz) = timezone.parse::<chrono_tz::Tz>() {
            let local_date = next_run.with_timezone(&tz).date_naive();
            let has_exception: Option<bool> = sqlx::query_scalar(
                r#"
                SELECT EXISTS(
                    SELECT 1 FROM recurring_expense_exceptions
                    WHERE recurring_expense_id = $1 AND exception_date = $2
                )
                "#,
            )
            .bind(id)
            .bind(local_date)
            .fetch_one(&mut *tx)
            .await?;

            if has_exception.unwrap_or(false) {
                let new_next_run =
                    calculate_next_run(next_run, frequency_enum, interval_count, &timezone)
                        .map_err(|e| AppError::Validation {
                            field: "next_run".to_string(),
                            message: format!("Failed to calculate next run: {}", e),
                        })?;

                sqlx::query(
                    r#"
                    UPDATE recurring_expenses
                    SET next_run = $1
                    WHERE id = $2
                    "#,
                )
                .bind(new_next_run)
                .bind(id)
                .execute(&mut *tx)
                .await?;

                sqlx::query(
                    r#"
                    DELETE FROM recurring_expense_exceptions
                    WHERE recurring_expense_id = $1 AND exception_date = $2
                    "#,
                )
                .bind(id)
                .bind(local_date)
                .execute(&mut *tx)
                .await?;

                tx.commit().await?;
                return Ok(false);
            }
        }

        // Check if end_date has passed
        if let Some(end) = end_date {
            if Utc::now() > end {
                // Deactivate expired recurring expense
                sqlx::query("UPDATE recurring_expenses SET is_active = false WHERE id = $1")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?;

                tx.commit().await?;

                tracing::info!("Deactivated expired recurring expense: {} ({})", name, id);
                return Ok(false);
            }
        }

        // Idempotency check: has this specific next_run already been executed?
        let already_executed: Option<bool> = sqlx::query_scalar(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM recurring_expense_snapshots
                WHERE recurring_expense_id = $1 
                AND executed_at >= $2 
                AND executed_at < $3
            )
            "#,
        )
        .bind(id)
        .bind(next_run - chrono::Duration::minutes(5)) // 5-minute window before
        .bind(next_run + chrono::Duration::minutes(5)) // 5-minute window after
        .fetch_one(&mut *tx)
        .await?;

        if already_executed.unwrap_or(false) {
            // Already executed this occurrence
            tx.rollback().await?;
            return Ok(false);
        }

        // Get all active participants for this session
        let participants: Vec<(Uuid, String, i32, bool)> = sqlx::query_as(
            "SELECT participant_id, guest_name, default_weight, is_active 
             FROM session_participants 
             WHERE session_id = $1 AND is_active = true
             ORDER BY guest_name",
        )
        .bind(session_id)
        .fetch_all(&mut *tx)
        .await?;

        if participants.is_empty() {
            tracing::error!(
                "No active participants found for session {} when processing recurring expense {}",
                session_id,
                id
            );
            tx.rollback().await?;
            return Err(AppError::Validation {
                field: "session".to_string(),
                message: "No active participants in session".to_string(),
            });
        }

        // Get session details
        let (session_name, base_currency): (String, String) =
            sqlx::query_as("SELECT name, currency_code FROM sessions WHERE id = $1")
                .bind(session_id)
                .fetch_one(&mut *tx)
                .await?;

        // Normalize currencies
        let normalized_currency = normalize_currency(&currency_code)?;
        let normalized_base = normalize_currency(&base_currency)?;
        if normalized_currency != normalized_base {
            tracing::warn!(
                "Recurring expense currency {} differs from session base {}; using base currency",
                normalized_currency,
                normalized_base
            );
        }

        // For scheduler, use exchange_rate = 1.0 (same currency assumed)
        let exchange_rate = Decimal::from_str("1.0").unwrap();
        let amount_decimal = Decimal::from_str(&amount.to_string()).unwrap_or(Decimal::ZERO);

        // Create payers (split equally among all active participants by default)
        let payer_share = amount_decimal / Decimal::from(participants.len() as i64);
        let payers: Vec<PayerInput> = participants
            .iter()
            .map(|(participant_id, _, _, _)| PayerInput {
                participant_id: *participant_id,
                amount: payer_share,
            })
            .collect();

        // Resolve effective split strategy
        let split_strategy_effective = if split_strategy.to_uppercase() == "CUSTOM" {
            tracing::warn!(
                "Recurring expense {} uses CUSTOM split; defaulting to EQUAL",
                id
            );
            "EQUAL".to_string()
        } else {
            split_strategy.clone()
        };

        // For WEIGHTED strategy, create custom split_details based on weights
        let split_details = if split_strategy_effective.to_uppercase() == "WEIGHTED" {
            let total_weight: i32 = participants.iter().map(|(_, _, weight, _)| weight).sum();
            if total_weight <= 0 {
                return Err(AppError::Validation {
                    field: "weights".to_string(),
                    message: "Total participant weights must be > 0".to_string(),
                });
            }

            let weighted_splits: Vec<SplitDetailInput> = participants
                .iter()
                .map(|(participant_id, _, weight, _)| {
                    let share =
                        amount_decimal * Decimal::from(*weight) / Decimal::from(total_weight);
                    SplitDetailInput {
                        participant_id: *participant_id,
                        amount: share,
                    }
                })
                .collect();

            Some(weighted_splits)
        } else {
            None
        };

        // Create the bill
        let session_repo = SessionRepository::new(self.pool.clone());

        // Note: created_by will be the first participant (or we could use a system user)
        let created_by = participants.first().map(|(id, _, _, _)| *id).unwrap();

        let bill_description = description.clone().unwrap_or_else(|| name.clone());

        let bill = session_repo
            .create_bill(
                session_id,
                &bill_description,
                amount_decimal, // amount (in base currency)
                amount_decimal, // amount_original
                &normalized_base,
                exchange_rate,
                "recurring_scheduler", // rate_source
                Utc::now(),            // rate_timestamp
                &split_strategy_effective,
                created_by,
                &payers,
                split_details.as_deref(),
                category_id,
            )
            .await
            .map_err(|e| {
                tracing::error!(
                    "Failed to create bill for recurring expense {}: {:?}",
                    id,
                    e
                );
                e
            })?;
        let bill_id = bill.id;

        // Create notifications for session participants (respect preferences)
        let recipients: Vec<Uuid> = sqlx::query_scalar(
            r#"
            SELECT sp.user_id
            FROM session_participants sp
            LEFT JOIN notification_preferences np ON np.user_id = sp.user_id
            WHERE sp.session_id = $1
              AND sp.user_id IS NOT NULL
              AND sp.is_active = true
              AND COALESCE(np.bill_updates, true) = true
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut *tx)
        .await?;

        let notification_title = "Hóa đơn định kỳ mới".to_string();
        let notification_message = format!(
            "Khoản \"{}\" đã được tạo trong phiên {}",
            bill_description, session_name
        );
        let notification_data = serde_json::json!({
            "session_id": session_id,
            "bill_id": bill_id,
            "recurring_expense_id": id,
        });

        for user_id in recipients {
            let notification_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
                "#,
            )
            .bind(notification_id)
            .bind(user_id)
            .bind("bill_added")
            .bind(&notification_title)
            .bind(&notification_message)
            .bind(&notification_data)
            .execute(&mut *tx)
            .await?;
        }

        // Create snapshot of current configuration
        let snapshot_json = serde_json::json!({
            "recurring_expense_id": id,
            "name": name,
            "description": description,
            "amount": amount,
            "currency_code": currency_code,
            "category_id": category_id,
            "split_strategy": split_strategy,
            "frequency": frequency,
            "interval_count": interval_count,
            "scheduled_for": next_run,
        });

        sqlx::query(
            r#"
            INSERT INTO recurring_expense_snapshots 
            (recurring_expense_id, bill_id, snapshot_data, executed_at)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(id)
        .bind(bill_id)
        .bind(snapshot_json)
        .bind(Utc::now())
        .execute(&mut *tx)
        .await?;

        // Calculate next run time
        let new_next_run = calculate_next_run(next_run, frequency_enum, interval_count, &timezone)
            .map_err(|e| AppError::Validation {
                field: "next_run".to_string(),
                message: format!("Failed to calculate next run: {}", e),
            })?;

        // Update recurring expense: set last_run and next_run
        sqlx::query(
            r#"
            UPDATE recurring_expenses 
            SET last_run = $1, next_run = $2
            WHERE id = $3
            "#,
        )
        .bind(Utc::now())
        .bind(new_next_run)
        .execute(&mut *tx)
        .await?;

        // Audit log (use pool instead of transaction for log)
        // Actually, we should commit first then log, or log before commit
        // For safety, log after commit using pool
        tx.commit().await?;

        // Log audit after successful commit
        AuditLogBuilder::new(
            AuditAction::RecurringExpenseExecute,
            AuditEntityType::RecurringExpense,
        )
        .entity_id(id)
        .metadata(serde_json::json!({
            "bill_id": bill_id,
            "amount": amount,
            "scheduled_for": next_run,
            "executed_at": Utc::now(),
            "next_run": new_next_run,
        }))
        .log(&self.pool)
        .await
        .ok(); // Don't fail if audit log fails

        Ok(true)
    }
}
