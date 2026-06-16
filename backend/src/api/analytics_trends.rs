use axum::{
    extract::{Query, State},
    Json,
};

use crate::api::analytics_dto::{
    AnalyticsQuery, MonthlySpending, SpendingTrendsResponse, YearlySpending,
};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

/// Get spending trends (monthly and yearly)
pub async fn get_spending_trends(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<SpendingTrendsResponse>>, AppError> {
    // Monthly trends
    let monthly: Vec<MonthlySpending> = if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                EXTRACT(MONTH FROM s.session_date)::int as month,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            GROUP BY EXTRACT(YEAR FROM s.session_date), EXTRACT(MONTH FROM s.session_date)
            ORDER BY year DESC, month DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .bind(to)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(from) = query.from {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                EXTRACT(MONTH FROM s.session_date)::int as month,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            GROUP BY EXTRACT(YEAR FROM s.session_date), EXTRACT(MONTH FROM s.session_date)
            ORDER BY year DESC, month DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(to) = query.to {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                EXTRACT(MONTH FROM s.session_date)::int as month,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            GROUP BY EXTRACT(YEAR FROM s.session_date), EXTRACT(MONTH FROM s.session_date)
            ORDER BY year DESC, month DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(to)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                EXTRACT(MONTH FROM s.session_date)::int as month,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1
            GROUP BY EXTRACT(YEAR FROM s.session_date), EXTRACT(MONTH FROM s.session_date)
            ORDER BY year DESC, month DESC
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_all(&state.pool)
        .await?
    };

    // Yearly trends
    let yearly: Vec<YearlySpending> = if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            GROUP BY EXTRACT(YEAR FROM s.session_date)
            ORDER BY year DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .bind(to)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(from) = query.from {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            GROUP BY EXTRACT(YEAR FROM s.session_date)
            ORDER BY year DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .fetch_all(&state.pool)
        .await?
    } else if let Some(to) = query.to {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            GROUP BY EXTRACT(YEAR FROM s.session_date)
            ORDER BY year DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(to)
        .fetch_all(&state.pool)
        .await?
    } else {
        sqlx::query_as(
            r#"
            SELECT 
                EXTRACT(YEAR FROM s.session_date)::int as year,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(DISTINCT s.id)::bigint as session_count
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            LEFT JOIN bills b ON b.session_id = s.id
            WHERE sp.user_id = $1
            GROUP BY EXTRACT(YEAR FROM s.session_date)
            ORDER BY year DESC
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_all(&state.pool)
        .await?
    };

    Ok(ok(SpendingTrendsResponse { monthly, yearly }))
}
