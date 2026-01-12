use axum::extract::{Path, State};
use axum::Json;
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;
use validator::{Validate, ValidationErrors};

use crate::api::response::{created, ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::{BillDetailResponse, BillResponse, PayerInput, SplitDetailInput};

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
    pub split_strategy: Option<String>,
    pub payers: Option<Vec<PayerInput>>,
    pub split_details: Option<Vec<SplitDetailInput>>,
    pub category_id: Option<Uuid>,
    pub receipt_url: Option<String>,
}

pub async fn list_bills(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<BillDetailResponse>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Use the optimized N+1 fix method
    let bills = repo.find_bills_with_details(session_id).await?;

    Ok(ok(bills))
}

pub async fn create_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<CreateBillRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<BillResponse>>), AppError> {
    // Validate input
    let payload_inner: &CreateBillRequest = &payload;
    payload_inner
        .validate()
        .map_err(|e: ValidationErrors| AppError::Validation {
            field: "request".to_string(),
            message: format!("Validation failed: {}", e),
        })?;

    // Sanitize description
    let description = payload.description.trim().to_string();
    if description.is_empty() || description.len() > 500 {
        return Err(AppError::Validation {
            field: "description".to_string(),
            message: "Description must be between 1 and 500 characters".to_string(),
        });
    }

    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    if payload.total_amount <= Decimal::ZERO {
        return Err(AppError::InvalidBillAmount {
            amount: payload.total_amount,
        });
    }

    if payload.split_strategy.to_uppercase() == "CUSTOM" {
        let split_details = payload.split_details.as_ref().ok_or(AppError::Validation {
            field: "split_details".to_string(),
            message: "split_details is required when split_strategy is CUSTOM".to_string(),
        })?;

        let total_split: Decimal = split_details.iter().map(|s| s.amount).sum();
        if total_split != payload.total_amount {
            return Err(AppError::Validation {
                field: "split_details".to_string(),
                message: format!(
                    "Sum of split amounts ({}) must equal total_amount ({})",
                    total_split, payload.total_amount
                ),
            });
        }
    }

    let bill = repo
        .create_bill(
            session_id,
            &description,
            payload.total_amount,
            &payload.split_strategy,
            auth_user.user_id,
            &payload.payers,
            payload.split_details.as_deref(),
            payload.category_id,
        )
        .await?;

    // Invalidate cache (total_amount changed)
    state.cache.invalidate_session(session_id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillUpdated {
                session_id,
                bill_id: bill.id,
            },
        )
        .await;

    Ok(created(bill))
}

pub async fn update_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, bill_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateBillRequest>,
) -> Result<Json<ApiResponse<BillResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> =
        sqlx::query_as("SELECT created_by FROM bills WHERE id = $1 AND session_id = $2")
            .bind(bill_id)
            .bind(session_id)
            .fetch_optional(&state.pool)
            .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound { bill_id })?;

    if creator_id != auth_user.user_id {
        return Err(AppError::Forbidden {
            message: "Chỉ người tạo hóa đơn mới có thể sửa".to_string(),
        });
    }

    // Validate amount if provided
    if let Some(amount) = payload.total_amount {
        if amount <= Decimal::ZERO {
            return Err(AppError::InvalidBillAmount { amount });
        }
    }

    // Update bill using repository method
    let updated_bill = repo
        .update_bill(
            bill_id,
            session_id,
            payload.description.as_deref(),
            payload.total_amount,
            payload.split_strategy.as_deref(),
            payload.payers.as_deref(),
            payload.split_details.as_deref(),
            payload.category_id,
            payload.receipt_url.as_deref(),
        )
        .await?;

    // Invalidate cache (bill amounts may have changed)
    state.cache.invalidate_session(session_id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillUpdated {
                session_id,
                bill_id,
            },
        )
        .await;

    Ok(ok(updated_bill))
}

pub async fn delete_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((session_id, bill_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> =
        sqlx::query_as("SELECT created_by FROM bills WHERE id = $1 AND session_id = $2")
            .bind(bill_id)
            .bind(session_id)
            .fetch_optional(&state.pool)
            .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound { bill_id })?;

    if creator_id != auth_user.user_id {
        return Err(AppError::Forbidden {
            message: "Chỉ người tạo hóa đơn mới có thể xóa".to_string(),
        });
    }

    // Delete bill
    repo.delete_bill(bill_id, session_id).await?;

    // Invalidate cache
    state.cache.invalidate_session(session_id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillUpdated {
                session_id,
                bill_id,
            },
        )
        .await;

    Ok(ok(()))
}
