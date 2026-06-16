use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::domain::session::{ParticipantRole, SessionStatus};

#[derive(Serialize)]
pub struct SessionResponse {
    pub id: Uuid,
    pub name: String,
    pub location: Option<String>,
    pub status: SessionStatus,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub session_date: chrono::NaiveDate,
    pub participant_count: i64,
    pub total_amount: Decimal,
    pub base_currency: String,
    pub minimize_debts: bool,
    pub timezone: String,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
    pub participants: Vec<ParticipantBasicInfo>,
    pub my_debt: Decimal,
    pub my_owed: Decimal,
    pub settled_amount: Decimal,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ParticipantBasicInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar_url: Option<String>,
}

#[derive(Serialize)]
pub struct SessionDetailResponse {
    pub id: Uuid,
    pub name: String,
    pub location: Option<String>,
    pub status: SessionStatus,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub session_date: chrono::NaiveDate,
    pub participants: Vec<ParticipantResponse>,
    pub total_amount: Decimal,
    pub group_id: Option<Uuid>,
    pub base_currency: String,
    pub minimize_debts: bool,
    pub timezone: String,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParticipantResponse {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
    pub display_name: String,
    pub role: ParticipantRole,
    pub joined_at: chrono::DateTime<chrono::Utc>,
    pub default_weight: i32,
    pub is_active: bool,
}

#[derive(Deserialize, Validate)]
pub struct CreateSessionRequest {
    #[validate(length(
        min = 1,
        max = 200,
        message = "Session name must be between 1 and 200 characters"
    ))]
    pub name: String,
    #[validate(length(max = 500, message = "Location must be less than 500 characters"))]
    pub location: Option<String>,
    pub session_date: Option<chrono::NaiveDate>,
    pub group_id: Option<Uuid>,
    pub participant_ids: Option<Vec<Uuid>>,
    #[validate(length(max = 10, message = "Maximum 10 guest names allowed"))]
    pub guest_names: Option<Vec<String>>,
    pub base_currency: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMinimizeDebtsRequest {
    pub minimize_debts: bool,
}

#[derive(Deserialize)]
pub struct BulkArchiveRequest {
    pub session_ids: Vec<Uuid>,
}

#[derive(Serialize)]
pub struct BulkArchiveResponse {
    pub archived_ids: Vec<Uuid>,
    pub skipped_ids: Vec<Uuid>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct BillResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_original: Decimal,
    pub currency_code: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub exchange_rate: Decimal,
    pub rate_source: String,
    pub rate_timestamp: chrono::DateTime<chrono::Utc>,
    pub split_strategy: String,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct BillDetailResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_original: Decimal,
    pub currency_code: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub exchange_rate: Decimal,
    pub rate_source: String,
    pub rate_timestamp: chrono::DateTime<chrono::Utc>,
    pub split_strategy: String,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub payers: Vec<BillPayerInfo>,
    pub participants: Vec<BillParticipantInfo>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct BillPayerInfo {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_paid: Decimal,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct BillParticipantInfo {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_owed: Decimal,
}

#[derive(Deserialize, Clone)]
pub struct SplitDetailInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

#[derive(Deserialize, Serialize)]
pub struct PayerInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

#[derive(Deserialize, Default)]
pub struct SessionQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub from: Option<chrono::NaiveDate>,
    pub to: Option<chrono::NaiveDate>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub include_archived: bool,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    10
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    pub data: T,
    pub meta: PaginationMeta,
}

#[derive(Serialize)]
pub struct PaginationMeta {
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

#[derive(Deserialize)]
pub struct ImportCsvRequest {
    pub csv: String,
}

#[derive(Serialize)]
pub struct ImportRowError {
    pub row: usize,
    pub field: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct ImportPreviewRow {
    pub row: usize,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub currency_code: String,
    pub split_strategy: String,
    pub payers: Vec<String>,
    pub participants: Vec<String>,
}

#[derive(Serialize)]
pub struct ImportPreviewResponse {
    pub total_rows: usize,
    pub valid_rows: usize,
    pub errors: Vec<ImportRowError>,
    pub rows: Vec<ImportPreviewRow>,
}

#[derive(Serialize)]
pub struct ImportResultResponse {
    pub created_count: usize,
    pub errors: Vec<ImportRowError>,
}

#[derive(Serialize)]
pub struct WhoPaysNextResponse {
    pub suggested: Option<ParticipantBalance>,
    pub balances: Vec<ParticipantBalance>,
}

#[derive(Serialize, Clone)]
pub struct ParticipantBalance {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_paid: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_owed: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn session_query_uses_stable_pagination_defaults() -> Result<(), serde_json::Error> {
        let query: SessionQuery = serde_json::from_value(json!({}))?;

        assert_eq!(query.page, 1);
        assert_eq!(query.limit, 10);
        assert!(!query.include_archived);
        Ok(())
    }

    #[test]
    fn money_inputs_deserialize_decimal_strings() -> Result<(), serde_json::Error> {
        let participant_id = Uuid::new_v4();
        let payer: PayerInput = serde_json::from_value(json!({
            "participant_id": participant_id,
            "amount": "12345.67"
        }))?;
        let split: SplitDetailInput = serde_json::from_value(json!({
            "participant_id": participant_id,
            "amount": "12345.67"
        }))?;

        assert_eq!(payer.amount, Decimal::new(1_234_567, 2));
        assert_eq!(split.amount, Decimal::new(1_234_567, 2));
        Ok(())
    }
}
