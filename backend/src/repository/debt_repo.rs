use sqlx::PgPool;
use uuid::Uuid;

use crate::api::debts::{DebtItemResponse, ParticipantDebtResponse, SessionDebtResponse};
use crate::domain::debt::{Debt, DebtStatus};
use crate::error::AppError;

pub struct DebtRepository {
    pool: PgPool,
}

impl DebtRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user(
        &self,
        user_id: Uuid,
    ) -> Result<(Vec<DebtItemResponse>, Vec<DebtItemResponse>), AppError> {
        let i_owe = sqlx::query_as::<_, DebtItemResponse>(
            r#"
            SELECT 
                d.id,
                d.session_id,
                s.name as session_name,
                d.creditor_id as counterpart_id,
                COALESCE(u.full_name, sp_creditor.guest_name, 'Unknown') as counterpart_name,
                d.amount,
                d.status,
                (sp_creditor.user_id IS NULL) as is_guest,
                uba.bank_name as counterpart_bank_name,
                uba.account_number as counterpart_account_number,
                uba.account_holder_name as counterpart_account_holder_name,
                uba.qr_image_url as counterpart_qr_image_url
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp_debtor ON d.debtor_id = sp_debtor.id
            JOIN session_participants sp_creditor ON d.creditor_id = sp_creditor.id
            LEFT JOIN users u ON sp_creditor.user_id = u.id
            LEFT JOIN user_bank_accounts uba 
              ON uba.user_id = sp_creditor.user_id 
             AND uba.is_default = true
            WHERE sp_debtor.user_id = $1 AND d.status != 'settled'
            ORDER BY d.amount DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let owed_to_me = sqlx::query_as::<_, DebtItemResponse>(
            r#"
            SELECT 
                d.id,
                d.session_id,
                s.name as session_name,
                d.debtor_id as counterpart_id,
                COALESCE(u.full_name, sp_debtor.guest_name, 'Unknown') as counterpart_name,
                d.amount,
                d.status,
                (sp_debtor.user_id IS NULL) as is_guest,
                NULL::text as counterpart_bank_name,
                NULL::text as counterpart_account_number,
                NULL::text as counterpart_account_holder_name,
                NULL::text as counterpart_qr_image_url
            FROM debts d
            JOIN sessions s ON d.session_id = s.id
            JOIN session_participants sp_debtor ON d.debtor_id = sp_debtor.id
            JOIN session_participants sp_creditor ON d.creditor_id = sp_creditor.id
            LEFT JOIN users u ON sp_debtor.user_id = u.id
            WHERE sp_creditor.user_id = $1 AND d.status != 'settled'
            ORDER BY d.amount DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok((i_owe, owed_to_me))
    }

    pub async fn request_settlement(&self, debt_id: Uuid, user_id: Uuid) -> Result<Debt, AppError> {
        let debt = sqlx::query_as!(
            Debt,
            r#"
            SELECT 
                d.id,
                d.session_id,
                d.debtor_id,
                d.creditor_id,
                d.amount,
                d.status as "status: DebtStatus",
                d.created_at,
                d.settled_at
            FROM debts d
            JOIN session_participants sp ON d.debtor_id = sp.id
            WHERE d.id = $1 AND sp.user_id = $2
            "#,
            debt_id,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Forbidden {
            message: "You can only request settlement for your own debts".to_string(),
        })?;

        if debt.status != DebtStatus::Pending {
            return Err(AppError::Validation {
                field: "status".to_string(),
                message: "This debt is not in pending status".to_string(),
            });
        }

        let updated = sqlx::query_as!(
            Debt,
            r#"
            UPDATE debts 
            SET status = 'settlement_requested'
            WHERE id = $1
            RETURNING 
                id,
                session_id,
                debtor_id,
                creditor_id,
                amount,
                status as "status: DebtStatus",
                created_at,
                settled_at
            "#,
            debt_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(updated)
    }

    pub async fn confirm_settlement(&self, debt_id: Uuid, user_id: Uuid) -> Result<Debt, AppError> {
        tracing::debug!(
            "Fetching debt for confirmation: debt_id={}, user_id={}",
            debt_id,
            user_id
        );

        let debt = sqlx::query_as!(
            Debt,
            r#"
            SELECT 
                d.id,
                d.session_id,
                d.debtor_id,
                d.creditor_id,
                d.amount,
                d.status as "status: DebtStatus",
                d.created_at,
                d.settled_at
            FROM debts d
            JOIN session_participants sp ON d.creditor_id = sp.id
            WHERE d.id = $1 AND sp.user_id = $2
            "#,
            debt_id,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| {
            tracing::warn!(
                "Debt not found or user is not the creditor: debt_id={}, user_id={}",
                debt_id,
                user_id
            );
            AppError::Forbidden {
                message: "You can only confirm settlement for debts owed to you".to_string(),
            }
        })?;

        tracing::debug!(
            "Debt found: id={}, status={:?}, debtor_id={}, creditor_id={}",
            debt.id,
            debt.status,
            debt.debtor_id,
            debt.creditor_id
        );

        if debt.status != DebtStatus::SettlementRequested {
            tracing::warn!("Invalid debt status for confirmation: debt_id={}, current_status={:?}, expected=SettlementRequested", 
                debt_id, debt.status);
            return Err(AppError::Validation {
                field: "status".to_string(),
                message: format!(
                    "Settlement must be requested before it can be confirmed. Current status: {:?}",
                    debt.status
                ),
            });
        }

        let updated = sqlx::query_as!(
            Debt,
            r#"
            UPDATE debts 
            SET status = 'settled', settled_at = NOW()
            WHERE id = $1
            RETURNING 
                id,
                session_id,
                debtor_id,
                creditor_id,
                amount,
                status as "status: DebtStatus",
                created_at,
                settled_at
            "#,
            debt_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(updated)
    }

    /// Settle a debt from a guest directly (creditor can mark as settled without request)
    pub async fn settle_guest_debt(&self, debt_id: Uuid, user_id: Uuid) -> Result<Debt, AppError> {
        // Check if the user is the creditor and the debtor is a guest
        let debt = sqlx::query_as!(
            Debt,
            r#"
            SELECT 
                d.id,
                d.session_id,
                d.debtor_id,
                d.creditor_id,
                d.amount,
                d.status as "status: DebtStatus",
                d.created_at,
                d.settled_at
            FROM debts d
            JOIN session_participants sp_creditor ON d.creditor_id = sp_creditor.id
            JOIN session_participants sp_debtor ON d.debtor_id = sp_debtor.id
            WHERE d.id = $1 
              AND sp_creditor.user_id = $2 
              AND sp_debtor.user_id IS NULL
            "#,
            debt_id,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Forbidden {
            message: "Chỉ có thể tất toán nợ từ khách (không phải thành viên hệ thống)".to_string(),
        })?;

        if debt.status == DebtStatus::Settled {
            return Err(AppError::Validation {
                field: "status".to_string(),
                message: "Khoản nợ này đã được tất toán".to_string(),
            });
        }

        let updated = sqlx::query_as!(
            Debt,
            r#"
            UPDATE debts 
            SET status = 'settled', settled_at = NOW()
            WHERE id = $1
            RETURNING 
                id,
                session_id,
                debtor_id,
                creditor_id,
                amount,
                status as "status: DebtStatus",
                created_at,
                settled_at
            "#,
            debt_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(updated)
    }

    pub async fn get_session_debts(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<SessionDebtResponse>, AppError> {
        use rust_decimal::Decimal;
        use std::collections::HashMap;

        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            session_id: Uuid,
            session_name: String,
            session_date: chrono::NaiveDate,
            participant_id: Uuid,
            participant_name: String,
            total_paid: Decimal,
            total_owed: Decimal,
        }

        let rows = sqlx::query_as!(
            ParticipantRow,
            r#"
            WITH participant_payments AS (
                SELECT 
                    sp.id as participant_id,
                    sp.session_id,
                    COALESCE(SUM(bp.amount_paid), 0) as total_paid
                FROM session_participants sp
                LEFT JOIN bill_payers bp ON bp.participant_id = sp.id
                GROUP BY sp.id, sp.session_id
            ),
            participant_splits AS (
                SELECT 
                    sp.id as participant_id,
                    sp.session_id,
                    COALESCE(SUM(bs.amount_owed), 0) as total_owed
                FROM session_participants sp
                LEFT JOIN bill_splits bs ON bs.participant_id = sp.id
                GROUP BY sp.id, sp.session_id
            )
            SELECT 
                s.id as session_id,
                s.name as session_name,
                s.session_date as "session_date!",
                sp.id as participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as "participant_name!",
                COALESCE(pp.total_paid, 0) as "total_paid!",
                COALESCE(ps.total_owed, 0) as "total_owed!"
            FROM sessions s
            JOIN session_participants sp ON sp.session_id = s.id
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN participant_payments pp ON pp.participant_id = sp.id
            LEFT JOIN participant_splits ps ON ps.participant_id = sp.id
            WHERE s.id IN (
                SELECT DISTINCT session_id FROM session_participants WHERE user_id = $1
            )
            ORDER BY s.created_at DESC, sp.id
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;

        let mut sessions_map: HashMap<Uuid, SessionDebtResponse> = HashMap::new();

        for row in rows {
            let balance = row.total_paid - row.total_owed;

            let participant = ParticipantDebtResponse {
                participant_id: row.participant_id,
                name: row.participant_name,
                total_paid: row.total_paid,
                total_owed: row.total_owed,
                balance,
            };

            sessions_map
                .entry(row.session_id)
                .or_insert_with(|| SessionDebtResponse {
                    session_id: row.session_id,
                    session_name: row.session_name.clone(),
                    session_date: row.session_date,
                    participants: Vec::new(),
                })
                .participants
                .push(participant);
        }

        let mut sessions: Vec<SessionDebtResponse> = sessions_map.into_values().collect();
        sessions.sort_by_key(|b| std::cmp::Reverse(b.session_id));

        Ok(sessions)
    }
}
