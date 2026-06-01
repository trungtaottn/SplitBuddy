use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;
use validator::Validate;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::cache::CachedSession;
use crate::domain::session::{ParticipantRole, SessionStatus};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;
use crate::utils::forex::normalize_currency;

pub mod bills;
pub mod debts;
pub mod participants;

use bills::{create_bill, delete_bill, list_bills, update_bill};
use participants::{add_participant, delete_participant, update_participant};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/bulk-archive", post(bulk_archive_sessions))
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
        .route("/:id/export/v2", get(export_session_v2))
        .route("/:id/import/preview", post(import_session_preview))
        .route("/:id/import", post(import_session))
        .route("/:id/who-pays-next", get(who_pays_next))
        .route("/:id/spin", post(super::games::spin_wheel))
        .route("/:id/spin-history", get(super::games::get_spin_history))
        .route("/:id/debt-stats", get(debts::get_debt_stats))
        .route("/:id/debts/pending", get(debts::get_pending_debts))
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

#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParticipantResponse {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
    pub display_name: String,
    pub role: ParticipantRole,
    pub joined_at: chrono::DateTime<chrono::Utc>,
    pub default_weight: i32,
    pub is_active: bool,
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

#[derive(Deserialize)]
pub struct BulkArchiveRequest {
    pub session_ids: Vec<Uuid>,
}

#[derive(Serialize)]
pub struct BulkArchiveResponse {
    pub archived_ids: Vec<Uuid>,
    pub skipped_ids: Vec<Uuid>,
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

    // Create Activity
    let feed_repo = crate::repository::feed_repo::FeedRepository::new(state.pool.clone());
    let _ = feed_repo
        .create_activity(
            auth_user.user_id,
            "session_created",
            session.id,
            "session",
            serde_json::json!({
                 "name": session.name,
                 "location": session.location
            }),
        )
        .await;

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

    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::SessionUpdated { session_id })
        .await;

    // Also recalculate debts event might be useful, or implicit in SessionUpdated?
    // SessionUpdated implies data changed. DebtsRecalculated specifically triggers debt fetch.
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
        .await;

    Ok(ok(session))
}

async fn archive_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SessionResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    let debt_repo = crate::repository::session::SessionDebtRepository::new(state.pool.clone());

    repo.verify_owner(session_id, auth_user.user_id).await?;

    // Check for unsettled debts
    if debt_repo.has_unsettled_debts(session_id).await? {
        return Err(AppError::Validation {
            field: "session".to_string(),
            message: "Cannot archive session with pending debts. Please settle all debts first."
                .to_string(),
        });
    }

    let session = repo.set_archived(session_id, true).await?;

    state.cache.invalidate_session(session_id).await;

    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "ARCHIVED".to_string(),
            },
        )
        .await;

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

    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::SessionStatusChanged {
                session_id,
                status: "ACTIVE".to_string(),
            },
        )
        .await;

    Ok(ok(session))
}

async fn bulk_archive_sessions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<BulkArchiveRequest>,
) -> Result<Json<ApiResponse<BulkArchiveResponse>>, AppError> {
    if payload.session_ids.is_empty() {
        return Err(AppError::Validation {
            field: "session_ids".to_string(),
            message: "session_ids cannot be empty".to_string(),
        });
    }

    let archived_ids: Vec<Uuid> = sqlx::query_scalar(
        r#"
        UPDATE sessions
        SET archived_at = NOW(), updated_at = NOW()
        WHERE id = ANY($1) AND created_by = $2 AND archived_at IS NULL
        RETURNING id
        "#,
    )
    .bind(&payload.session_ids)
    .bind(auth_user.user_id)
    .fetch_all(&state.pool)
    .await?;

    let archived_set: std::collections::HashSet<Uuid> = archived_ids.iter().copied().collect();
    let skipped_ids = payload
        .session_ids
        .into_iter()
        .filter(|id| !archived_set.contains(id))
        .collect::<Vec<_>>();

    Ok(ok(BulkArchiveResponse {
        archived_ids,
        skipped_ids,
    }))
}

async fn export_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    fn csv_escape(value: &str) -> String {
        let needs_quotes = value.contains(',') || value.contains('\n') || value.contains('"');
        if needs_quotes {
            format!("\"{}\"", value.replace('"', "\"\""))
        } else {
            value.to_string()
        }
    }

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

    // SplitBuddy CSV v1 (equal/weighted) export
    let mut csv_data = String::from(
        "Date,Description,Amount,Amount Original,Currency,Split Strategy,Payers,Payer Amounts,Participants,Participant Amounts\n",
    );

    for bill in bills {
        let payer_names = bill
            .payers
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let payer_amounts = bill
            .payers
            .iter()
            .map(|p| p.amount_paid.to_string())
            .collect::<Vec<_>>()
            .join(" | ");
        let participant_names = bill
            .participants
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let participant_amounts = bill
            .participants
            .iter()
            .map(|p| p.amount_owed.to_string())
            .collect::<Vec<_>>()
            .join(" | ");

        let row = [
            csv_escape(&bill.created_at.format("%Y-%m-%d").to_string()),
            csv_escape(&bill.description),
            csv_escape(&bill.amount.to_string()),
            csv_escape(&bill.amount_original.to_string()),
            csv_escape(&bill.currency_code),
            csv_escape(&bill.split_strategy),
            csv_escape(&payer_names),
            csv_escape(&payer_amounts),
            csv_escape(&participant_names),
            csv_escape(&participant_amounts),
        ]
        .join(",");

        csv_data.push_str(&row);
        csv_data.push('\n');
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

// SplitBuddy CSV v2 (custom splits via "Split Details")
async fn export_session_v2(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    fn csv_escape(value: &str) -> String {
        let needs_quotes = value.contains(',') || value.contains('\n') || value.contains('"');
        if needs_quotes {
            format!("\"{}\"", value.replace('"', "\"\""))
        } else {
            value.to_string()
        }
    }

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let _session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let bills = repo.find_bills_with_details(session_id).await?;

    let mut csv_data = String::from(
        "Date,Description,Amount,Amount Original,Currency,Split Strategy,Payers,Payer Amounts,Split Details\n",
    );

    for bill in bills {
        let payer_names = bill
            .payers
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let payer_amounts = bill
            .payers
            .iter()
            .map(|p| p.amount_paid.to_string())
            .collect::<Vec<_>>()
            .join(" | ");
        let split_details = bill
            .participants
            .iter()
            .map(|p| format!("{}={}", p.name, p.amount_owed))
            .collect::<Vec<_>>()
            .join(" | ");

        let row = [
            csv_escape(&bill.created_at.format("%Y-%m-%d").to_string()),
            csv_escape(&bill.description),
            csv_escape(&bill.amount.to_string()),
            csv_escape(&bill.amount_original.to_string()),
            csv_escape(&bill.currency_code),
            csv_escape(&bill.split_strategy),
            csv_escape(&payer_names),
            csv_escape(&payer_amounts),
            csv_escape(&split_details),
        ]
        .join(",");

        csv_data.push_str(&row);
        csv_data.push('\n');
    }

    use axum::http::header;
    use axum::response::Response;

    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"session_{}_v2.csv\"", session_id),
        )
        .body(csv_data)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to build response: {}", e)))
}

#[derive(Deserialize)]
pub struct ImportCsvRequest {
    pub csv: String,
}

#[derive(Serialize)]
pub struct ImportRowError {
    pub row: usize,
    pub field: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct ImportPreviewRow {
    pub row: usize,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub currency_code: String,
    pub split_strategy: String,
    pub payers: Vec<String>,
    pub participants: Vec<String>,
}

#[derive(Serialize)]
pub struct ImportPreviewResponse {
    pub total_rows: usize,
    pub valid_rows: usize,
    pub errors: Vec<ImportRowError>,
    pub rows: Vec<ImportPreviewRow>,
}

#[derive(Serialize)]
pub struct ImportResultResponse {
    pub created_count: usize,
    pub errors: Vec<ImportRowError>,
}

struct ParsedImportRow {
    row: usize,
    description: String,
    amount: Decimal,
    amount_original: Decimal,
    currency_code: String,
    split_strategy: String,
    payer_ids: Vec<Uuid>,
    payer_amounts: Vec<Decimal>,
    participant_ids: Vec<Uuid>,
    participant_amounts: Vec<Decimal>,
}

async fn import_session_preview(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<ImportCsvRequest>,
) -> Result<Json<ApiResponse<ImportPreviewResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let (participant_map, id_to_name, duplicates) =
        build_participant_map(&state.pool, session_id).await?;
    if !duplicates.is_empty() {
        return Err(AppError::Validation {
            field: "participants".to_string(),
            message: format!(
                "Duplicate participant names found: {}",
                duplicates.join(", ")
            ),
        });
    }

    let parse_result = parse_import_csv(&payload.csv, &session.base_currency, &participant_map);

    let (rows, errors) = parse_result;
    let preview_rows = rows
        .iter()
        .map(|row| ImportPreviewRow {
            row: row.row,
            description: row.description.clone(),
            amount: row.amount,
            currency_code: row.currency_code.clone(),
            split_strategy: row.split_strategy.clone(),
            payers: row
                .payer_ids
                .iter()
                .filter_map(|id| id_to_name.get(id).cloned())
                .collect(),
            participants: row
                .participant_ids
                .iter()
                .filter_map(|id| id_to_name.get(id).cloned())
                .collect(),
        })
        .collect::<Vec<_>>();

    Ok(ok(ImportPreviewResponse {
        total_rows: rows.len() + errors.len(),
        valid_rows: rows.len(),
        errors,
        rows: preview_rows,
    }))
}

async fn import_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<ImportCsvRequest>,
) -> Result<Json<ApiResponse<ImportResultResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let (participant_map, _id_to_name, duplicates) =
        build_participant_map(&state.pool, session_id).await?;
    if !duplicates.is_empty() {
        return Err(AppError::Validation {
            field: "participants".to_string(),
            message: format!(
                "Duplicate participant names found: {}",
                duplicates.join(", ")
            ),
        });
    }

    let (rows, errors) = parse_import_csv(&payload.csv, &session.base_currency, &participant_map);

    if !errors.is_empty() {
        return Ok(ok(ImportResultResponse {
            created_count: 0,
            errors,
        }));
    }

    let mut created_count = 0;
    for row in rows {
        let mut payers = Vec::new();
        for (idx, participant_id) in row.payer_ids.iter().enumerate() {
            let amount = row.payer_amounts.get(idx).cloned().unwrap_or(Decimal::ZERO);
            payers.push(PayerInput {
                participant_id: *participant_id,
                amount,
            });
        }

        let split_details = row
            .participant_ids
            .iter()
            .enumerate()
            .map(|(idx, participant_id)| SplitDetailInput {
                participant_id: *participant_id,
                amount: row
                    .participant_amounts
                    .get(idx)
                    .cloned()
                    .unwrap_or(Decimal::ZERO),
            })
            .collect::<Vec<_>>();

        let split_strategy = if split_details.is_empty() {
            row.split_strategy.clone()
        } else {
            "CUSTOM".to_string()
        };

        let exchange_rate =
            if row.amount_original > Decimal::ZERO && row.currency_code != session.base_currency {
                row.amount / row.amount_original
            } else {
                Decimal::ONE
            };

        repo.create_bill(
            session_id,
            &row.description,
            row.amount,
            row.amount_original,
            &row.currency_code,
            exchange_rate,
            "import_csv",
            chrono::Utc::now(),
            &split_strategy,
            auth_user.user_id,
            &payers,
            if split_details.is_empty() {
                None
            } else {
                Some(split_details.as_slice())
            },
            None,
        )
        .await?;

        created_count += 1;
    }

    AuditLogBuilder::new(
        AuditAction::Custom("session_import_csv".to_string()),
        AuditEntityType::Session,
    )
    .user(auth_user.user_id, None)
    .entity_id(session_id)
    .metadata(serde_json::json!({
        "created_count": created_count,
        "total_rows": created_count,
    }))
    .log(&state.pool)
    .await
    .ok();

    Ok(ok(ImportResultResponse {
        created_count,
        errors: Vec::new(),
    }))
}

async fn build_participant_map(
    pool: &sqlx::PgPool,
    session_id: Uuid,
) -> Result<(HashMap<String, Uuid>, HashMap<Uuid, String>, Vec<String>), AppError> {
    #[derive(sqlx::FromRow)]
    struct ParticipantRow {
        id: Uuid,
        name: String,
    }

    let rows: Vec<ParticipantRow> = sqlx::query_as(
        r#"
        SELECT sp.id, COALESCE(u.full_name, sp.guest_name, 'Unknown') as name
        FROM session_participants sp
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sp.session_id = $1
        "#,
    )
    .bind(session_id)
    .fetch_all(pool)
    .await?;

    let mut map = HashMap::new();
    let mut id_to_name = HashMap::new();
    let mut duplicates = Vec::new();
    for row in rows {
        let key = row.name.to_lowercase();
        if let std::collections::hash_map::Entry::Vacant(entry) = map.entry(key) {
            entry.insert(row.id);
            id_to_name.insert(row.id, row.name);
        } else {
            duplicates.push(row.name);
        }
    }

    Ok((map, id_to_name, duplicates))
}

fn parse_import_csv(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            return (
                Vec::new(),
                vec![ImportRowError {
                    row: 0,
                    field: "csv".to_string(),
                    message: format!("Failed to read headers: {}", err),
                }],
            );
        }
    };

    let header_set = headers
        .iter()
        .map(|h| h.trim().to_lowercase())
        .collect::<Vec<_>>();

    let is_splitbuddy = header_set
        .iter()
        .any(|h| h == "payer amounts" || h == "participant amounts" || h == "split details");
    let is_splitwise = header_set.iter().any(|h| h == "paid by" || h == "cost");

    if is_splitbuddy {
        let is_v2 = header_set.iter().any(|h| h == "split details");
        if is_v2 {
            parse_splitbuddy_csv_v2(csv_text, base_currency, participant_map)
        } else {
            parse_splitbuddy_csv(csv_text, base_currency, participant_map)
        }
    } else if is_splitwise {
        parse_splitwise_csv(csv_text, base_currency, participant_map)
    } else {
        (
            Vec::new(),
            vec![ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: "Unknown CSV format. Please upload SplitBuddy v1/v2 or Splitwise CSV."
                    .to_string(),
            }],
        )
    }
}

fn parse_splitbuddy_csv(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut errors = Vec::new();
    let mut rows = Vec::new();

    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            errors.push(ImportRowError {
                row: 0,
                field: "csv".to_string(),
                message: format!("Failed to read headers: {}", err),
            });
            return (rows, errors);
        }
    };

    let header_index = |name: &str| -> Option<usize> {
        headers
            .iter()
            .position(|h| h.trim().eq_ignore_ascii_case(name))
    };

    let idx_description = header_index("Description");
    let idx_amount = header_index("Amount");
    let idx_amount_original = header_index("Amount Original");
    let idx_currency = header_index("Currency");
    let idx_split_strategy = header_index("Split Strategy");
    let idx_payers = header_index("Payers");
    let idx_payer_amounts = header_index("Payer Amounts");
    let idx_participants = header_index("Participants");
    let idx_participant_amounts = header_index("Participant Amounts");

    let required = [
        ("Description", idx_description),
        ("Amount", idx_amount),
        ("Split Strategy", idx_split_strategy),
        ("Payers", idx_payers),
        ("Payer Amounts", idx_payer_amounts),
        ("Participants", idx_participants),
        ("Participant Amounts", idx_participant_amounts),
    ];

    for (name, idx) in required {
        if idx.is_none() {
            errors.push(ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: format!("Missing required header: {}", name),
            });
        }
    }

    if !errors.is_empty() {
        return (rows, errors);
    }

    for (i, result) in rdr.records().enumerate() {
        let row_num = i + 2;
        let record = match result {
            Ok(r) => r,
            Err(err) => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "row".to_string(),
                    message: format!("Invalid row: {}", err),
                });
                continue;
            }
        };

        let get = |idx: Option<usize>| idx.and_then(|i| record.get(i)).unwrap_or("").trim();

        let mut row_errors = Vec::new();

        let description = get(idx_description).to_string();
        if description.is_empty() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Description".to_string(),
                message: "Description is required".to_string(),
            });
        }

        let amount = match Decimal::from_str(get(idx_amount)) {
            Ok(val) if val > Decimal::ZERO => val,
            _ => {
                row_errors.push(ImportRowError {
                    row: row_num,
                    field: "Amount".to_string(),
                    message: "Invalid amount".to_string(),
                });
                Decimal::ZERO
            }
        };

        if !row_errors.is_empty() {
            errors.extend(row_errors);
            continue;
        }

        let amount_original = Decimal::from_str(get(idx_amount_original)).unwrap_or(amount);

        let currency_code = if idx_currency.is_some() && !get(idx_currency).is_empty() {
            get(idx_currency).to_uppercase()
        } else {
            base_currency.to_string()
        };

        let split_strategy = get(idx_split_strategy).to_uppercase();

        let payers = split_list(get(idx_payers));
        let payer_amounts = parse_decimal_list(get(idx_payer_amounts));
        if payers.is_empty() || payer_amounts.is_empty() || payers.len() != payer_amounts.len() {
            errors.push(ImportRowError {
                row: row_num,
                field: "Payers".to_string(),
                message: "Payers and payer amounts must match".to_string(),
            });
            continue;
        }

        let participants = split_list(get(idx_participants));
        let participant_amounts = parse_decimal_list(get(idx_participant_amounts));
        if participants.is_empty()
            || participant_amounts.is_empty()
            || participants.len() != participant_amounts.len()
        {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participants".to_string(),
                message: "Participants and participant amounts must match".to_string(),
            });
            continue;
        }

        let mut payer_ids = Vec::new();
        for name in &payers {
            let key = name.to_lowercase();
            match participant_map.get(&key) {
                Some(id) => payer_ids.push(*id),
                None => {
                    errors.push(ImportRowError {
                        row: row_num,
                        field: "Payers".to_string(),
                        message: format!("Unknown payer: {}", name),
                    });
                }
            }
        }

        let mut participant_ids = Vec::new();
        for name in &participants {
            let key = name.to_lowercase();
            match participant_map.get(&key) {
                Some(id) => participant_ids.push(*id),
                None => {
                    errors.push(ImportRowError {
                        row: row_num,
                        field: "Participants".to_string(),
                        message: format!("Unknown participant: {}", name),
                    });
                }
            }
        }

        if payer_ids.len() != payers.len() || participant_ids.len() != participants.len() {
            continue;
        }

        let total_paid: Decimal = payer_amounts.iter().cloned().sum();
        if total_paid != amount {
            errors.push(ImportRowError {
                row: row_num,
                field: "Payer Amounts".to_string(),
                message: "Sum of payer amounts must equal Amount".to_string(),
            });
            continue;
        }

        let total_owed: Decimal = participant_amounts.iter().cloned().sum();
        if total_owed != amount {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participant Amounts".to_string(),
                message: "Sum of participant amounts must equal Amount".to_string(),
            });
            continue;
        }

        rows.push(ParsedImportRow {
            row: row_num,
            description,
            amount,
            amount_original,
            currency_code,
            split_strategy,
            payer_ids,
            payer_amounts,
            participant_ids,
            participant_amounts,
        });
    }

    (rows, errors)
}

fn parse_splitbuddy_csv_v2(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut errors = Vec::new();
    let mut rows = Vec::new();

    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            errors.push(ImportRowError {
                row: 0,
                field: "csv".to_string(),
                message: format!("Failed to read headers: {}", err),
            });
            return (rows, errors);
        }
    };

    let header_index = |name: &str| -> Option<usize> {
        headers
            .iter()
            .position(|h| h.trim().eq_ignore_ascii_case(name))
    };

    let idx_description = header_index("Description");
    let idx_amount = header_index("Amount");
    let idx_amount_original = header_index("Amount Original");
    let idx_currency = header_index("Currency");
    let idx_split_strategy = header_index("Split Strategy");
    let idx_payers = header_index("Payers");
    let idx_payer_amounts = header_index("Payer Amounts");
    let idx_split_details = header_index("Split Details");

    let required = [
        ("Description", idx_description),
        ("Amount", idx_amount),
        ("Split Strategy", idx_split_strategy),
        ("Payers", idx_payers),
        ("Payer Amounts", idx_payer_amounts),
        ("Split Details", idx_split_details),
    ];

    for (name, idx) in required {
        if idx.is_none() {
            errors.push(ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: format!("Missing required header: {}", name),
            });
        }
    }

    if !errors.is_empty() {
        return (rows, errors);
    }

    for (i, result) in rdr.records().enumerate() {
        let row_num = i + 2;
        let record = match result {
            Ok(r) => r,
            Err(err) => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "row".to_string(),
                    message: format!("Invalid row: {}", err),
                });
                continue;
            }
        };

        let get = |idx: Option<usize>| idx.and_then(|i| record.get(i)).unwrap_or("").trim();

        let mut row_errors = Vec::new();

        let description = get(idx_description).to_string();
        if description.is_empty() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Description".to_string(),
                message: "Description is required".to_string(),
            });
        }

        let amount = match Decimal::from_str(get(idx_amount)) {
            Ok(val) if val > Decimal::ZERO => val,
            _ => {
                row_errors.push(ImportRowError {
                    row: row_num,
                    field: "Amount".to_string(),
                    message: "Invalid amount".to_string(),
                });
                Decimal::ZERO
            }
        };

        if !row_errors.is_empty() {
            errors.extend(row_errors);
            continue;
        }

        let amount_original = Decimal::from_str(get(idx_amount_original)).unwrap_or(amount);

        let currency_code = if idx_currency.is_some() && !get(idx_currency).is_empty() {
            get(idx_currency).to_uppercase()
        } else {
            base_currency.to_string()
        };

        let split_strategy = get(idx_split_strategy).to_uppercase();

        let payers = split_list(get(idx_payers));
        let payer_amounts = parse_decimal_list(get(idx_payer_amounts));
        if payers.is_empty() || payer_amounts.is_empty() || payers.len() != payer_amounts.len() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Payers".to_string(),
                message: "Payers and payer amounts must match".to_string(),
            });
        }

        let (participant_names, participant_amounts) = parse_split_details(get(idx_split_details));
        if participant_names.is_empty() || participant_amounts.is_empty() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Split Details".to_string(),
                message: "Split details must include participant=amount pairs".to_string(),
            });
        }

        if participant_names.len() != participant_amounts.len() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Split Details".to_string(),
                message: "Split details entries must match participant and amount".to_string(),
            });
        }

        let mut payer_ids = Vec::new();
        let mut participant_ids = Vec::new();

        for payer in &payers {
            if let Some(id) = participant_map.get(&payer.to_lowercase()) {
                payer_ids.push(*id);
            } else {
                row_errors.push(ImportRowError {
                    row: row_num,
                    field: "Payers".to_string(),
                    message: format!("Unknown payer: {}", payer),
                });
            }
        }

        for participant in &participant_names {
            if let Some(id) = participant_map.get(&participant.to_lowercase()) {
                participant_ids.push(*id);
            } else {
                row_errors.push(ImportRowError {
                    row: row_num,
                    field: "Split Details".to_string(),
                    message: format!("Unknown participant: {}", participant),
                });
            }
        }

        if !row_errors.is_empty() {
            errors.extend(row_errors);
            continue;
        }

        rows.push(ParsedImportRow {
            row: row_num,
            description,
            amount,
            amount_original,
            currency_code,
            split_strategy,
            payer_ids,
            payer_amounts,
            participant_ids,
            participant_amounts,
        });
    }

    (rows, errors)
}

fn parse_splitwise_csv(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut errors = Vec::new();
    let mut rows = Vec::new();

    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            errors.push(ImportRowError {
                row: 0,
                field: "csv".to_string(),
                message: format!("Failed to read headers: {}", err),
            });
            return (rows, errors);
        }
    };

    let header_index = |name: &str| -> Option<usize> {
        headers
            .iter()
            .position(|h| h.trim().eq_ignore_ascii_case(name))
    };

    let idx_description = header_index("Description");
    let idx_cost = header_index("Cost");
    let idx_currency = header_index("Currency");
    let idx_paid_by = header_index("Paid by");

    let required = [
        ("Description", idx_description),
        ("Cost", idx_cost),
        ("Paid by", idx_paid_by),
    ];

    for (name, idx) in required {
        if idx.is_none() {
            errors.push(ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: format!("Missing required header: {}", name),
            });
        }
    }

    if !errors.is_empty() {
        return (rows, errors);
    }

    let known_headers = [
        "date",
        "description",
        "category",
        "cost",
        "currency",
        "paid by",
        "notes",
    ];

    let participant_headers: Vec<String> = headers
        .iter()
        .filter(|h| {
            !known_headers
                .iter()
                .any(|k| h.trim().eq_ignore_ascii_case(k))
        })
        .map(|h| h.trim().to_string())
        .collect();

    for (i, result) in rdr.records().enumerate() {
        let row_num = i + 2;
        let record = match result {
            Ok(r) => r,
            Err(err) => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "row".to_string(),
                    message: format!("Invalid row: {}", err),
                });
                continue;
            }
        };

        let get = |idx: Option<usize>| idx.and_then(|i| record.get(i)).unwrap_or("").trim();

        let description = get(idx_description).to_string();
        if description.is_empty() {
            errors.push(ImportRowError {
                row: row_num,
                field: "Description".to_string(),
                message: "Description is required".to_string(),
            });
            continue;
        }

        let cost_raw = get(idx_cost);
        let cost_clean = cost_raw.replace(',', "");
        let amount = match Decimal::from_str(cost_clean.trim()) {
            Ok(val) if val > Decimal::ZERO => val,
            _ => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "Cost".to_string(),
                    message: "Invalid cost".to_string(),
                });
                continue;
            }
        };

        let currency_code = if idx_currency.is_some() && !get(idx_currency).is_empty() {
            get(idx_currency).to_uppercase()
        } else {
            base_currency.to_string()
        };

        let paid_by_raw = get(idx_paid_by);
        let payers = split_list(paid_by_raw);
        if payers.len() != 1 {
            errors.push(ImportRowError {
                row: row_num,
                field: "Paid by".to_string(),
                message: "Only single payer is supported".to_string(),
            });
            continue;
        }

        let payer_name = payers[0].clone();
        let payer_id = match participant_map.get(&payer_name.to_lowercase()) {
            Some(id) => *id,
            None => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "Paid by".to_string(),
                    message: format!("Unknown payer: {}", payer_name),
                });
                continue;
            }
        };

        let mut participant_ids = Vec::new();
        let mut participant_amounts = Vec::new();

        for header in &participant_headers {
            if let Some(idx) = header_index(header) {
                let value = record.get(idx).unwrap_or("").trim();
                if value.is_empty() {
                    continue;
                }
                let value_clean = value.replace(',', "");
                let amount_owed = match Decimal::from_str(value_clean.trim()) {
                    Ok(val) if val > Decimal::ZERO => val,
                    _ => {
                        errors.push(ImportRowError {
                            row: row_num,
                            field: header.clone(),
                            message: "Invalid participant amount".to_string(),
                        });
                        continue;
                    }
                };

                let participant_id = match participant_map.get(&header.to_lowercase()) {
                    Some(id) => *id,
                    None => {
                        errors.push(ImportRowError {
                            row: row_num,
                            field: header.clone(),
                            message: format!("Unknown participant: {}", header),
                        });
                        continue;
                    }
                };

                participant_ids.push(participant_id);
                participant_amounts.push(amount_owed);
            }
        }

        if participant_ids.is_empty() {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participants".to_string(),
                message: "No participant amounts found".to_string(),
            });
            continue;
        }

        let total_owed: Decimal = participant_amounts.iter().cloned().sum();
        if total_owed != amount {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participants".to_string(),
                message: "Sum of participant amounts must equal Cost".to_string(),
            });
            continue;
        }

        rows.push(ParsedImportRow {
            row: row_num,
            description,
            amount,
            amount_original: amount,
            currency_code,
            split_strategy: "CUSTOM".to_string(),
            payer_ids: vec![payer_id],
            payer_amounts: vec![amount],
            participant_ids,
            participant_amounts,
        });
    }

    (rows, errors)
}

fn split_list(value: &str) -> Vec<String> {
    value
        .split(['|', '&', ';'])
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

fn parse_decimal_list(value: &str) -> Vec<Decimal> {
    value
        .split(['|', '&', ';'])
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|s| Decimal::from_str(s).ok())
        .collect()
}

fn parse_split_details(value: &str) -> (Vec<String>, Vec<Decimal>) {
    let mut names = Vec::new();
    let mut amounts = Vec::new();

    for entry in value.split(['|', '&', ';']) {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }

        let (name_raw, amount_raw) = trimmed
            .split_once('=')
            .or_else(|| trimmed.split_once(':'))
            .unwrap_or(("", ""));

        let name = name_raw.trim();
        let amount = amount_raw.trim();
        if name.is_empty() || amount.is_empty() {
            continue;
        }

        if let Ok(parsed) = Decimal::from_str(amount) {
            names.push(name.to_string());
            amounts.push(parsed);
        }
    }

    (names, amounts)
}

#[derive(Serialize)]
pub struct WhoPaysNextResponse {
    pub suggested: Option<ParticipantBalance>,
    pub balances: Vec<ParticipantBalance>,
}

#[derive(Serialize, Clone)]
pub struct ParticipantBalance {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_paid: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_owed: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}

async fn who_pays_next(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<WhoPaysNextResponse>>, AppError> {
    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    #[derive(sqlx::FromRow)]
    struct BalanceRow {
        participant_id: Uuid,
        name: String,
        total_paid: Decimal,
        total_owed: Decimal,
    }

    let rows: Vec<BalanceRow> = sqlx::query_as(
        r#"
        SELECT 
            sp.id as participant_id,
            COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
            COALESCE(SUM(bp.amount_paid), 0) as total_paid,
            COALESCE(SUM(bs.amount_owed), 0) as total_owed
        FROM session_participants sp
        LEFT JOIN users u ON sp.user_id = u.id
        LEFT JOIN bill_payers bp ON bp.participant_id = sp.id
        LEFT JOIN bill_splits bs ON bs.participant_id = sp.id
        WHERE sp.session_id = $1
          AND sp.is_active = true
        GROUP BY sp.id, u.full_name, sp.guest_name
        "#,
    )
    .bind(session_id)
    .fetch_all(&state.pool)
    .await?;

    let mut balances: Vec<ParticipantBalance> = rows
        .into_iter()
        .map(|row| ParticipantBalance {
            participant_id: row.participant_id,
            name: row.name,
            total_paid: row.total_paid,
            total_owed: row.total_owed,
            balance: row.total_paid - row.total_owed,
        })
        .collect();

    // Lowest balance (most negative) should pay next
    balances.sort_by_key(|a| a.balance);
    let suggested = balances.first().cloned();

    Ok(ok(WhoPaysNextResponse {
        suggested,
        balances,
    }))
}
