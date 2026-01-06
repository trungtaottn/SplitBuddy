use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(health_check))
        .route("/ready", get(readiness_check))
        .route("/live", get(liveness_check))
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub database: String,
    pub cache: String,
}

/// Basic health check - always returns OK if server is running
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Liveness probe - confirms the application is alive
async fn liveness_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "alive"
    }))
}

/// Readiness probe - checks if all dependencies are ready
async fn readiness_check(State(state): State<AppState>) -> Json<ReadinessResponse> {
    // Check database connectivity
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    // Cache is always ready (in-memory)
    let cache_status = "ready";

    let overall_status = if db_status == "connected" && cache_status == "ready" {
        "ready"
    } else {
        "not_ready"
    };

    Json(ReadinessResponse {
        status: overall_status.to_string(),
        database: db_status.to_string(),
        cache: cache_status.to_string(),
    })
}
