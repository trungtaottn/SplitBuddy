use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use rust_decimal::Decimal;

use crate::api::debts_dto::{DebtSummaryResponse, SessionDebtResponse};
use crate::api::debts_settlement::{confirm_settle, request_settle, settle_guest_debt};
use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::debt_repo::DebtRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_my_debts))
        .route("/sessions", get(get_debts_by_session))
        .route("/:id/request-settle", post(request_settle))
        .route("/:id/confirm-settle", post(confirm_settle))
        .route("/:id/settle-guest", post(settle_guest_debt))
}

async fn get_my_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<DebtSummaryResponse>>, AppError> {
    require_feature_enabled(&state, "debts").await?;

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
    require_feature_enabled(&state, "debts").await?;

    let repo = DebtRepository::new(state.pool.clone());
    let sessions = repo.get_session_debts(auth_user.user_id).await?;
    Ok(ok(sessions))
}
