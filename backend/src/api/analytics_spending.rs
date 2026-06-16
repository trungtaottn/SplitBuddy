use axum::{
    extract::{Query, State},
    Json,
};
use rust_decimal::Decimal;

use crate::api::analytics_categories::fetch_category_breakdown;
use crate::api::analytics_dto::{AnalyticsQuery, SpendingAnalyticsResponse};
use crate::api::analytics_spending_amounts::{fetch_total_received, fetch_total_spent};
use crate::api::analytics_spending_sessions::fetch_session_count;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn get_spending_analytics(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<SpendingAnalyticsResponse>>, AppError> {
    let total_spent = fetch_total_spent(&state.pool, auth_user.user_id, &query).await?;
    let total_received = fetch_total_received(&state.pool, auth_user.user_id, &query).await?;
    let session_count = fetch_session_count(&state.pool, auth_user.user_id, &query).await?;
    let category_breakdown =
        fetch_category_breakdown(&state.pool, auth_user.user_id, &query).await?;

    let top_category = category_breakdown.first().cloned();
    let avg_per_session = if session_count > 0 {
        total_spent / Decimal::from(session_count)
    } else {
        Decimal::ZERO
    };

    Ok(ok(SpendingAnalyticsResponse {
        total_spent: total_spent.to_string(),
        total_received: total_received.to_string(),
        net_balance: (total_received - total_spent).to_string(),
        session_count,
        avg_per_session: avg_per_session.to_string(),
        top_category,
        category_breakdown,
    }))
}
