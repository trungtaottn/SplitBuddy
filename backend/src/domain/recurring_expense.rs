use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use std::collections::HashMap;

/// Frequency for recurring expenses
#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "recurring_frequency", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RecurringFrequency {
    Daily,
    Weekly,
    Monthly,
}

impl RecurringFrequency {
    /// Convert to chrono duration for simple calculations
    #[allow(dead_code)]
    pub fn to_days(self) -> i64 {
        match self {
            RecurringFrequency::Daily => 1,
            RecurringFrequency::Weekly => 7,
            RecurringFrequency::Monthly => 30, // Approximate, will be refined with timezone logic
        }
    }
}

/// Snapshot data structure stored in JSONB
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct RecurringExpenseSnapshot {
    /// Participant ID -> weight mapping (for WEIGHTED)
    pub participant_weights: Option<HashMap<Uuid, i32>>,
    /// Participant ID -> custom amount (for CUSTOM)
    pub custom_amounts: Option<HashMap<Uuid, f64>>,
    /// List of active participant IDs at execution time
    pub active_participants: Vec<Uuid>,
    /// Session state snapshot
    pub session_name: String,
    pub session_currency: String,
}

/// Domain model for recurring expense
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecurringExpense {
    pub id: Uuid,
    pub session_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub amount: f64,
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

impl RecurringExpense {
    /// Check if the recurring expense should run now
    #[allow(dead_code)]
    pub fn should_run_now(&self) -> bool {
        self.is_active && self.next_run <= Utc::now()
    }

    /// Check if the recurring expense has expired
    #[allow(dead_code)]
    pub fn is_expired(&self) -> bool {
        if let Some(end_date) = self.end_date {
            let end_datetime = end_date
                .and_hms_opt(23, 59, 59)
                .unwrap()
                .and_local_timezone(Utc)
                .unwrap();
            Utc::now() > end_datetime
        } else {
            false
        }
    }

    /// Validate the recurring expense configuration
    #[allow(dead_code)]
    pub fn validate(&self) -> Result<(), String> {
        if self.amount <= 0.0 {
            return Err("Amount must be positive".to_string());
        }
        if self.interval_count <= 0 {
            return Err("Interval count must be positive".to_string());
        }
        if let Some(end_date) = self.end_date {
            if end_date < self.start_date {
                return Err("End date must be after start date".to_string());
            }
        }
        Ok(())
    }
}

/// Database row structure for recurring expense snapshots
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct RecurringExpenseSnapshotRow {
    pub id: Uuid,
    pub recurring_expense_id: Uuid,
    pub snapshot_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

/// Business logic for calculating next run time
pub mod scheduler {
    use super::*;
    use chrono::{Datelike, Duration, TimeZone, Timelike};
    use chrono_tz::Tz;

    /// Calculate the next run time based on frequency, interval, and timezone
    pub fn calculate_next_run(
        last_run: DateTime<Utc>,
        frequency: RecurringFrequency,
        interval_count: i32,
        timezone_str: &str,
    ) -> Result<DateTime<Utc>, String> {
        let tz: Tz = timezone_str
            .parse()
            .map_err(|_| format!("Invalid timezone: {}", timezone_str))?;

        let last_run_local = last_run.with_timezone(&tz);

        let next_run_local = match frequency {
            RecurringFrequency::Daily => last_run_local + Duration::days(interval_count as i64),
            RecurringFrequency::Weekly => last_run_local + Duration::weeks(interval_count as i64),
            RecurringFrequency::Monthly => {
                // Add months while preserving day-of-month (or clamping to month end)
                let mut year = last_run_local.year();
                let mut month = last_run_local.month() as i32;
                let day = last_run_local.day();

                month += interval_count;
                while month > 12 {
                    month -= 12;
                    year += 1;
                }
                while month < 1 {
                    month += 12;
                    year -= 1;
                }

                // Clamp day to valid range for the target month
                let max_day = days_in_month(year, month as u32);
                let clamped_day = day.min(max_day);

                tz.with_ymd_and_hms(
                    year,
                    month as u32,
                    clamped_day,
                    last_run_local.hour(),
                    last_run_local.minute(),
                    0,
                )
                .single()
                .ok_or_else(|| "Failed to calculate next monthly run".to_string())?
            }
        };

        Ok(next_run_local.with_timezone(&Utc))
    }

    /// Helper: get number of days in a month
    fn days_in_month(year: i32, month: u32) -> u32 {
        match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => {
                if is_leap_year(year) {
                    29
                } else {
                    28
                }
            }
            _ => 30,
        }
    }

    fn is_leap_year(year: i32) -> bool {
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::recurring_expense::scheduler::calculate_next_run;
    use chrono::TimeZone;

    #[test]
    fn test_should_run_now() {
        let mut expense = RecurringExpense {
            id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
            name: "Test".to_string(),
            description: None,
            amount: 100.0,
            currency_code: "VND".to_string(),
            category_id: None,
            split_strategy: "EQUAL".to_string(),
            frequency: RecurringFrequency::Daily,
            interval_count: 1,
            start_date: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
            end_date: None,
            next_run: Utc::now() - chrono::Duration::hours(1),
            last_run: None,
            timezone: "UTC".to_string(),
            is_active: true,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert!(expense.should_run_now());

        expense.is_active = false;
        assert!(!expense.should_run_now());
    }

    #[test]
    fn test_validate() {
        let expense = RecurringExpense {
            id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
            name: "Test".to_string(),
            description: None,
            amount: -100.0,
            currency_code: "VND".to_string(),
            category_id: None,
            split_strategy: "EQUAL".to_string(),
            frequency: RecurringFrequency::Daily,
            interval_count: 1,
            start_date: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
            end_date: None,
            next_run: Utc::now(),
            last_run: None,
            timezone: "UTC".to_string(),
            is_active: true,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert!(expense.validate().is_err());
    }

    #[test]
    fn test_calculate_next_run_daily_utc() {
        let last_run = Utc.with_ymd_and_hms(2026, 1, 1, 10, 0, 0).unwrap();
        let next = calculate_next_run(last_run, RecurringFrequency::Daily, 1, "UTC").unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 1, 2, 10, 0, 0).unwrap());
    }

    #[test]
    fn test_calculate_next_run_weekly_utc() {
        let last_run = Utc.with_ymd_and_hms(2026, 1, 1, 10, 0, 0).unwrap();
        let next = calculate_next_run(last_run, RecurringFrequency::Weekly, 2, "UTC").unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 1, 15, 10, 0, 0).unwrap());
    }

    #[test]
    fn test_calculate_next_run_monthly_clamp_leap_year() {
        let last_run = Utc.with_ymd_and_hms(2024, 1, 31, 8, 0, 0).unwrap();
        let next = calculate_next_run(last_run, RecurringFrequency::Monthly, 1, "UTC").unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2024, 2, 29, 8, 0, 0).unwrap());
    }

    #[test]
    fn test_calculate_next_run_monthly_clamp_non_leap_year() {
        let last_run = Utc.with_ymd_and_hms(2023, 1, 31, 8, 0, 0).unwrap();
        let next = calculate_next_run(last_run, RecurringFrequency::Monthly, 1, "UTC").unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2023, 2, 28, 8, 0, 0).unwrap());
    }

    #[test]
    fn test_calculate_next_run_timezone() {
        // Represent 2026-01-01 00:00 in Asia/Ho_Chi_Minh (UTC+7)
        let last_run = Utc.with_ymd_and_hms(2025, 12, 31, 17, 0, 0).unwrap();
        let next =
            calculate_next_run(last_run, RecurringFrequency::Daily, 1, "Asia/Ho_Chi_Minh").unwrap();
        // 2026-01-02 00:00 in Asia/Ho_Chi_Minh is 2026-01-01 17:00 UTC
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 1, 1, 17, 0, 0).unwrap());
    }

    #[test]
    fn test_calculate_next_run_invalid_timezone() {
        let last_run = Utc.with_ymd_and_hms(2026, 1, 1, 10, 0, 0).unwrap();
        let err = calculate_next_run(last_run, RecurringFrequency::Daily, 1, "Mars/Phobos")
            .err()
            .unwrap();
        assert!(err.contains("Invalid timezone"));
    }
}
