use axum::extract::{Path, Query, State};
use axum::Json;
use rust_decimal::{Decimal, RoundingStrategy};
use serde::Deserialize;
use uuid::Uuid;
use validator::{Validate, ValidationErrors};

use crate::api::response::{created, ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session::SessionBillRepository;
use crate::repository::session_repo::SessionRepository;
use crate::utils::forex::{normalize_currency, resolve_exchange_rate};
use crate::utils::pagination::{PaginatedResponse, PaginationParams};

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

pub async fn list_bills(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Query(pagination): Query<PaginationParams>,
) -> Result<Json<ApiResponse<PaginatedResponse<BillDetailResponse>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    let bill_repo = SessionBillRepository::new(state.pool.clone());

    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let (bills, total) = bill_repo
        .find_bills_by_session_paginated(session_id, pagination.limit(), pagination.offset())
        .await?;

    let response = PaginatedResponse::new(bills, pagination.page(), pagination.limit(), total);

    Ok(ok(response))
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

    let base_currency = normalize_currency(&repo.get_session_base_currency(session_id).await?)?;
    let currency_code = match payload.currency_code.as_deref() {
        Some(code) => normalize_currency(code)?,
        None => base_currency.clone(),
    };

    let rate_info = resolve_exchange_rate(
        &state.pool,
        &state.http_client,
        &currency_code,
        &base_currency,
        payload.exchange_rate,
    )
    .await?;

    let total_amount_converted = convert_amount(payload.total_amount, rate_info.rate);

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

    let converted_payers = convert_payers(
        &payload.payers,
        rate_info.rate,
        payload.total_amount,
        total_amount_converted,
    );
    let converted_splits = payload.split_details.as_deref().map(|details| {
        convert_split_details(
            details,
            rate_info.rate,
            payload.total_amount,
            total_amount_converted,
        )
    });

    let bill = repo
        .create_bill(
            session_id,
            &description,
            total_amount_converted,
            payload.total_amount,
            &currency_code,
            rate_info.rate,
            &rate_info.source,
            rate_info.timestamp,
            &payload.split_strategy,
            auth_user.user_id,
            &converted_payers,
            converted_splits.as_deref(),
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

    // Debts are recalculated when bill is created
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
        .await;

    // Create Activity
    let feed_repo = crate::repository::feed_repo::FeedRepository::new(state.pool.clone());
    let _ = feed_repo
        .create_activity(
            auth_user.user_id,
            "bill_created",
            bill.id,
            "bill",
            serde_json::json!({
                 "description": bill.description,
                 "amount": bill.amount,
                 "currency": bill.currency_code,
                 "session_id": session_id
            }),
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

    let base_currency = normalize_currency(&repo.get_session_base_currency(session_id).await?)?;

    #[derive(sqlx::FromRow)]
    struct BillMeta {
        amount_original: Decimal,
        currency_code: String,
        exchange_rate: Decimal,
        split_strategy: String,
    }

    let existing_bill: Option<BillMeta> = sqlx::query_as(
        r#"
        SELECT amount_original, currency_code, exchange_rate, split_strategy
        FROM bills
        WHERE id = $1 AND session_id = $2
        "#,
    )
    .bind(bill_id)
    .bind(session_id)
    .fetch_optional(&state.pool)
    .await?;

    let existing_bill = existing_bill.ok_or(AppError::BillNotFound { bill_id })?;

    let existing_currency = normalize_currency(&existing_bill.currency_code)?;
    let requested_currency = match payload.currency_code.as_deref() {
        Some(code) => Some(normalize_currency(code)?),
        None => None,
    };
    let currency_code = requested_currency
        .clone()
        .unwrap_or_else(|| existing_currency.clone());
    let currency_code_changed = requested_currency
        .as_ref()
        .is_some_and(|code| code != &existing_currency);

    if currency_code_changed && payload.total_amount.is_none() {
        return Err(AppError::Validation {
            field: "total_amount".to_string(),
            message: "total_amount is required when currency_code changes".to_string(),
        });
    }

    let should_update_rate = payload.exchange_rate.is_some() || currency_code_changed;
    let rate_info = if should_update_rate {
        Some(
            resolve_exchange_rate(
                &state.pool,
                &state.http_client,
                &currency_code,
                &base_currency,
                payload.exchange_rate,
            )
            .await?,
        )
    } else {
        None
    };

    let conversion_rate = rate_info
        .as_ref()
        .map(|info| info.rate)
        .unwrap_or(existing_bill.exchange_rate);

    let total_original = payload
        .total_amount
        .unwrap_or(existing_bill.amount_original);
    let total_amount_converted = convert_amount(total_original, conversion_rate);

    let split_strategy = payload
        .split_strategy
        .as_deref()
        .unwrap_or(existing_bill.split_strategy.as_str());

    if split_strategy.eq_ignore_ascii_case("CUSTOM") {
        if let Some(details) = payload.split_details.as_ref() {
            let total_split: Decimal = details.iter().map(|s| s.amount).sum();
            if total_split != total_original {
                return Err(AppError::Validation {
                    field: "split_details".to_string(),
                    message: format!(
                        "Sum of split amounts ({}) must equal total_amount ({})",
                        total_split, total_original
                    ),
                });
            }
        }
    }

    let converted_payers = payload.payers.as_deref().map(|payers| {
        convert_payers(
            payers,
            conversion_rate,
            total_original,
            total_amount_converted,
        )
    });
    let converted_splits = payload.split_details.as_deref().map(|details| {
        convert_split_details(
            details,
            conversion_rate,
            total_original,
            total_amount_converted,
        )
    });

    // Validate amount if provided
    if let Some(amount) = payload.total_amount {
        if amount <= Decimal::ZERO {
            return Err(AppError::InvalidBillAmount { amount });
        }
    }

    let should_update_amount =
        payload.total_amount.is_some() || payload.exchange_rate.is_some() || currency_code_changed;

    let amount_param = if should_update_amount {
        Some(total_amount_converted)
    } else {
        None
    };

    let exchange_rate_param = if should_update_rate {
        Some(conversion_rate)
    } else {
        None
    };

    let (rate_source_param, rate_timestamp_param) = if let Some(info) = rate_info.as_ref() {
        (Some(info.source.as_str()), Some(info.timestamp))
    } else {
        (None, None)
    };

    let currency_code_param = if payload.currency_code.is_some() {
        Some(currency_code.as_str())
    } else {
        None
    };

    // Update bill using repository method
    let updated_bill = repo
        .update_bill(
            bill_id,
            session_id,
            payload.description.as_deref(),
            amount_param,
            payload.total_amount,
            currency_code_param,
            exchange_rate_param,
            rate_source_param,
            rate_timestamp_param,
            payload.split_strategy.as_deref(),
            converted_payers.as_deref(),
            converted_splits.as_deref(),
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

    // Debts are recalculated when bill is updated
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
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

    // Broadcast WebSocket events
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillDeleted {
                session_id,
                bill_id,
            },
        )
        .await;

    // Debts are recalculated when bill is deleted
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
        .await;

    Ok(ok(()))
}

fn round_amount(amount: Decimal) -> Decimal {
    amount.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero)
}

fn convert_amount(amount: Decimal, rate: Decimal) -> Decimal {
    round_amount(amount * rate)
}

fn convert_payers(
    payers: &[PayerInput],
    rate: Decimal,
    total_original: Decimal,
    total_converted: Decimal,
) -> Vec<PayerInput> {
    let mut converted: Vec<PayerInput> = payers
        .iter()
        .map(|payer| PayerInput {
            participant_id: payer.participant_id,
            amount: convert_amount(payer.amount, rate),
        })
        .collect();

    if converted.is_empty() {
        return converted;
    }

    let sum_original: Decimal = payers.iter().map(|p| p.amount).sum();
    if sum_original != total_original {
        return converted;
    }

    let sum_converted: Decimal = converted.iter().map(|p| p.amount).sum();
    let remainder = total_converted - sum_converted;
    if remainder == Decimal::ZERO {
        return converted;
    }

    if let Some((target_idx, _)) = payers
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.amount.cmp(&b.amount))
    {
        converted[target_idx].amount = round_amount(converted[target_idx].amount + remainder);
    }

    converted
}

fn convert_split_details(
    details: &[SplitDetailInput],
    rate: Decimal,
    total_original: Decimal,
    total_converted: Decimal,
) -> Vec<SplitDetailInput> {
    let mut converted: Vec<SplitDetailInput> = details
        .iter()
        .map(|detail| SplitDetailInput {
            participant_id: detail.participant_id,
            amount: convert_amount(detail.amount, rate),
        })
        .collect();

    if converted.is_empty() {
        return converted;
    }

    let sum_original: Decimal = details.iter().map(|d| d.amount).sum();
    if sum_original != total_original {
        return converted;
    }

    let sum_converted: Decimal = converted.iter().map(|d| d.amount).sum();
    let remainder = total_converted - sum_converted;
    if remainder == Decimal::ZERO {
        return converted;
    }

    if let Some((target_idx, _)) = details
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.amount.cmp(&b.amount))
    {
        converted[target_idx].amount = round_amount(converted[target_idx].amount + remainder);
    }

    converted
}
