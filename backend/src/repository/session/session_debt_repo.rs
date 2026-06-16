//! Session Debt Repository
//!
//! Provides specialized operations for debts within sessions.

use rust_decimal::Decimal;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::domain::split_calculator::{DebtEntry, ParticipantBalance, SplitCalculator};
use crate::error::AppError;
use crate::repository::debt_lock;

/// Repository for debt-related operations within sessions
#[allow(dead_code)]
pub struct SessionDebtRepository {
    pool: PgPool,
}

impl SessionDebtRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get pool reference for direct queries
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Get user's debt/owed amounts in a session
    pub async fn get_user_debt_in_session(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(Decimal, Decimal), AppError> {
        let participant_id: Option<Uuid> = sqlx::query_scalar(
            r#"SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2"#,
        )
        .bind(session_id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        let participant_id = match participant_id {
            Some(id) => id,
            None => return Ok((Decimal::ZERO, Decimal::ZERO)),
        };

        let my_debt: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts
            WHERE session_id = $1 AND debtor_id = $2 AND status != 'settled'
            "#,
        )
        .bind(session_id)
        .bind(participant_id)
        .fetch_one(&self.pool)
        .await?;

        let my_owed: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts
            WHERE session_id = $1 AND creditor_id = $2 AND status != 'settled'
            "#,
        )
        .bind(session_id)
        .bind(participant_id)
        .fetch_one(&self.pool)
        .await?;

        Ok((my_debt, my_owed))
    }

    /// Get total settled amount in a session
    pub async fn get_session_settled_amount(&self, session_id: Uuid) -> Result<Decimal, AppError> {
        let settled: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts
            WHERE session_id = $1 AND status = 'settled'
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(settled)
    }

    /// Batch get user's debt/owed amounts in multiple sessions
    pub async fn batch_get_user_debts(
        &self,
        session_ids: &[Uuid],
        user_id: Uuid,
    ) -> Result<HashMap<Uuid, (Decimal, Decimal)>, AppError> {
        if session_ids.is_empty() {
            return Ok(HashMap::new());
        }

        #[derive(sqlx::FromRow)]
        struct DebtRow {
            session_id: Uuid,
            my_debt: Decimal,
            my_owed: Decimal,
        }

        let debts: Vec<DebtRow> = sqlx::query_as(
            r#"
            SELECT
                sp.session_id,
                COALESCE(SUM(CASE WHEN d.debtor_id = sp.id AND d.status != 'settled' THEN d.amount ELSE 0 END), 0) as my_debt,
                COALESCE(SUM(CASE WHEN d.creditor_id = sp.id AND d.status != 'settled' THEN d.amount ELSE 0 END), 0) as my_owed
            FROM session_participants sp
            LEFT JOIN debts d ON d.session_id = sp.session_id AND (d.debtor_id = sp.id OR d.creditor_id = sp.id)
            WHERE sp.session_id = ANY($1) AND sp.user_id = $2
            GROUP BY sp.session_id
            "#,
        )
        .bind(session_ids)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut result: HashMap<Uuid, (Decimal, Decimal)> = HashMap::new();
        for d in debts {
            result.insert(d.session_id, (d.my_debt, d.my_owed));
        }

        for sid in session_ids {
            result.entry(*sid).or_insert((Decimal::ZERO, Decimal::ZERO));
        }

        Ok(result)
    }

    /// Batch get settled amounts for multiple sessions
    pub async fn batch_get_settled_amounts(
        &self,
        session_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Decimal>, AppError> {
        if session_ids.is_empty() {
            return Ok(HashMap::new());
        }

        #[derive(sqlx::FromRow)]
        struct SettledRow {
            session_id: Uuid,
            settled: Decimal,
        }

        let settled: Vec<SettledRow> = sqlx::query_as(
            r#"
            SELECT
                session_id,
                COALESCE(SUM(amount), 0) as settled
            FROM debts
            WHERE session_id = ANY($1) AND status = 'settled'
            GROUP BY session_id
            "#,
        )
        .bind(session_ids)
        .fetch_all(&self.pool)
        .await?;

        let mut result: HashMap<Uuid, Decimal> = HashMap::new();
        for s in settled {
            result.insert(s.session_id, s.settled);
        }

        for sid in session_ids {
            result.entry(*sid).or_insert(Decimal::ZERO);
        }

        Ok(result)
    }

    /// Recalculate debts for a session (within transaction)
    pub async fn recalculate_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        debt_lock::lock_session_debt_mutation(tx, session_id).await?;

        sqlx::query(
            r#"
            DELETE FROM debts
            WHERE session_id = $1 AND status IN ('pending', 'settlement_requested')
            "#,
        )
        .bind(session_id)
        .execute(&mut **tx)
        .await?;

        let minimize_debts = sqlx::query_scalar!(
            r#"SELECT minimize_debts FROM sessions WHERE id = $1"#,
            session_id
        )
        .fetch_one(&mut **tx)
        .await?;

        if minimize_debts {
            return Self::recalculate_minimized_debts(tx, session_id).await;
        }

        Self::recalculate_direct_debts(tx, session_id).await
    }

    /// Recalculate minimized debts for a session (within transaction)
    pub async fn recalculate_minimized_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        #[derive(sqlx::FromRow)]
        struct BalanceRow {
            participant_id: Uuid,
            amount: Decimal,
        }

        let paid_rows: Vec<BalanceRow> = sqlx::query_as(
            r#"
            SELECT bp.participant_id, COALESCE(SUM(bp.amount_paid), 0) AS amount
            FROM bill_payers bp
            JOIN bills b ON b.id = bp.bill_id
            WHERE b.session_id = $1
            GROUP BY bp.participant_id
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        let owed_rows: Vec<BalanceRow> = sqlx::query_as(
            r#"
            SELECT bs.participant_id, COALESCE(SUM(bs.amount_owed), 0) AS amount
            FROM bill_splits bs
            JOIN bills b ON b.id = bs.bill_id
            WHERE b.session_id = $1
            GROUP BY bs.participant_id
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        let payers: Vec<(Uuid, Decimal)> = paid_rows
            .into_iter()
            .map(|row| (row.participant_id, row.amount))
            .collect();
        let splits: Vec<(Uuid, Decimal)> = owed_rows
            .into_iter()
            .map(|row| (row.participant_id, row.amount))
            .collect();
        let balances: Vec<ParticipantBalance> =
            SplitCalculator::calculate_net_balances(&payers, &splits);
        let settled_debts = Self::get_settled_debts(tx, session_id).await?;
        let balances =
            SplitCalculator::apply_settled_transfers_to_balances(balances, &settled_debts);

        for debt in SplitCalculator::simplify_debts(balances) {
            Self::insert_pending_debt(tx, session_id, debt).await?;
        }

        Ok(())
    }

    /// Recalculate direct debts for a session (within transaction)
    pub async fn recalculate_direct_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        #[derive(sqlx::FromRow)]
        struct PayerRow {
            bill_id: Uuid,
            participant_id: Uuid,
            amount_paid: Decimal,
        }

        #[derive(sqlx::FromRow)]
        struct SplitRow {
            bill_id: Uuid,
            participant_id: Uuid,
            amount_owed: Decimal,
        }

        let payers: Vec<PayerRow> = sqlx::query_as(
            r#"
            SELECT bp.bill_id, bp.participant_id, bp.amount_paid
            FROM bill_payers bp
            JOIN bills b ON bp.bill_id = b.id
            WHERE b.session_id = $1
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        let splits: Vec<SplitRow> = sqlx::query_as(
            r#"
            SELECT bs.bill_id, bs.participant_id, bs.amount_owed
            FROM bill_splits bs
            JOIN bills b ON bs.bill_id = b.id
            WHERE b.session_id = $1
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        let mut payers_by_bill: HashMap<Uuid, Vec<PayerRow>> = HashMap::new();
        for payer in payers {
            payers_by_bill.entry(payer.bill_id).or_default().push(payer);
        }

        let mut splits_by_bill: HashMap<Uuid, Vec<SplitRow>> = HashMap::new();
        for split in splits {
            splits_by_bill.entry(split.bill_id).or_default().push(split);
        }

        let mut debts_map: HashMap<(Uuid, Uuid), Decimal> = HashMap::new();

        for (bill_id, bill_splits) in splits_by_bill {
            let bill_payers = match payers_by_bill.get(&bill_id) {
                Some(payers) => payers,
                None => continue,
            };

            let total_paid: Decimal = bill_payers.iter().map(|p| p.amount_paid).sum();
            if total_paid <= Decimal::ZERO {
                continue;
            }

            let weights: Vec<Decimal> = bill_payers.iter().map(|p| p.amount_paid).collect();

            for split in bill_splits {
                if split.amount_owed <= Decimal::ZERO {
                    continue;
                }

                let allocations = SplitCalculator::calculate_weighted_split_with_scale(
                    split.amount_owed,
                    &weights,
                    2,
                );

                for (payer, amount) in bill_payers.iter().zip(allocations) {
                    if split.participant_id == payer.participant_id || amount <= Decimal::ZERO {
                        continue;
                    }

                    let key = (split.participant_id, payer.participant_id);
                    let entry = debts_map.entry(key).or_insert(Decimal::ZERO);
                    *entry += amount;
                }
            }
        }

        let debts = debts_map
            .into_iter()
            .filter_map(|((debtor_id, creditor_id), amount)| {
                (amount > Decimal::ZERO).then_some(DebtEntry {
                    debtor_id,
                    creditor_id,
                    amount,
                })
            })
            .collect();

        let settled_debts = Self::get_settled_debts(tx, session_id).await?;
        let debts = SplitCalculator::reduce_debts_by_settled_transfers(debts, &settled_debts);
        Self::insert_pending_debts(tx, session_id, debts).await?;

        Ok(())
    }

    async fn get_settled_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<Vec<DebtEntry>, AppError> {
        #[derive(sqlx::FromRow)]
        struct SettledDebtRow {
            debtor_id: Uuid,
            creditor_id: Uuid,
            amount: Decimal,
        }

        let rows: Vec<SettledDebtRow> = sqlx::query_as(
            r#"
            SELECT debtor_id, creditor_id, amount
            FROM debts
            WHERE session_id = $1 AND status = 'settled'
            ORDER BY settled_at ASC NULLS LAST, created_at ASC, id ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| DebtEntry {
                debtor_id: row.debtor_id,
                creditor_id: row.creditor_id,
                amount: row.amount,
            })
            .collect())
    }

    async fn insert_pending_debt(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
        debt: DebtEntry,
    ) -> Result<(), AppError> {
        if debt.amount <= Decimal::ZERO {
            return Ok(());
        }

        sqlx::query(
            r#"
            INSERT INTO debts (id, session_id, debtor_id, creditor_id, amount, status, created_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(session_id)
        .bind(debt.debtor_id)
        .bind(debt.creditor_id)
        .bind(debt.amount)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    async fn insert_pending_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
        debts: Vec<DebtEntry>,
    ) -> Result<(), AppError> {
        for debt in debts {
            Self::insert_pending_debt(tx, session_id, debt).await?;
        }

        Ok(())
    }

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
            WHERE session_id = $1 AND status != 'settled'
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
            WHERE session_id = $1 AND status != 'settled'
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
                COALESCE(SUM(CASE WHEN status != 'settled' THEN amount ELSE 0 END), 0) as total_pending,
                COALESCE(SUM(CASE WHEN status = 'settled' THEN amount ELSE 0 END), 0) as total_settled,
                COUNT(*) FILTER (WHERE status != 'settled')::bigint as pending_count,
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
