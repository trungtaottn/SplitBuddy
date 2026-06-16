//! Session Bill Repository
//!
//! Provides specialized operations for bills within sessions.

use rust_decimal::Decimal;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::sessions::{
    BillDetailResponse, BillParticipantInfo, BillPayerInfo, BillResponse, PayerInput,
    SplitDetailInput,
};
use crate::domain::split_calculator::SplitCalculator;
use crate::error::AppError;
use crate::repository::session::SessionDebtRepository;

/// Repository for bill-related operations within sessions
#[allow(dead_code)]
pub struct SessionBillRepository {
    pool: PgPool,
}

#[derive(Debug, Clone, Copy)]
pub struct BillPayerInput {
    pub participant_id: Uuid,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Copy)]
pub struct BillSplitInput {
    pub participant_id: Uuid,
    pub amount: Decimal,
}

impl SessionBillRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get pool reference for direct queries
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Find all bills in a session (basic info)
    pub async fn find_bills_by_session(
        &self,
        session_id: Uuid,
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
            ORDER BY created_at DESC
            "#,
            session_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(bills)
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
            "#,
            session_id
        )
        .fetch_all(&self.pool)
        .await?;

        if bills.is_empty() {
            return Ok(Vec::new());
        }

        let bill_ids: Vec<Uuid> = bills.iter().map(|b| b.id).collect();

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

        Ok(result)
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
        let payer_rows: Vec<BillPayerInput> = payers
            .iter()
            .map(|payer| BillPayerInput {
                participant_id: payer.participant_id,
                amount: payer.amount,
            })
            .collect();
        let split_rows: Option<Vec<BillSplitInput>> = split_details.map(|details| {
            details
                .iter()
                .map(|split| BillSplitInput {
                    participant_id: split.participant_id,
                    amount: split.amount,
                })
                .collect()
        });

        let mut tx = self.pool.begin().await?;
        let bill = Self::create_bill_in_tx(
            &mut tx,
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
            &payer_rows,
            split_rows.as_deref(),
            category_id,
        )
        .await?;

        tx.commit().await?;

        Ok(bill)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_bill_in_tx(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
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
        payers: &[BillPayerInput],
        split_details: Option<&[BillSplitInput]>,
        category_id: Option<Uuid>,
    ) -> Result<BillResponse, AppError> {
        let bill_id = Uuid::new_v4();

        sqlx::query(
            r#"
            INSERT INTO bills (
                id,
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
                category_id,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            "#,
        )
        .bind(bill_id)
        .bind(session_id)
        .bind(description)
        .bind(amount)
        .bind(amount_original)
        .bind(currency_code)
        .bind(exchange_rate)
        .bind(rate_source)
        .bind(rate_timestamp)
        .bind(split_strategy)
        .bind(created_by)
        .bind(category_id)
        .execute(&mut **tx)
        .await?;

        for payer in payers {
            sqlx::query!(
                r#"
                INSERT INTO bill_payers (id, bill_id, participant_id, amount_paid)
                VALUES ($1, $2, $3, $4)
                "#,
                Uuid::new_v4(),
                bill_id,
                payer.participant_id,
                payer.amount
            )
            .execute(&mut **tx)
            .await?;
        }

        if split_strategy.to_uppercase() == "CUSTOM" {
            if let Some(details) = split_details {
                for detail in details {
                    Self::insert_bill_split(tx, bill_id, detail.participant_id, detail.amount)
                        .await?;
                }
            }
        } else if split_strategy.to_uppercase() == "WEIGHTED" {
            Self::split_weighted_among_participants(tx, bill_id, session_id, amount).await?;
        } else if let Some(details) = split_details {
            if details.is_empty() {
                Self::split_among_all_participants(tx, bill_id, session_id, amount).await?;
            } else {
                for detail in details {
                    Self::insert_bill_split(tx, bill_id, detail.participant_id, detail.amount)
                        .await?;
                }
            }
        } else {
            Self::split_among_all_participants(tx, bill_id, session_id, amount).await?;
        }

        SessionDebtRepository::recalculate_debts(tx, session_id).await?;

        Ok(BillResponse {
            id: bill_id,
            session_id,
            description: description.to_string(),
            amount,
            amount_original,
            currency_code: currency_code.to_string(),
            exchange_rate,
            rate_source: rate_source.to_string(),
            rate_timestamp,
            split_strategy: split_strategy.to_string(),
            created_by,
            created_at: chrono::Utc::now(),
        })
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
        let mut tx = self.pool.begin().await?;

        let updated_bill: BillResponse = sqlx::query_as(
            r#"
            UPDATE bills
            SET
                description = COALESCE($1, description),
                amount = COALESCE($2, amount),
                amount_original = COALESCE($3, amount_original),
                currency_code = COALESCE($4, currency_code),
                exchange_rate = COALESCE($5, exchange_rate),
                rate_source = COALESCE($6, rate_source),
                rate_timestamp = COALESCE($7, rate_timestamp),
                split_strategy = COALESCE($8, split_strategy),
                category_id = COALESCE($9, category_id),
                receipt_url = COALESCE($10, receipt_url)
            WHERE id = $11
            RETURNING id, session_id, description, amount,
                      COALESCE(amount_original, amount) as amount_original,
                      currency_code, exchange_rate, rate_source, rate_timestamp, split_strategy,
                      created_by, created_at
            "#,
        )
        .bind(description)
        .bind(amount)
        .bind(amount_original)
        .bind(currency_code)
        .bind(exchange_rate)
        .bind(rate_source)
        .bind(rate_timestamp)
        .bind(split_strategy)
        .bind(category_id)
        .bind(receipt_url)
        .bind(bill_id)
        .fetch_one(&mut *tx)
        .await?;

        if let Some(payer_list) = payers {
            sqlx::query!("DELETE FROM bill_payers WHERE bill_id = $1", bill_id)
                .execute(&mut *tx)
                .await?;

            for payer in payer_list {
                sqlx::query!(
                    r#"
                    INSERT INTO bill_payers (id, bill_id, participant_id, amount_paid)
                    VALUES ($1, $2, $3, $4)
                    "#,
                    Uuid::new_v4(),
                    bill_id,
                    payer.participant_id,
                    payer.amount
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        if let Some(split_list) = split_details {
            sqlx::query!("DELETE FROM bill_splits WHERE bill_id = $1", bill_id)
                .execute(&mut *tx)
                .await?;

            for split in split_list {
                Self::insert_bill_split(&mut tx, bill_id, split.participant_id, split.amount)
                    .await?;
            }
        }

        SessionDebtRepository::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        Ok(updated_bill)
    }

    /// Delete a bill
    pub async fn delete_bill(&self, bill_id: Uuid, session_id: Uuid) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;

        sqlx::query!("DELETE FROM bill_payers WHERE bill_id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query!("DELETE FROM bill_splits WHERE bill_id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query!("DELETE FROM bills WHERE id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        SessionDebtRepository::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        Ok(())
    }

    async fn insert_bill_split(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        bill_id: Uuid,
        participant_id: Uuid,
        amount: Decimal,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO bill_splits (id, bill_id, participant_id, amount_owed)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(bill_id)
        .bind(participant_id)
        .bind(amount)
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    async fn split_among_all_participants(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        bill_id: Uuid,
        session_id: Uuid,
        amount: Decimal,
    ) -> Result<(), AppError> {
        let participants = sqlx::query_scalar!(
            r#"
            SELECT id
            FROM session_participants
            WHERE session_id = $1 AND is_active = true
            ORDER BY joined_at ASC, id ASC
            "#,
            session_id
        )
        .fetch_all(&mut **tx)
        .await?;

        let split_amounts = SplitCalculator::calculate_equal_split(amount, participants.len());
        for (participant_id, split_amount) in participants.into_iter().zip(split_amounts) {
            Self::insert_bill_split(tx, bill_id, participant_id, split_amount).await?;
        }

        Ok(())
    }

    async fn split_weighted_among_participants(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        bill_id: Uuid,
        session_id: Uuid,
        amount: Decimal,
    ) -> Result<(), AppError> {
        #[derive(sqlx::FromRow)]
        struct ParticipantWeight {
            id: Uuid,
            default_weight: i32,
        }

        let participants: Vec<ParticipantWeight> = sqlx::query_as(
            r#"
            SELECT id, default_weight
            FROM session_participants
            WHERE session_id = $1 AND is_active = true
            ORDER BY joined_at ASC, id ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(&mut **tx)
        .await?;

        if participants.is_empty() {
            return Ok(());
        }

        let weights: Vec<Decimal> = participants
            .iter()
            .map(|p| Decimal::from(p.default_weight))
            .collect();
        let split_amounts =
            SplitCalculator::calculate_weighted_split_with_scale(amount, &weights, 2);

        for (participant, split_amount) in participants.into_iter().zip(split_amounts) {
            Self::insert_bill_split(tx, bill_id, participant.id, split_amount).await?;
        }

        Ok(())
    }

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
