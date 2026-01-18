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

/// Generate VietQR code image via img.vietqr.io
/// This uses the public gateway which supports all banks
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

    // Construct VietQR URL
    // Format: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>
    let bin = get_bank_bin(&account.bank_name);
    let template = "compact2"; // Compact template with QR only or minimal info

    let mut qr_url = format!(
        "https://img.vietqr.io/image/{}-{}-{}.png?amount={}",
        bin, account.account_number, template, amount
    );

    if let Some(note) = &params.note {
        // Encode note for URL
        let encoded_note = urlencoding::encode(note);
        qr_url.push_str(&format!("&addInfo={}", encoded_note));
    }

    qr_url.push_str(&format!(
        "&accountName={}",
        urlencoding::encode(&account.account_holder_name)
    ));

    // Return the URL as the "image" (frontend can display it directly)
    // We also clear qr_data because we're providing a direct image URL, not raw payload
    Ok(ok(QrResponse {
        qr_data: "".to_string(),
        qr_image: qr_url,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_holder: account.account_holder_name,
    }))
}

/// Helper to map common Bank Names to BIN
/// Sources: NAPAS, VietQR
fn get_bank_bin(bank_name: &str) -> &'static str {
    let name = bank_name.to_lowercase();

    if name.contains("vietcombank") || name == "vcb" {
        return "970436";
    }
    if name.contains("vietinbank") || name == "ctg" {
        return "970415";
    }
    if name.contains("mb") || name.contains("mbbank") || name == "qa" {
        return "970422";
    } // MB
    if name.contains("techcombank") || name == "tcb" {
        return "970407";
    }
    if name.contains("agribank") || name == "vba" {
        return "970405";
    }
    if name.contains("bidv") || name == "bid" {
        return "970418";
    }
    if name.contains("sacombank") || name == "stb" {
        return "970403";
    }
    if name.contains("acb") {
        return "970416";
    }
    if name.contains("vpbank") || name == "vpb" {
        return "970432";
    }
    if name.contains("tpbank") || name == "tpb" {
        return "970423";
    }
    if name.contains("vib") {
        return "970441";
    }
    if name.contains("hdbank") || name == "hdb" {
        return "970437";
    }
    if name.contains("shb") {
        return "970443";
    }
    if name.contains("eximbank") || name == "eib" {
        return "970431";
    }
    if name.contains("msb") || name.contains("hang hai") {
        return "970426";
    }
    if name.contains("ocb") || name.contains("phuong dong") {
        return "970448";
    }
    if name.contains("seabank") {
        return "970440";
    }
    if name.contains("lienviet") || name.contains("lpbank") {
        return "970449";
    }
    if name.contains("bac a") || name.contains("baca") {
        return "970409";
    }
    if name.contains("shinhan") {
        return "970424";
    }
    if name.contains("scb") {
        return "970429";
    }
    if name.contains("uob") {
        return "970458";
    }
    if name.contains("standard") {
        return "970410";
    } // Standard Chartered
    if name.contains("cake") {
        return "970454";
    } // Cake by VPBank
    if name.contains("timo") {
        return "963388";
    } // Timo
    if name.contains("viettel") || name.contains("money") {
        return "971005";
    } // Viettel Money

    // Default fallback (might fail but better than nothing, or user can fix bank name)
    "970436" // Default to VCB if unknown to avoid broken URL structure, though valid bank is needed
}
