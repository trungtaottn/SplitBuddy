use axum::{
    extract::{Query, State},
    Json,
};

use crate::api::payments_dto::{GenerateQrRequest, QrResponse};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

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

    let amount = params
        .amount
        .parse::<u64>()
        .map_err(|_| AppError::Validation {
            field: "amount".to_string(),
            message: "Invalid amount format".to_string(),
        })?;

    let bin = get_bank_bin(&account.bank_name);
    let template = "compact2";

    let mut qr_url = format!(
        "https://img.vietqr.io/image/{}-{}-{}.png?amount={}",
        bin, account.account_number, template, amount
    );

    if let Some(note) = &params.note {
        let encoded_note = urlencoding::encode(note);
        qr_url.push_str(&format!("&addInfo={}", encoded_note));
    }

    qr_url.push_str(&format!(
        "&accountName={}",
        urlencoding::encode(&account.account_holder_name)
    ));

    Ok(ok(QrResponse {
        qr_data: "".to_string(),
        qr_image: qr_url,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_holder: account.account_holder_name,
    }))
}

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
    }
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
    }
    if name.contains("cake") {
        return "970454";
    }
    if name.contains("timo") {
        return "963388";
    }
    if name.contains("viettel") || name.contains("money") {
        return "971005";
    }

    "970436"
}
