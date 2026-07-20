//! Session Bill Repository
//!
//! Provides specialized operations for bills within sessions.
//! Currently delegates to SessionRepository, will be migrated incrementally.

use rust_decimal::Decimal;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::sessions::{
    BillDetailResponse, BillParticipantInfo, BillPayerInfo, BillResponse, PayerInput,
    SplitDetailInput,
};
use crate::error::AppError;
use crate::repository::session_repo::SessionRepository;

/// Repository for bill-related operations within sessions
#[allow(dead_code)]
pub struct SessionBillRepository {
    pool: PgPool,
    session_repo: SessionRepository,
}

impl SessionBillRepository {
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

    /// Find all bills in a session (basic info)
    pub async fn find_bills_by_session(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<BillResponse>, AppError> {
        self.session_repo.find_bills_by_session(session_id).await
    }

    /// Find bills in a session with pagination
    pub async fn find_bills_by_session_paginated(
        &self,
        session_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<BillDetailResponse>, i64), AppError> {
        // 1. Fetch paginated bills
        let bills = sqlx::query!(
            r#"
            SELECT 
                id,
                session_id,
                description,
                amount,
                COALESCE(amount_original, amount) as "amount_original!",
                currency_code,
                exchange_rate,
                rate_source,
                rate_timestamp,
                split_strategy,
                created_by,
                created_at
            FROM bills
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            session_id,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        // 2. Get total count
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*)::bigint FROM bills WHERE session_id = $1")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await?;

        if bills.is_empty() {
            return Ok((Vec::new(), total));
        }

        let bill_ids: Vec<Uuid> = bills.iter().map(|b| b.id).collect();

        // 3. Fetch payers for these bills
        struct PayerRow {
            bill_id: Uuid,
            participant_id: Uuid,
            name: Option<String>,
            amount_paid: Decimal,
        }

        let payers = sqlx::query_as!(
            PayerRow,
            r#"
            SELECT 
                bp.bill_id,
                bp.participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
                bp.amount_paid
            FROM bill_payers bp
            JOIN session_participants sp ON bp.participant_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE bp.bill_id = ANY($1)
            "#,
            &bill_ids
        )
        .fetch_all(&self.pool)
        .await?;

        // 4. Fetch participants (splits) for these bills
        struct SplitRow {
            bill_id: Uuid,
            participant_id: Uuid,
            name: Option<String>,
            amount_owed: Decimal,
        }

        let participants = sqlx::query_as!(
            SplitRow,
            r#"
            SELECT 
                bs.bill_id,
                bs.participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
                bs.amount_owed
            FROM bill_splits bs
            JOIN session_participants sp ON bs.participant_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE bs.bill_id = ANY($1)
            "#,
            &bill_ids
        )
        .fetch_all(&self.pool)
        .await?;

        // 5. Assemble results
        let mut payers_map: HashMap<Uuid, Vec<BillPayerInfo>> = HashMap::new();
        for p in payers {
            payers_map
                .entry(p.bill_id)
                .or_default()
                .push(BillPayerInfo {
                    participant_id: p.participant_id,
                    name: p.name.unwrap_or_else(|| "Unknown".to_string()),
                    amount_paid: p.amount_paid,
                });
        }

        let mut participants_map: HashMap<Uuid, Vec<BillParticipantInfo>> = HashMap::new();
        for p in participants {
            participants_map
                .entry(p.bill_id)
                .or_default()
                .push(BillParticipantInfo {
                    participant_id: p.participant_id,
                    name: p.name.unwrap_or_else(|| "Unknown".to_string()),
                    amount_owed: p.amount_owed,
                });
        }

        let result = bills
            .into_iter()
            .map(|b| BillDetailResponse {
                id: b.id,
                session_id: b.session_id,
                description: b.description,
                amount: b.amount,
                amount_original: b.amount_original,
                currency_code: b.currency_code,
                exchange_rate: b.exchange_rate,
                rate_source: b.rate_source,
                rate_timestamp: b.rate_timestamp,
                split_strategy: b.split_strategy,
                created_by: b.created_by,
                created_at: b.created_at,
                payers: payers_map.remove(&b.id).unwrap_or_default(),
                participants: participants_map.remove(&b.id).unwrap_or_default(),
            })
            .collect();

        Ok((result, total))
    }

    /// Find all bills with full details (payers, participants)
    pub async fn find_bills_with_details(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<BillDetailResponse>, AppError> {
        self.session_repo.find_bills_with_details(session_id).await
    }

    /// Create a new bill
    #[allow(clippy::too_many_arguments)]
    pub async fn create_bill(
        &self,
        session_id: Uuid,
        description: &str,
        amount: Decimal,
        amount_original: Decimal,
        currency_code: &str,
        exchange_rate: Decimal,
        rate_source: &str,
        rate_timestamp: chrono::DateTime<chrono::Utc>,
        split_strategy: &str,
        created_by: Uuid,
        payers: &[PayerInput],
        split_details: Option<&[SplitDetailInput]>,
        category_id: Option<Uuid>,
    ) -> Result<BillResponse, AppError> {
        self.session_repo
            .create_bill(
                session_id,
                description,
                amount,
                amount_original,
                currency_code,
                exchange_rate,
                rate_source,
                rate_timestamp,
                split_strategy,
                created_by,
                payers,
                split_details,
                category_id,
            )
            .await
    }

    /// Update an existing bill
    #[allow(clippy::too_many_arguments)]
    pub async fn update_bill(
        &self,
        bill_id: Uuid,
        session_id: Uuid,
        description: Option<&str>,
        amount: Option<Decimal>,
        amount_original: Option<Decimal>,
        currency_code: Option<&str>,
        exchange_rate: Option<Decimal>,
        rate_source: Option<&str>,
        rate_timestamp: Option<chrono::DateTime<chrono::Utc>>,
        split_strategy: Option<&str>,
        payers: Option<&[PayerInput]>,
        split_details: Option<&[SplitDetailInput]>,
        category_id: Option<Uuid>,
        receipt_url: Option<&str>,
    ) -> Result<BillResponse, AppError> {
        self.session_repo
            .update_bill(
                bill_id,
                session_id,
                description,
                amount,
                amount_original,
                currency_code,
                exchange_rate,
                rate_source,
                rate_timestamp,
                split_strategy,
                payers,
                split_details,
                category_id,
                receipt_url,
            )
            .await
    }

    /// Delete a bill
    pub async fn delete_bill(&self, bill_id: Uuid, session_id: Uuid) -> Result<(), AppError> {
        self.session_repo.delete_bill(bill_id, session_id).await
    }

    // ========================================
    // New methods (Phase 2+)
    // ========================================

    /// Get a single bill by ID
    pub async fn get_bill_by_id(&self, bill_id: Uuid) -> Result<Option<BillResponse>, AppError> {
        let bill = sqlx::query_as!(
            BillResponse,
            r#"
            SELECT 
                id,
                session_id,
                description,
                amount,
                COALESCE(amount_original, amount) as "amount_original!",
                currency_code,
                exchange_rate,
                rate_source,
                rate_timestamp,
                split_strategy,
                created_by,
                created_at
            FROM bills
            WHERE id = $1
            "#,
            bill_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(bill)
    }

    /// Count bills in a session
    pub async fn count_bills(&self, session_id: Uuid) -> Result<i64, AppError> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*)::bigint FROM bills WHERE session_id = $1")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(count)
    }

    /// Get total amount for a session
    pub async fn get_session_total(&self, session_id: Uuid) -> Result<Decimal, AppError> {
        let total: Decimal =
            sqlx::query_scalar("SELECT COALESCE(SUM(amount), 0) FROM bills WHERE session_id = $1")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(total)
    }

    /// Get bills by category
    pub async fn get_bills_by_category(
        &self,
        session_id: Uuid,
        category_id: Option<Uuid>,
    ) -> Result<Vec<BillResponse>, AppError> {
        let bills = sqlx::query_as!(
            BillResponse,
            r#"
            SELECT 
                id,
                session_id,
                description,
                amount,
                COALESCE(amount_original, amount) as "amount_original!",
                currency_code,
                exchange_rate,
                rate_source,
                rate_timestamp,
                split_strategy,
                created_by,
                created_at
            FROM bills
            WHERE session_id = $1 
              AND (($2::uuid IS NULL AND category_id IS NULL) OR category_id = $2)
            ORDER BY created_at DESC
            "#,
            session_id,
            category_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(bills)
    }
}

#[cfg(test)]
mod tests {
    // Tests will be added during Phase 2 migration
}
