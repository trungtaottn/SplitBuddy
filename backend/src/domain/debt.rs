#![allow(dead_code)]
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Default)]
#[sqlx(type_name = "debt_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum DebtStatus {
    #[default]
    Pending,
    SettlementRequested,
    Settled,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Debt {
    pub id: Uuid,
    pub session_id: Uuid,
    pub debtor_id: Uuid,
    pub creditor_id: Uuid,
    pub amount: Decimal,
    pub status: DebtStatus,
    pub created_at: DateTime<Utc>,
    pub settled_at: Option<DateTime<Utc>>,
}

impl Debt {
    pub fn is_settled(&self) -> bool {
        self.status == DebtStatus::Settled
    }

    pub fn can_request_settlement(&self) -> bool {
        self.status == DebtStatus::Pending
    }

    pub fn can_confirm_settlement(&self) -> bool {
        self.status == DebtStatus::SettlementRequested
    }
}
