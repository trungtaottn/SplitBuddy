use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::analytics_dto::AnalyticsQuery;
use crate::error::AppError;

pub async fn fetch_total_spent(
    pool: &PgPool,
    user_id: Uuid,
    query: &AnalyticsQuery,
) -> Result<Decimal, AppError> {
    if let Some(session_id) = query.session_id {
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
        .bind(user_id)
        .bind(session_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(from)
        .bind(to)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(from)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .bind(to)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
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
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    }
}

pub async fn fetch_total_received(
    pool: &PgPool,
    user_id: Uuid,
    query: &AnalyticsQuery,
) -> Result<Decimal, AppError> {
    if let Some(session_id) = query.session_id {
        sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.id = $2
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
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date BETWEEN $2 AND $3
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
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date >= $2
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
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled' AND s.session_date <= $2
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
            SELECT COALESCE(SUM(d.amount), 0)
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE sp.user_id = $1 AND d.status = 'settled'
            "#,
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(AppError::from)
    }
}
