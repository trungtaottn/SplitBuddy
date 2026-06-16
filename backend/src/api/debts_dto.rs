use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::domain::debt::DebtStatus;

#[derive(Serialize)]
pub struct DebtSummaryResponse {
    pub i_owe: Vec<DebtItemResponse>,
    pub owed_to_me: Vec<DebtItemResponse>,
    pub total_i_owe: String,
    pub total_owed_to_me: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct DebtItemResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub session_name: String,
    pub counterpart_id: Uuid,
    pub counterpart_user_id: Option<Uuid>,
    pub counterpart_name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub status: DebtStatus,
    pub is_guest: bool,
    pub counterpart_bank_name: Option<String>,
    pub counterpart_account_number: Option<String>,
    pub counterpart_account_holder_name: Option<String>,
    pub counterpart_qr_image_url: Option<String>,
}

#[derive(Serialize)]
pub struct SettleResponse {
    pub debt_id: Uuid,
    pub status: DebtStatus,
    pub message: String,
}

#[derive(Serialize)]
pub struct SessionDebtResponse {
    pub session_id: Uuid,
    pub session_name: String,
    pub session_date: chrono::NaiveDate,
    pub participants: Vec<ParticipantDebtResponse>,
}

#[derive(Serialize)]
pub struct ParticipantDebtResponse {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_paid: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_owed: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}
