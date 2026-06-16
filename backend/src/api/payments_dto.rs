use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Deserialize, ToSchema)]
pub struct CreatePaymentRequest {
    pub payee_id: Uuid,
    pub amount: Decimal,
    pub currency: Option<String>,
    pub method: Option<String>,
    pub proof_image_url: Option<String>,
    pub reference_code: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct PaymentResponse {
    pub id: Uuid,
    pub payer_id: Uuid,
    pub payee_id: Uuid,
    pub amount: Decimal,
    pub currency: String,
    pub status: String,
    pub method: String,
    pub proof_image_url: Option<String>,
    pub reference_code: Option<String>,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct ListPaymentParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize, ToSchema)]
pub struct GenerateQrRequest {
    #[schema(example = "100000")]
    pub amount: String,
    #[schema(example = "Thanh toan no")]
    pub note: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct QrResponse {
    #[schema(
        example = "00020101021238570010A00000072701270006A00000072701280006A00000072701300104VNQR5204000053037045802VN62080703***6304"
    )]
    pub qr_data: String,
    #[schema(example = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")]
    pub qr_image: String,
    #[schema(example = "VietcomBank")]
    pub bank_name: String,
    #[schema(example = "1234567890")]
    pub account_number: String,
    #[schema(example = "NGUYEN VAN A")]
    pub account_holder: String,
}
