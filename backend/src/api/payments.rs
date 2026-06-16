use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::api::payments_dto::{CreatePaymentRequest, ListPaymentParams, PaymentResponse};
use crate::api::payments_qr::generate_qr;
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
