use axum::{routing::get, Router};

use crate::api::analytics_categories::get_category_breakdown;
use crate::api::analytics_spending::get_spending_analytics;
use crate::api::analytics_trends::get_spending_trends;
use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/spending", get(get_spending_analytics))
        .route("/categories", get(get_category_breakdown))
        .route("/trends", get(get_spending_trends))
}
