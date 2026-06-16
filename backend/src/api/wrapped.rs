use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::Datelike;

use crate::api::response::ApiResponse;
use crate::api::wrapped_dto::{WrappedData, WrappedQuery, WrappedStats};
use crate::api::wrapped_stats::generate_wrapped_stats;
use crate::api::AppState;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/me", get(get_my_wrapped))
        .route("/generate", get(generate_wrapped))
}

// Get cached wrapped or generate new
async fn get_my_wrapped(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<WrappedQuery>,
) -> Result<Json<ApiResponse<WrappedStats>>, (axum::http::StatusCode, String)> {
    let year = query.year.unwrap_or_else(|| chrono::Utc::now().year());
    let period = query.period.unwrap_or_else(|| "yearly".to_string());

    // Try to get cached wrapped
    let cached: Option<WrappedData> = sqlx::query_as(
        r#"
        SELECT id, user_id, year, period, stats, generated_at
        FROM user_wrapped
        WHERE user_id = $1 AND year = $2 AND period = $3
        "#,
    )
    .bind(auth_user.user_id)
    .bind(year)
    .bind(&period)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(wrapped) = cached {
        let stats: WrappedStats = serde_json::from_value(wrapped.stats)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        return Ok(Json(ApiResponse::new(stats)));
    }

    // Generate new wrapped
    let stats = generate_wrapped_stats(&state.pool, auth_user.user_id, year, &period).await?;

    // Cache it
    if let Ok(stats_json) = serde_json::to_value(&stats) {
        let _ = sqlx::query(
            r#"
            INSERT INTO user_wrapped (user_id, year, period, stats)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, year, period) 
            DO UPDATE SET stats = $4, generated_at = NOW()
            "#,
        )
        .bind(auth_user.user_id)
        .bind(year)
        .bind(&period)
        .bind(stats_json)
        .execute(&state.pool)
        .await;
    }

    Ok(Json(ApiResponse::new(stats)))
}

// Force regenerate wrapped
async fn generate_wrapped(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<WrappedQuery>,
) -> Result<Json<ApiResponse<WrappedStats>>, (axum::http::StatusCode, String)> {
    let year = query.year.unwrap_or_else(|| chrono::Utc::now().year());
    let period = query.period.unwrap_or_else(|| "yearly".to_string());

    let stats = generate_wrapped_stats(&state.pool, auth_user.user_id, year, &period).await?;

    // Update cache
    if let Ok(stats_json) = serde_json::to_value(&stats) {
        let _ = sqlx::query(
            r#"
            INSERT INTO user_wrapped (user_id, year, period, stats)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, year, period) 
            DO UPDATE SET stats = $4, generated_at = NOW()
            "#,
        )
        .bind(auth_user.user_id)
        .bind(year)
        .bind(&period)
        .bind(stats_json)
        .execute(&state.pool)
        .await;
    }

    Ok(Json(ApiResponse::new(stats)))
}
