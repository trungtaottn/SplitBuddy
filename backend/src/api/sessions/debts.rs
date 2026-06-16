use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session::SessionDebtRepository;
use crate::repository::session_repo::SessionRepository; // For verification

#[derive(Serialize)]
pub struct DebtStatsResponse {
    pub total_pending: Decimal,
    pub total_settled: Decimal,
    pub pending_count: i64,
    pub settled_count: i64,
}

#[derive(Serialize)]
pub struct DebtInfoResponse {
    pub id: Uuid,
    pub debtor_id: Uuid,
    pub creditor_id: Uuid,
    pub amount: Decimal,
    pub status: String,
}

pub async fn get_debt_stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<DebtStatsResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    // Verify access via SessionRepository
    let session_repo = SessionRepository::new(state.pool.clone());
    session_repo
        .verify_participant(session_id, auth_user.user_id)
        .await?;

    let debt_repo = SessionDebtRepository::new(state.pool.clone());
    let stats = debt_repo.get_debt_stats(session_id).await?;

    Ok(ok(DebtStatsResponse {
        total_pending: stats.total_pending,
        total_settled: stats.total_settled,
        pending_count: stats.pending_count,
        settled_count: stats.settled_count,
    }))
}

pub async fn get_pending_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<DebtInfoResponse>>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    // Verify access
    let session_repo = SessionRepository::new(state.pool.clone());
    session_repo
        .verify_participant(session_id, auth_user.user_id)
        .await?;

    let debt_repo = SessionDebtRepository::new(state.pool.clone());
    let debts = debt_repo.get_pending_debts(session_id).await?;

    let response = debts
        .into_iter()
        .map(|d| DebtInfoResponse {
            id: d.id,
            debtor_id: d.debtor_id,
            creditor_id: d.creditor_id,
            amount: d.amount,
            status: d.status,
        })
        .collect();

    Ok(ok(response))
}
