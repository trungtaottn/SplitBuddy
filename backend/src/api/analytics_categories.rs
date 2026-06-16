use axum::{extract::Query, extract::State, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::analytics_dto::{AnalyticsQuery, CategorySpending};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn get_category_breakdown(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<ApiResponse<Vec<CategorySpending>>>, AppError> {
    Ok(ok(fetch_category_breakdown(
        &state.pool,
        auth_user.user_id,
        &query,
    )
    .await?))
}

pub async fn fetch_category_breakdown(
    pool: &PgPool,
    user_id: Uuid,
    query: &AnalyticsQuery,
) -> Result<Vec<CategorySpending>, AppError> {
    if let Some(session_id) = query.session_id {
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
        .bind(user_id)
        .bind(session_id)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(from)
        .bind(to)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(from)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(to)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)
    }
}
