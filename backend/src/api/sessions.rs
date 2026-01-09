use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::cache::CachedSession;
use crate::domain::session::{ParticipantRole, SessionStatus};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/:id", get(get_session).delete(delete_session))
        .route("/:id/participants", post(add_participant))
        .route(
            "/:id/participants/:pid",
            put(update_participant).delete(delete_participant),
        )
        .route("/:id/close", post(close_session))
        .route("/:id/reopen", post(reopen_session))
        .route("/:id/bills", get(list_bills).post(create_bill))
        .route("/:id/bills/:bill_id", put(update_bill).delete(delete_bill))
        .route("/:id/export", get(export_session))
        .route("/:id/spin", post(super::games::spin_wheel))
        .route("/:id/spin-history", get(super::games::get_spin_history))
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
    // Enhanced fields for better UX
    pub participants: Vec<ParticipantBasicInfo>,
    pub my_debt: Decimal,        // How much current user owes in this session
    pub my_owed: Decimal,        // How much current user is owed in this session
    pub settled_amount: Decimal, // Total amount already settled
}

#[derive(Serialize, Clone)]
pub struct ParticipantBasicInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar_url: Option<String>,
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
    pub group_id: Option<Uuid>,
}

#[derive(Serialize, Clone, Debug)]
pub struct ParticipantResponse {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
    pub display_name: String,
    pub role: ParticipantRole,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize, Validate)]
pub struct CreateSessionRequest {
    #[validate(length(
        min = 1,
        max = 200,
        message = "Session name must be between 1 and 200 characters"
    ))]
    pub name: String,
    #[validate(length(max = 500, message = "Location must be less than 500 characters"))]
    pub location: Option<String>,
    pub session_date: Option<chrono::NaiveDate>,
    pub group_id: Option<Uuid>,
    pub participant_ids: Option<Vec<Uuid>>,
    #[validate(length(max = 10, message = "Maximum 10 guest names allowed"))]
    pub guest_names: Option<Vec<String>>,
}

#[derive(Deserialize, Validate)]
pub struct AddParticipantRequest {
    pub user_id: Option<Uuid>,
    #[validate(length(
        min = 1,
        max = 100,
        message = "Guest name must be between 1 and 100 characters"
    ))]
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

#[derive(Deserialize, Clone)]
pub struct SplitDetailInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

#[derive(Deserialize, Serialize)]
pub struct PayerInput {
    pub participant_id: Uuid,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
}

#[derive(Deserialize, Default)]
pub struct SessionQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub from: Option<chrono::NaiveDate>,
    pub to: Option<chrono::NaiveDate>,
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page() -> i64 {
    1
}
fn default_limit() -> i64 {
    10
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    pub data: T,
    pub meta: PaginationMeta,
}

#[derive(Serialize)]
pub struct PaginationMeta {
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

async fn list_sessions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<SessionQuery>,
) -> Result<Json<PaginatedResponse<Vec<SessionResponse>>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    let (sessions, total) = repo
        .find_by_user_paginated(
            auth_user.user_id,
            query.search.as_deref(),
            query.status.as_deref(),
            query.from,
            query.to,
            query.page,
            query.limit,
        )
        .await?;

    let total_pages = (total as f64 / query.limit as f64).ceil() as i64;

    Ok(Json(PaginatedResponse {
        data: sessions,
        meta: PaginationMeta {
            total,
            page: query.page,
            limit: query.limit,
            total_pages,
        },
    }))
}

async fn create_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<SessionResponse>>), AppError> {
    // Validate input
    payload.validate().map_err(|e| AppError::Validation {
        field: "request".to_string(),
        message: format!("Validation failed: {}", e),
    })?;

    // Sanitize name and location (remove HTML tags, limit length)
    let name = payload.name.trim().to_string();
    if name.is_empty() || name.len() > 200 {
        return Err(AppError::Validation {
            field: "name".to_string(),
            message: "Session name must be between 1 and 200 characters".to_string(),
        });
    }

    let location = payload
        .location
        .as_ref()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty());

    let repo = SessionRepository::new(state.pool.clone());

    let session = repo
        .create_with_participants(
            &name,
            location.as_deref(),
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

    // Check cache first
    if let Some(cached) = state.cache.get_session(session_id).await {
        // Verify user is participant (for security)
        repo.verify_participant(session_id, auth_user.user_id)
            .await?;

        return Ok(ok(SessionDetailResponse {
            id: cached.id,
            name: cached.name,
            location: cached.location,
            status: cached.status,
            created_by: cached.created_by,
            created_at: cached.created_at,
            session_date: cached.session_date,
            total_amount: cached.total_amount,
            group_id: cached.group_id,
            participants: cached.participants,
        }));
    }

    // Cache miss - query database
    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    // Cache the result
    state
        .cache
        .cache_session(CachedSession {
            id: session.id,
            name: session.name.clone(),
            location: session.location.clone(),
            status: session.status,
            created_by: session.created_by,
            created_at: session.created_at,
            session_date: session.session_date,
            total_amount: session.total_amount,
            group_id: session.group_id,
            participants: session.participants.clone(),
        })
        .await;

    Ok(ok(session))
}

async fn delete_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(session_id, auth_user.user_id).await?;

    // Delete the session
    repo.delete(session_id).await?;

    // Invalidate cache
    state.cache.invalidate_session(session_id).await;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

async fn add_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<AddParticipantRequest>,
) -> Result<
    (
        axum::http::StatusCode,
        Json<ApiResponse<ParticipantResponse>>,
    ),
    AppError,
> {
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

#[derive(Deserialize)]
pub struct UpdateParticipantRequest {
    pub guest_name: Option<String>,
}

#[derive(Deserialize)]
struct ParticipantPathParams {
    id: Uuid,
    pid: Uuid,
}

async fn update_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
    Json(payload): Json<UpdateParticipantRequest>,
) -> Result<Json<ApiResponse<ParticipantResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(params.id, auth_user.user_id).await?;

    // Update participant (only guest_name can be updated)
    let participant = repo
        .update_participant(params.pid, payload.guest_name)
        .await?;

    Ok(ok(participant))
}

async fn delete_participant(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<ParticipantPathParams>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(params.id, auth_user.user_id).await?;

    // Check if participant has any bills
    let has_bills: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM bill_payers WHERE participant_id = $1
            UNION
            SELECT 1 FROM bill_splits WHERE participant_id = $1
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if has_bills {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tham gia đã có trong hóa đơn".to_string(),
        });
    }

    // Check if participant is the session owner
    let is_owner: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM session_participants sp
            JOIN sessions s ON sp.session_id = s.id
            WHERE sp.id = $1 AND sp.user_id = s.created_by
        )
        "#,
    )
    .bind(params.pid)
    .fetch_one(&state.pool)
    .await?;

    if is_owner {
        return Err(AppError::Validation {
            field: "participant".to_string(),
            message: "Không thể xóa người tạo session".to_string(),
        });
    }

    // Delete participant
    repo.delete_participant(params.pid).await?;

    Ok(ok(()))
}

async fn close_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(session_id, auth_user.user_id).await?;

    // Update session status to closed
    let session = repo
        .update_status(session_id, SessionStatus::Closed)
        .await?;

    // Invalidate cache
    state.cache.invalidate_session(session_id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "closed".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

async fn reopen_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is session owner
    repo.verify_owner(session_id, auth_user.user_id).await?;

    // Update session status to active
    let session = repo
        .update_status(session_id, SessionStatus::Active)
        .await?;

    // Invalidate cache
    state.cache.invalidate_session(session_id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "active".to_string(),
            },
        )
        .await;

    Ok(ok(session))
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
            "#,
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
            "#,
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
    // Validate input
    payload.validate().map_err(|e| AppError::Validation {
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
    repo.verify_participant(params.id, auth_user.user_id)
        .await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> =
        sqlx::query_as("SELECT created_by FROM bills WHERE id = $1 AND session_id = $2")
            .bind(params.bill_id)
            .bind(params.id)
            .fetch_optional(&state.pool)
            .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound {
        bill_id: params.bill_id,
    })?;

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
            params.bill_id,
            params.id,
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
    state.cache.invalidate_session(params.id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            params.id,
            WsEvent::BillUpdated {
                session_id: params.id,
                bill_id: params.bill_id,
            },
        )
        .await;

    Ok(ok(updated_bill))
}

async fn delete_bill(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(params): Path<BillPathParams>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(params.id, auth_user.user_id)
        .await?;

    // Check if bill exists and user is the creator
    let bill_creator: Option<(Uuid,)> =
        sqlx::query_as("SELECT created_by FROM bills WHERE id = $1 AND session_id = $2")
            .bind(params.bill_id)
            .bind(params.id)
            .fetch_optional(&state.pool)
            .await?;

    let (creator_id,) = bill_creator.ok_or(AppError::BillNotFound {
        bill_id: params.bill_id,
    })?;

    if creator_id != auth_user.user_id {
        return Err(AppError::Forbidden {
            message: "Chỉ người tạo hóa đơn mới có thể xóa".to_string(),
        });
    }

    // Delete bill and recalculate debts
    repo.delete_bill(params.bill_id, params.id).await?;

    // Invalidate cache
    state.cache.invalidate_session(params.id).await;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            params.id,
            WsEvent::BillUpdated {
                session_id: params.id,
                bill_id: params.bill_id,
            },
        )
        .await;

    Ok(ok(()))
}

async fn export_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<axum::response::Response, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    // Verify user is participant
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Get session details
    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    // Get bills with details
    let bills = repo.find_bills_by_session(session_id).await?;

    // Get debts
    #[derive(sqlx::FromRow)]
    struct DebtRow {
        creditor_name: String,
        debtor_name: String,
        amount: Decimal,
    }

    let debts: Vec<DebtRow> = sqlx::query_as(
        r#"
        SELECT 
            COALESCE(cu.full_name, csp.guest_name, 'Unknown') as creditor_name,
            COALESCE(du.full_name, dsp.guest_name, 'Unknown') as debtor_name,
            d.amount
        FROM debts d
        JOIN session_participants csp ON d.creditor_id = csp.id
        LEFT JOIN users cu ON csp.user_id = cu.id
        JOIN session_participants dsp ON d.debtor_id = dsp.id
        LEFT JOIN users du ON dsp.user_id = du.id
        WHERE d.session_id = $1
        ORDER BY d.amount DESC
        "#,
    )
    .bind(session_id)
    .fetch_all(&state.pool)
    .await?;

    // Generate CSV content
    let mut csv = String::new();

    // Add BOM for UTF-8 Excel compatibility
    csv.push('\u{FEFF}');

    // Session info
    csv.push_str(&format!("Cuộc nhậu: {}\n", session.name));
    csv.push_str(&format!("Ngày: {}\n", session.session_date));
    if let Some(loc) = &session.location {
        csv.push_str(&format!("Địa điểm: {}\n", loc));
    }
    csv.push_str(&format!("Số người: {}\n", session.participants.len()));
    csv.push_str(&format!("Tổng tiền: {}\n\n", session.total_amount));

    // Participants
    csv.push_str("NGƯỜI THAM GIA\n");
    csv.push_str("Tên,Vai trò\n");
    for p in &session.participants {
        csv.push_str(&format!(
            "{},{}\n",
            p.display_name,
            if p.role == crate::domain::session::ParticipantRole::Owner {
                "Chủ xị"
            } else {
                "Thành viên"
            }
        ));
    }
    csv.push('\n');

    // Bills
    csv.push_str("HÓA ĐƠN\n");
    csv.push_str("Mô tả,Số tiền,Ngày tạo\n");
    for bill in &bills {
        csv.push_str(&format!(
            "{},{},{}\n",
            bill.description,
            bill.amount,
            bill.created_at.format("%d/%m/%Y %H:%M")
        ));
    }
    csv.push('\n');

    // Debts
    csv.push_str("CÔNG NỢ\n");
    csv.push_str("Người nợ,Nợ,Số tiền\n");
    for debt in &debts {
        csv.push_str(&format!(
            "{},{},{}\n",
            debt.debtor_name, debt.creditor_name, debt.amount
        ));
    }

    // Create filename
    let filename = format!(
        "{}_{}.csv",
        session.name.replace(' ', "_"),
        chrono::Utc::now().format("%Y%m%d")
    );

    // Return CSV response
    use axum::response::IntoResponse;
    Ok((
        [
            (axum::http::header::CONTENT_TYPE, "text/csv; charset=utf-8"),
            (
                axum::http::header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        csv,
    )
        .into_response())
}
