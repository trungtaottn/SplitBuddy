use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use super::{PayerInput, SplitDetailInput};

#[derive(Deserialize, Validate)]
pub struct CreateBillRequest {
    #[validate(length(
        min = 1,
        max = 500,
        message = "Description must be between 1 and 500 characters"
    ))]
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
    pub currency_code: Option<String>,
    #[serde(default, with = "rust_decimal::serde::str_option")]
    pub exchange_rate: Option<Decimal>,
    #[validate(length(min = 1, message = "At least one payer is required"))]
    pub payers: Vec<PayerInput>,
    #[serde(default = "default_split_strategy")]
    pub split_strategy: String,
    pub split_details: Option<Vec<SplitDetailInput>>,
    pub category_id: Option<Uuid>,
}

fn default_split_strategy() -> String {
    "EQUAL".to_string()
}

#[derive(Deserialize)]
pub struct UpdateBillRequest {
    pub description: Option<String>,
    #[serde(default, with = "rust_decimal::serde::str_option")]
    pub total_amount: Option<Decimal>,
    pub currency_code: Option<String>,
    #[serde(default, with = "rust_decimal::serde::str_option")]
    pub exchange_rate: Option<Decimal>,
    pub split_strategy: Option<String>,
    pub payers: Option<Vec<PayerInput>>,
    pub split_details: Option<Vec<SplitDetailInput>>,
    pub category_id: Option<Uuid>,
    pub receipt_url: Option<String>,
}
