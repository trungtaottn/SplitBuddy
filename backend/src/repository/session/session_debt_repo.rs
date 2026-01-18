//! Session Debt Repository
//!
//! Provides specialized operations for debts within sessions.
//! Currently delegates to SessionRepository, will be migrated incrementally.

use rust_decimal::Decimal;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::error::AppError;
use crate::repository::session_repo::SessionRepository;

/// Repository for debt-related operations within sessions
#[allow(dead_code)]
pub struct SessionDebtRepository {
    pool: PgPool,
    session_repo: SessionRepository,
}

impl SessionDebtRepository {
    pub fn new(pool: PgPool) -> Self {
        Self {
            session_repo: SessionRepository::new(pool.clone()),
            pool,
        }
    }

    /// Get pool reference for direct queries
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ========================================
    // Delegated methods (Phase 1)
    // ========================================

    /// Get user's debt/owed amounts in a session
    pub async fn get_user_debt_in_session(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(Decimal, Decimal), AppError> {
        self.session_repo
            .get_user_debt_in_session(session_id, user_id)
            .await
    }

    /// Get total settled amount in a session
    pub async fn get_session_settled_amount(&self, session_id: Uuid) -> Result<Decimal, AppError> {
        self.session_repo
            .get_session_settled_amount(session_id)
            .await
    }

    /// Batch get user's debt/owed amounts in multiple sessions
    pub async fn batch_get_user_debts(
        &self,
        session_ids: &[Uuid],
        user_id: Uuid,
    ) -> Result<HashMap<Uuid, (Decimal, Decimal)>, AppError> {
        self.session_repo
            .batch_get_user_debts(session_ids, user_id)
            .await
    }

    /// Batch get settled amounts for multiple sessions
    pub async fn batch_get_settled_amounts(
        &self,
        session_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Decimal>, AppError> {
        self.session_repo
            .batch_get_settled_amounts(session_ids)
            .await
    }

    /// Recalculate debts for a session (within transaction)
    pub async fn recalculate_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionRepository::recalculate_debts(tx, session_id).await
    }

    /// Recalculate minimized debts for a session (within transaction)
    pub async fn recalculate_minimized_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionRepository::recalculate_minimized_debts(tx, session_id).await
    }

    /// Recalculate direct debts for a session (within transaction)
    pub async fn recalculate_direct_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionRepository::recalculate_direct_debts(tx, session_id).await
    }

    // ========================================
    // New methods (Phase 2+)
    // ========================================

    /// Get all pending debts in a session
    pub async fn get_pending_debts(&self, session_id: Uuid) -> Result<Vec<DebtInfo>, AppError> {
        #[derive(sqlx::FromRow)]
        struct DebtRow {
            id: Uuid,
            debtor_id: Uuid,
            creditor_id: Uuid,
            amount: Decimal,
            status: String,
        }

        let debts: Vec<DebtRow> = sqlx::query_as(
            r#"
            SELECT id, debtor_id, creditor_id, amount, status::text
            FROM debts
            WHERE session_id = $1 AND status = 'pending'
            ORDER BY amount DESC
            "#,
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(debts
            .into_iter()
            .map(|d| DebtInfo {
                id: d.id,
                debtor_id: d.debtor_id,
                creditor_id: d.creditor_id,
                amount: d.amount,
                status: d.status,
            })
            .collect())
    }

    /// Get total pending debt amount in a session
    pub async fn get_total_pending_debt(&self, session_id: Uuid) -> Result<Decimal, AppError> {
        let total: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts
            WHERE session_id = $1 AND status = 'pending'
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(total)
    }

    /// Check if session has any unsettled debts
    pub async fn has_unsettled_debts(&self, session_id: Uuid) -> Result<bool, AppError> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)::bigint
            FROM debts
            WHERE session_id = $1 AND status != 'settled'
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    /// Get debt statistics for a session
    pub async fn get_debt_stats(&self, session_id: Uuid) -> Result<DebtStats, AppError> {
        #[derive(sqlx::FromRow)]
        struct StatsRow {
            total_pending: Decimal,
            total_settled: Decimal,
            pending_count: i64,
            settled_count: i64,
        }

        let stats: StatsRow = sqlx::query_as(
            r#"
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
                COALESCE(SUM(CASE WHEN status = 'settled' THEN amount ELSE 0 END), 0) as total_settled,
                COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
                COUNT(*) FILTER (WHERE status = 'settled')::bigint as settled_count
            FROM debts
            WHERE session_id = $1
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(DebtStats {
            total_pending: stats.total_pending,
            total_settled: stats.total_settled,
            pending_count: stats.pending_count,
            settled_count: stats.settled_count,
        })
    }
}

/// Basic debt information
#[derive(Debug, Clone)]
pub struct DebtInfo {
    pub id: Uuid,
    pub debtor_id: Uuid,
    pub creditor_id: Uuid,
    pub amount: Decimal,
    pub status: String,
}

/// Debt statistics for a session
#[derive(Debug, Clone)]
pub struct DebtStats {
    pub total_pending: Decimal,
    pub total_settled: Decimal,
    pub pending_count: i64,
    pub settled_count: i64,
}

#[cfg(test)]
mod tests {
    // Tests will be added during Phase 2 migration
}
