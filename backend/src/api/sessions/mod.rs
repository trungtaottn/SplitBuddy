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
use crate::utils::forex::normalize_currency;

pub mod bills;
pub mod participants;

use bills::{create_bill, delete_bill, list_bills, update_bill};
use participants::{add_participant, delete_participant, update_participant};

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
        .route("/:id/minimize-debts", put(update_minimize_debts))
        .route("/:id/archive", post(archive_session))
        .route("/:id/restore", post(restore_session))
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
    pub base_currency: String,
    pub minimize_debts: bool,
    pub timezone: String,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
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
    pub base_currency: String,
    pub minimize_debts: bool,
    pub timezone: String,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
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
    pub base_currency: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMinimizeDebtsRequest {
    pub minimize_debts: bool,
}

// These Bill structs are needed by Repo and Bills Module
#[derive(Serialize, sqlx::FromRow)]
pub struct BillResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_original: Decimal,
    pub currency_code: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub exchange_rate: Decimal,
    pub rate_source: String,
    pub rate_timestamp: chrono::DateTime<chrono::Utc>,
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
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_original: Decimal,
    pub currency_code: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub exchange_rate: Decimal,
    pub rate_source: String,
    pub rate_timestamp: chrono::DateTime<chrono::Utc>,
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

// These are used in bills.rs via modules but defined here??
// Actually bills.rs defines CreateBillRequest.
// But we need PayerInput and SplitDetailInput globally?
// Yes, they are common.

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
    #[serde(default)]
    pub include_archived: bool,
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
            query.include_archived,
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

    let base_currency = match payload.base_currency.as_deref() {
        Some(code) => Some(normalize_currency(code)?),
        None => None,
    };

    let timezone = payload
        .timezone
        .as_ref()
        .map(|tz| tz.trim().to_string())
        .filter(|tz| !tz.is_empty());

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
            base_currency.as_deref(),
            timezone.as_deref(),
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
            base_currency: cached.base_currency,
            minimize_debts: cached.minimize_debts,
            timezone: cached.timezone,
            archived_at: cached.archived_at,
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
            base_currency: session.base_currency.clone(),
            minimize_debts: session.minimize_debts,
            timezone: session.timezone.clone(),
            archived_at: session.archived_at,
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

async fn update_minimize_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<UpdateMinimizeDebtsRequest>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    let session = repo
        .update_minimize_debts(session_id, payload.minimize_debts)
        .await?;

    state.cache.invalidate_session(session_id).await;

    Ok(ok(session))
}

async fn archive_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    let session = repo.set_archived(session_id, true).await?;

    state.cache.invalidate_session(session_id).await;

    Ok(ok(session))
}

async fn restore_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    let session = repo.set_archived(session_id, false).await?;

    state.cache.invalidate_session(session_id).await;

    Ok(ok(session))
}

async fn export_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    // Validate access
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    // Fetch session details
    let _session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    // Fetch all bills for this session (Optimization: reuse optimized method)
    // Wait, find_bills_with_details returns BillDetailResponse which is perfect for export
    let bills = repo.find_bills_with_details(session_id).await?;

    // Simple CSV Generation
    let mut csv_data = String::from("Date,Description,Payer,Amount,Split\n");

    for bill in bills {
        let payer_names = bill
            .payers
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" & ");

        csv_data.push_str(&format!(
            "{},{},{},{},{}\n",
            bill.created_at.format("%Y-%m-%d"),
            bill.description.replace(",", ";"), // Simple escape
            payer_names,
            bill.amount,
            bill.split_strategy
        ));
    }

    use axum::http::header;
    use axum::response::Response;

    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"session_{}.csv\"", session_id),
        )
        .body(csv_data)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to build response: {}", e)))
}
