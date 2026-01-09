use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use uuid::Uuid;

use crate::api::response::ok;
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use serde::Deserialize;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/spending", get(get_spending_analytics))
        .route("/categories", get(get_category_breakdown))
        .route("/trends", get(get_spending_trends))
}

#[derive(Deserialize)]
pub struct AnalyticsQuery {
    pub from: Option<chrono::NaiveDate>,
    pub to: Option<chrono::NaiveDate>,
    pub session_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct SpendingAnalyticsResponse {
    pub total_spent: String,
    pub total_received: String,
    pub net_balance: String,
    pub session_count: i64,
    pub avg_per_session: String,
    pub top_category: Option<CategorySpending>,
    pub category_breakdown: Vec<CategorySpending>,
}

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct CategorySpending {
    pub category_id: Option<Uuid>,
    pub category_name: Option<String>,
    pub total_amount: String,
    pub bill_count: i64,
}

#[derive(Serialize)]
pub struct SpendingTrendsResponse {
    pub monthly: Vec<MonthlySpending>,
    pub yearly: Vec<YearlySpending>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MonthlySpending {
    pub year: i32,
    pub month: i32,
    pub total_amount: String,
    pub session_count: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct YearlySpending {
    pub year: i32,
    pub total_amount: String,
    pub session_count: i64,
}

/// Get spending analytics for the authenticated user
pub async fn get_spending_analytics(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<SpendingAnalyticsResponse>>, AppError> {
    use rust_decimal::Decimal;

    // Get total spent (as payer)
    let total_spent: Decimal = if let Some(session_id) = query.session_id {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(bp.amount_paid), 0)
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            JOIN sessions s ON b.session_id = s.id
            JOIN session_participants sp ON bp.participant_id = sp.id
            WHERE sp.user_id = $1 AND s.id = $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(session_id)
        .fetch_one(&state.pool)
        .await?
    } else if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(bp.amount_paid), 0)
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            JOIN sessions s ON b.session_id = s.id
            JOIN session_participants sp ON bp.participant_id = sp.id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(from) = query.from {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(bp.amount_paid), 0)
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            JOIN sessions s ON b.session_id = s.id
            JOIN session_participants sp ON bp.participant_id = sp.id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(to) = query.to {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(bp.amount_paid), 0)
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            JOIN sessions s ON b.session_id = s.id
            JOIN session_participants sp ON bp.participant_id = sp.id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(bp.amount_paid), 0)
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            JOIN sessions s ON b.session_id = s.id
            JOIN session_participants sp ON bp.participant_id = sp.id
            WHERE sp.user_id = $1
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    };

    // Get total received (as creditor)
    let total_received: Decimal = if let Some(session_id) = query.session_id {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.id = $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(session_id)
        .fetch_one(&state.pool)
        .await?
    } else if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date BETWEEN $2 AND $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(from) = query.from {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date >= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(to) = query.to {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date <= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled'
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    };

    // Get session count
    let session_count: i64 = if let Some(session_id) = query.session_id {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.id = $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(session_id)
        .fetch_one(&state.pool)
        .await?
    } else if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(from) = query.from {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(from)
        .fetch_one(&state.pool)
        .await?
    } else if let Some(to) = query.to {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            "#,
        )
        .bind(auth_user.user_id)
        .bind(to)
        .fetch_one(&state.pool)
        .await?
    } else {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await?
    };

    // Get category breakdown
    let category_breakdown: Vec<CategorySpending> = if let Some(session_id) = query.session_id {
        sqlx::query_as(
            r#"
            SELECT 
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.id = $2
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
            "#,
        )
        .bind(auth_user.user_id)
        .bind(session_id)
        .fetch_all(&state.pool)
        .await?
    } else if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_as(
            r#"
            SELECT 
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
            "#,
        )
        .bind(auth_user.user_id)
        .fetch_all(&state.pool)
        .await?
    };

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

/// Get category breakdown
pub async fn get_category_breakdown(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<Vec<CategorySpending>>>, AppError> {
    let category_breakdown: Vec<CategorySpending> =
        if let (Some(from), Some(to)) = (query.from, query.to) {
            sqlx::query_as(
                r#"
            SELECT 
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
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
                ec.id as category_id,
                ec.name as category_name,
                COALESCE(SUM(b.amount), 0)::text as total_amount,
                COUNT(b.id)::bigint as bill_count
            FROM expense_categories ec
            LEFT JOIN bills b ON b.category_id = ec.id
            LEFT JOIN sessions s ON b.session_id = s.id
            LEFT JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1
            GROUP BY ec.id, ec.name
            HAVING COUNT(b.id) > 0
            ORDER BY SUM(b.amount) DESC
            "#,
            )
            .bind(auth_user.user_id)
            .fetch_all(&state.pool)
            .await?
        };

    Ok(ok(category_breakdown))
}

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
