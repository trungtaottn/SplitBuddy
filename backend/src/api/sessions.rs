use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::domain::session::{ParticipantRole, SessionStatus};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/:id", get(get_session))
        .route("/:id/participants", post(add_participant))
        .route("/:id/bills", get(list_bills).post(create_bill))
        .route("/:id/bills/:bill_id", put(update_bill).delete(delete_bill))
}

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
}

#[derive(Serialize)]
pub struct ParticipantResponse {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
    pub display_name: String,
    pub role: ParticipantRole,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateSessionRequest {
    pub name: String,
    pub location: Option<String>,
    pub session_date: Option<chrono::NaiveDate>,
    pub group_id: Option<Uuid>,
    pub participant_ids: Option<Vec<Uuid>>,
    pub guest_names: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct AddParticipantRequest {
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct BillResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
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

#[derive(Deserialize)]
pub struct CreateBillRequest {
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
    pub payers: Vec<PayerInput>,
    #[serde(default = "default_split_strategy")]
    pub split_strategy: String,
    pub split_details: Option<Vec<SplitDetailInput>>,
}

fn default_split_strategy() -> String {
    "EQUAL".to_string()
}

#[derive(Deserialize, Clone)]
pub struct SplitDetailInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

#[derive(Deserialize)]
pub struct PayerInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

async fn list_sessions(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<SessionResponse>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    let sessions = repo.find_by_user(auth_user.user_id).await?;

    Ok(ok(sessions))
}

async fn create_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<SessionResponse>>), AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    let session = repo
        .create_with_participants(
            &payload.name,
            payload.location.as_deref(),
            payload.session_date,
            auth_user.user_id,
            payload.group_id,
            payload.participant_ids.as_deref(),
            payload.guest_names.as_deref(),
        )
        .await?;

    Ok(created(session))
}

async fn get_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionDetailResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    Ok(ok(session))
}

async fn add_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<AddParticipantRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<ParticipantResponse>>), AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    if payload.user_id.is_none() && payload.guest_name.is_none() {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Either user_id or guest_name must be provided".to_string(),
        });
    }

    let participant = repo
        .add_participant(session_id, payload.user_id, payload.guest_name)
        .await?;

    Ok(created(participant))
}

async fn list_bills(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<BillDetailResponse>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let bills = repo.find_bills_by_session(session_id).await?;

    let mut detailed_bills = Vec::new();
    for bill in bills {
        // Get payers for this bill
        let payers: Vec<BillPayerInfo> = sqlx::query_as(
            r#"
            SELECT 
                bp.participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
                bp.amount_paid
            FROM bill_payers bp
            JOIN session_participants sp ON bp.participant_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE bp.bill_id = $1
            "#
        )
        .bind(bill.id)
        .fetch_all(&state.pool)
        .await?;

        // Get participants (bill splits) for this bill
        let participants: Vec<BillParticipantInfo> = sqlx::query_as(
            r#"
            SELECT 
                bs.participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
                bs.amount_owed
            FROM bill_splits bs
            JOIN session_participants sp ON bs.participant_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE bs.bill_id = $1
            "#
        )
        .bind(bill.id)
        .fetch_all(&state.pool)
        .await?;

        detailed_bills.push(BillDetailResponse {
            id: bill.id,
            session_id: bill.session_id,
            description: bill.description,
            amount: bill.amount,
            split_strategy: bill.split_strategy,
            created_by: bill.created_by,
            created_at: bill.created_at,
            payers,
            participants,
        });
    }

    Ok(ok(detailed_bills))
}

async fn create_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<CreateBillRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<BillResponse>>), AppError> {
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
            &payload.description,
            payload.total_amount,
            &payload.split_strategy,
            auth_user.user_id,
            &payload.payers,
            payload.split_details.as_deref(),
        )
        .await?;

    Ok(created(bill))
}

#[derive(Deserialize)]
pub struct UpdateBillRequest {
    pub description: Option<String>,
    #[serde(default, with = "rust_decimal::serde::str_option")]
    pub total_amount: Option<Decimal>,
    pub split_strategy: Option<String>,
    pub payers: Option<Vec<PayerInput>>,
    pub split_details: Option<Vec<SplitDetailInput>>,
}

#[derive(Deserialize)]
struct BillPathParams {
    id: Uuid,
    bill_id: Uuid,
}

async fn update_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<BillPathParams>,
    Json(payload): Json<UpdateBillRequest>,
) -> Result<Json<ApiResponse<BillResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(params.id, auth_user.user_id).await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> = sqlx::query_as(
        "SELECT created_by FROM bills WHERE id = $1 AND session_id = $2"
    )
    .bind(params.bill_id)
    .bind(params.id)
    .fetch_optional(&state.pool)
    .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound { bill_id: params.bill_id })?;

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
    let updated_bill = repo.update_bill(
        params.bill_id,
        params.id,
        payload.description.as_deref(),
        payload.total_amount,
        payload.split_strategy.as_deref(),
        payload.payers.as_deref(),
        payload.split_details.as_deref(),
    ).await?;

    Ok(ok(updated_bill))
}

async fn delete_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<BillPathParams>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(params.id, auth_user.user_id).await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> = sqlx::query_as(
        "SELECT created_by FROM bills WHERE id = $1 AND session_id = $2"
    )
    .bind(params.bill_id)
    .bind(params.id)
    .fetch_optional(&state.pool)
    .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound { bill_id: params.bill_id })?;

    if creator_id != auth_user.user_id {
        return Err(AppError::Forbidden {
            message: "Chỉ người tạo hóa đơn mới có thể xóa".to_string(),
        });
    }

    // Delete bill and recalculate debts
    repo.delete_bill(params.bill_id, params.id).await?;

    Ok(ok(()))
}
