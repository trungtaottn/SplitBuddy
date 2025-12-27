use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "split_strategy", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SplitStrategy {
    Equal,
    Custom,
    Weighted,
}

impl Default for SplitStrategy {
    fn default() -> Self {
        Self::Equal
    }
}

impl TryFrom<&str> for SplitStrategy {
    type Error = AppError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.to_uppercase().as_str() {
            "EQUAL" => Ok(Self::Equal),
            "CUSTOM" => Ok(Self::Custom),
            "WEIGHTED" => Ok(Self::Weighted),
            _ => Err(AppError::Validation {
                field: "split_strategy".to_string(),
                message: format!("Invalid split strategy: {}", value),
            }),
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Bill {
    pub id: Uuid,
    pub session_id: Uuid,
    pub description: String,
    pub amount: Decimal,
    pub split_strategy: SplitStrategy,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
}

impl Bill {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.amount <= Decimal::ZERO {
            return Err(AppError::InvalidBillAmount {
                amount: self.amount,
            });
        }
        Ok(())
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct BillPayer {
    pub id: Uuid,
    pub bill_id: Uuid,
    pub participant_id: Uuid,
    pub amount_paid: Decimal,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct BillSplit {
    pub id: Uuid,
    pub bill_id: Uuid,
    pub participant_id: Uuid,
    pub amount_owed: Decimal,
}
