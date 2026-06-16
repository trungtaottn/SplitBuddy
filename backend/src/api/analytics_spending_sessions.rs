use sqlx::PgPool;
use uuid::Uuid;

use crate::api::analytics_dto::AnalyticsQuery;
use crate::error::AppError;

pub async fn fetch_session_count(
    pool: &PgPool,
    user_id: Uuid,
    query: &AnalyticsQuery,
) -> Result<i64, AppError> {
    if let Some(session_id) = query.session_id {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.id = $2
            "#,
        )
        .bind(user_id)
        .bind(session_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    } else if let (Some(from), Some(to)) = (query.from, query.to) {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date BETWEEN $2 AND $3
            "#,
        )
        .bind(user_id)
        .bind(from)
        .bind(to)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    } else if let Some(from) = query.from {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date >= $2
            "#,
        )
        .bind(user_id)
        .bind(from)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    } else if let Some(to) = query.to {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1 AND s.session_date <= $2
            "#,
        )
        .bind(user_id)
        .bind(to)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    } else {
        sqlx::query_scalar(
            r#"
            SELECT COUNT(DISTINCT s.id)::bigint
            FROM sessions s
            JOIN session_participants sp ON s.id = sp.session_id
            WHERE sp.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    }
}
