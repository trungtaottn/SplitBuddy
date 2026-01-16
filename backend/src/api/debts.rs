use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::api::response::{ok, ApiResponse};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::domain::debt::DebtStatus;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::debt_repo::DebtRepository;
use crate::repository::session_repo::SessionRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_my_debts))
        .route("/sessions", get(get_debts_by_session))
        .route("/:id/request-settle", post(request_settle))
        .route("/:id/confirm-settle", post(confirm_settle))
        .route("/:id/settle-guest", post(settle_guest_debt))
}

#[derive(Serialize)]
pub struct DebtSummaryResponse {
    pub i_owe: Vec<DebtItemResponse>,
    pub owed_to_me: Vec<DebtItemResponse>,
    pub total_i_owe: String,
    pub total_owed_to_me: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct DebtItemResponse {
    pub id: Uuid,
    pub session_id: Uuid,
    pub session_name: String,
    pub counterpart_id: Uuid,
    pub counterpart_name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub status: DebtStatus,
    pub is_guest: bool, // Whether the counterpart (debtor for owed_to_me) is a guest
    // Optional payment info for settlement UX (only available for registered users with default bank account)
    pub counterpart_bank_name: Option<String>,
    pub counterpart_account_number: Option<String>,
    pub counterpart_account_holder_name: Option<String>,
    pub counterpart_qr_image_url: Option<String>,
}

#[derive(Serialize)]
pub struct SettleResponse {
    pub debt_id: Uuid,
    pub status: DebtStatus,
    pub message: String,
}

#[derive(Serialize)]
pub struct SessionDebtResponse {
    pub session_id: Uuid,
    pub session_name: String,
    pub session_date: chrono::NaiveDate,
    pub participants: Vec<ParticipantDebtResponse>,
}

#[derive(Serialize)]
pub struct ParticipantDebtResponse {
    pub participant_id: Uuid,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_paid: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_owed: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}

async fn get_my_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<DebtSummaryResponse>>, AppError> {
    let repo = DebtRepository::new(state.pool.clone());

    let (i_owe, owed_to_me) = repo.find_by_user(auth_user.user_id).await?;

    let total_i_owe: Decimal = i_owe.iter().map(|d| d.amount).sum();
    let total_owed_to_me: Decimal = owed_to_me.iter().map(|d| d.amount).sum();

    Ok(ok(DebtSummaryResponse {
        i_owe,
        owed_to_me,
        total_i_owe: total_i_owe.to_string(),
        total_owed_to_me: total_owed_to_me.to_string(),
    }))
}

async fn get_debts_by_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<SessionDebtResponse>>>, AppError> {
    let repo = DebtRepository::new(state.pool.clone());
    let sessions = repo.get_session_debts(auth_user.user_id).await?;
    Ok(ok(sessions))
}

async fn request_settle(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    let repo = DebtRepository::new(state.pool.clone());

    let debt = repo.request_settlement(debt_id, auth_user.user_id).await?;

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Settlement request sent. Waiting for creditor confirmation.".to_string(),
    }))
}

async fn confirm_settle(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    let repo = DebtRepository::new(state.pool.clone());

    let debt = repo.confirm_settlement(debt_id, auth_user.user_id).await?;

    auto_archive_if_settled(&state.pool, debt.session_id)
        .await
        .ok();

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Settlement confirmed. Debt has been cleared.".to_string(),
    }))
}

/// Settle a debt from a guest (non-user participant) directly
/// This allows creditors to mark guest debts as settled without waiting for settlement request
async fn settle_guest_debt(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    let repo = DebtRepository::new(state.pool.clone());

    let debt = repo.settle_guest_debt(debt_id, auth_user.user_id).await?;

    auto_archive_if_settled(&state.pool, debt.session_id)
        .await
        .ok();

    // Broadcast WebSocket event
    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Guest debt has been settled.".to_string(),
    }))
}

async fn auto_archive_if_settled(pool: &sqlx::PgPool, session_id: Uuid) -> Result<(), AppError> {
    #[derive(sqlx::FromRow)]
    struct DebtCountRow {
        total: i64,
        unsettled: i64,
    }

    let counts: DebtCountRow = sqlx::query_as(
        r#"
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status != 'settled') as unsettled
        FROM debts
        WHERE session_id = $1
        "#,
    )
    .bind(session_id)
    .fetch_one(pool)
    .await?;

    if counts.total > 0 && counts.unsettled == 0 {
        let repo = SessionRepository::new(pool.clone());
        let _ = repo.set_archived(session_id, true).await?;
    }

    Ok(())
}
