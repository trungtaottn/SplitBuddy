use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::api::response::ok;
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::payment_repo::{CreatePaymentDto, PaymentRepository};
use base64::{engine::general_purpose, Engine as _};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/qr", get(generate_qr))
        .route("/", post(create_payment))
        .route("/", get(list_payments))
        .route("/:id", get(get_payment))
}

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

async fn create_payment(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req): Json<CreatePaymentRequest>,
) -> Result<Json<ApiResponse<PaymentResponse>>, AppError> {
    let repo = PaymentRepository::new(state.pool.clone());

    let dto = CreatePaymentDto {
        payer_id: auth_user.user_id,
        payee_id: req.payee_id,
        amount: req.amount,
        currency: req.currency,
        method: req.method,
        proof_image_url: req.proof_image_url,
        reference_code: req.reference_code,
        notes: req.notes,
    };

    let transaction = repo.create_transaction(dto).await?;

    // Create Activity
    let feed_repo = crate::repository::feed_repo::FeedRepository::new(state.pool.clone());
    let _ = feed_repo
        .create_activity(
            auth_user.user_id,
            "payment_sent",
            transaction.id,
            "payment_transaction",
            serde_json::json!({
                 "amount": transaction.amount,
                 "currency": transaction.currency,
                 "method": transaction.method
            }),
        )
        .await;

    Ok(ok(PaymentResponse {
        id: transaction.id,
        payer_id: transaction.payer_id,
        payee_id: transaction.payee_id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        method: transaction.method,
        proof_image_url: transaction.proof_image_url,
        reference_code: transaction.reference_code,
        notes: transaction.notes,
        created_at: transaction.created_at,
    }))
}

async fn list_payments(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(params): Query<ListPaymentParams>,
) -> Result<Json<ApiResponse<Vec<PaymentResponse>>>, AppError> {
    let repo = PaymentRepository::new(state.pool.clone());
    let transactions = repo
        .get_user_transactions(
            auth_user.user_id,
            params.limit.unwrap_or(20),
            params.offset.unwrap_or(0),
        )
        .await?;

    let response = transactions
        .into_iter()
        .map(|t| PaymentResponse {
            id: t.id,
            payer_id: t.payer_id,
            payee_id: t.payee_id,
            amount: t.amount,
            currency: t.currency,
            status: t.status,
            method: t.method,
            proof_image_url: t.proof_image_url,
            reference_code: t.reference_code,
            notes: t.notes,
            created_at: t.created_at,
        })
        .collect();

    Ok(ok(response))
}

async fn get_payment(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<PaymentResponse>>, AppError> {
    let repo = PaymentRepository::new(state.pool.clone());
    let transaction = repo
        .get_transaction(id)
        .await?
        .ok_or(AppError::NotFound(format!(
            "Payment transaction {} not found",
            id
        )))?;

    // Authorization check: User must be payer or payee
    if transaction.payer_id != auth_user.user_id && transaction.payee_id != auth_user.user_id {
        return Err(AppError::Forbidden {
            message: "You do not have access to this transaction".to_string(),
        });
    }

    Ok(ok(PaymentResponse {
        id: transaction.id,
        payer_id: transaction.payer_id,
        payee_id: transaction.payee_id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        method: transaction.method,
        proof_image_url: transaction.proof_image_url,
        reference_code: transaction.reference_code,
        notes: transaction.notes,
        created_at: transaction.created_at,
    }))
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
        qr_image_url: Option<String>,
    }

    let account: Option<BankAccount> = sqlx::query_as(
        r#"
        SELECT bank_name, account_number, account_holder_name, qr_image_url
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

    // Prefer user's uploaded bank-provided QR image (this is guaranteed to be scannable)
    // Fallback: generate an internal QR payload (note: not all banking apps may accept this without full VietQR BIN mapping)
    let (qr_data, qr_image) = if let Some(url) = account.qr_image_url.clone() {
        ("".to_string(), url)
    } else {
        let qr_data = generate_vietqr_string(
            &account.account_number,
            &account.account_holder_name,
            amount,
            params.note.as_deref(),
        );
        let qr_image = generate_qr_image(&qr_data)?;
        (qr_data, qr_image)
    };

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
