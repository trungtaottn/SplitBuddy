use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::utils::forex::normalize_currency;

#[derive(Deserialize)]
struct RateHistoryQuery {
    base: String,
    quote: String,
    limit: Option<i64>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct RateHistoryEntry {
    pub rate_date: NaiveDate,
    #[serde(with = "rust_decimal::serde::str")]
    pub rate: Decimal,
    pub rate_source: String,
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/rates/history", get(get_rate_history))
}

async fn get_rate_history(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Query(query): Query<RateHistoryQuery>,
) -> Result<Json<ApiResponse<Vec<RateHistoryEntry>>>, AppError> {
    let base = normalize_currency(&query.base)?;
    let quote = normalize_currency(&query.quote)?;

    let limit = query.limit.unwrap_or(14).clamp(1, 90);

    let rows: Vec<RateHistoryEntry> = sqlx::query_as(
        r#"
        SELECT rate_date, rate, rate_source
        FROM exchange_rates
        WHERE base_currency = $1 AND quote_currency = $2
        ORDER BY rate_date DESC
        LIMIT $3
        "#,
    )
    .bind(base)
    .bind(quote)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(rows))
}
