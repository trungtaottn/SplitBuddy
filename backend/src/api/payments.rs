use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::api::response::ok;
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use base64::{engine::general_purpose, Engine as _};

pub fn routes() -> Router<AppState> {
    Router::new().route("/qr", get(generate_qr))
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

/// Generate VietQR code for payment
/// Follows NAPAS VietQR standard
#[utoipa::path(
    get,
    path = "/api/payments/qr",
    tag = "payments",
    params(
        ("amount" = String, Query, description = "Amount to pay (in VND)"),
        ("note" = Option<String>, Query, description = "Payment note/description")
    ),
    responses(
        (status = 200, description = "QR code generated", body = QrResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "No bank account found")
    ),
    security(
        ("bearerAuth" = [])
    )
)]
pub async fn generate_qr(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(params): Query<GenerateQrRequest>,
) -> Result<Json<ApiResponse<QrResponse>>, AppError> {
    // Get user's default bank account
    #[derive(sqlx::FromRow)]
    struct BankAccount {
        bank_name: String,
        account_number: String,
        account_holder_name: String,
    }

    let account: Option<BankAccount> = sqlx::query_as(
        r#"
        SELECT bank_name, account_number, account_holder_name
        FROM user_bank_accounts
        WHERE user_id = $1 AND is_default = true
        LIMIT 1
        "#,
    )
    .bind(auth_user.user_id)
    .fetch_optional(&state.pool)
    .await?;

    let account = account.ok_or(AppError::Validation {
        field: "bank_account".to_string(),
        message: "No default bank account found. Please add a bank account in your profile."
            .to_string(),
    })?;

    // Parse amount
    let amount = params
        .amount
        .parse::<u64>()
        .map_err(|_| AppError::Validation {
            field: "amount".to_string(),
            message: "Invalid amount format".to_string(),
        })?;

    // Generate VietQR string according to NAPAS standard
    // Format: 0002010102123857... (EMV QR Code format)
    let qr_data = generate_vietqr_string(
        &account.account_number,
        &account.account_holder_name,
        amount,
        params.note.as_deref(),
    );

    // Generate QR code image (base64 encoded PNG)
    let qr_image = generate_qr_image(&qr_data)?;

    Ok(ok(QrResponse {
        qr_data,
        qr_image,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_holder: account.account_holder_name,
    }))
}

/// Generate VietQR string according to NAPAS standard
/// Simplified version - in production, use a proper VietQR library
fn generate_vietqr_string(
    account_number: &str,
    _account_holder: &str,
    amount: u64,
    note: Option<&str>,
) -> String {
    // VietQR format (simplified):
    // 00 - Payload Format Indicator
    // 01 - Point of Initiation Method
    // 38 - Merchant Account Information (VietQR)
    // 52 - Merchant Category Code
    // 53 - Transaction Currency (704 = VND)
    // 54 - Transaction Amount
    // 58 - Country Code (VN)
    // 62 - Additional Data Field Template

    let mut qr = String::new();

    // Payload Format Indicator (00)
    qr.push_str("000201");

    // Point of Initiation Method (01) - 11 = static, 12 = dynamic
    qr.push_str("010212");

    // Merchant Account Information (38) - VietQR
    let merchant_info = format!(
        "0010A00000072701{}02{}",
        account_number.len(),
        account_number
    );
    qr.push_str(&format!("38{:02}{}", merchant_info.len(), merchant_info));

    // Merchant Category Code (52) - 0000 = default
    qr.push_str("52040000");

    // Transaction Currency (53) - 704 = VND
    qr.push_str("5303704");

    // Transaction Amount (54)
    if amount > 0 {
        let amount_str = amount.to_string();
        qr.push_str(&format!("54{:02}{}", amount_str.len(), amount_str));
    }

    // Country Code (58) - VN
    qr.push_str("5802VN");

    // Additional Data Field Template (62)
    let mut additional_data = String::new();

    // Payment note (08)
    if let Some(note) = note {
        let note_utf8 = note;
        additional_data.push_str(&format!("08{:02}{}", note_utf8.len(), note_utf8));
    }

    if !additional_data.is_empty() {
        qr.push_str(&format!(
            "62{:02}{}",
            additional_data.len(),
            additional_data
        ));
    }

    // CRC (63) - placeholder, should be calculated
    qr.push_str("6304");

    qr
}

/// Generate QR code image as base64 PNG
fn generate_qr_image(_data: &str) -> Result<String, AppError> {
    // For now, return a placeholder
    // In production, use qrcode crate to generate actual QR code
    // Example:
    // use qrcode::QrCode;
    // use qrcode::render::svg;
    // let code = QrCode::new(data)?;
    // let image = code.render::<svg::Color>().build();
    // Then convert to base64 PNG

    // Placeholder - return data URI format
    Ok(format!("data:image/svg+xml;base64,{}", general_purpose::STANDARD.encode(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><text x="100" y="100" text-anchor="middle">QR Code</text></svg>"#
    )))
}
