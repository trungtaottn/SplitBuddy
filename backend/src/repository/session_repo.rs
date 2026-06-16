#![allow(dead_code)]
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::sessions::{
    BillDetailResponse, BillResponse, ParticipantBasicInfo, ParticipantResponse, PayerInput,
    SessionDetailResponse, SessionResponse, SplitDetailInput,
};
use crate::domain::session::SessionStatus;
use crate::error::AppError;
use crate::repository::session::{
    ParticipantRepository, SessionBillRepository, SessionDebtRepository, SessionReadRepository,
    SessionWriteRepository,
};

pub struct SessionRepository {
    pool: PgPool,
}

impl SessionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user(
        &self,
        user_id: Uuid,
        include_archived: bool,
    ) -> Result<Vec<SessionResponse>, AppError> {
        SessionReadRepository::new(self.pool.clone())
            .find_by_user(user_id, include_archived)
            .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn find_by_user_paginated(
        &self,
        user_id: Uuid,
        search: Option<&str>,
        status: Option<&str>,
        from: Option<chrono::NaiveDate>,
        to: Option<chrono::NaiveDate>,
        include_archived: bool,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<SessionResponse>, i64), AppError> {
        SessionReadRepository::new(self.pool.clone())
            .find_by_user_paginated(
                user_id,
                search,
                status,
                from,
                to,
                include_archived,
                page,
                limit,
            )
            .await
    }

    /// Get basic participant info for session cards (max 5)
    pub async fn get_session_participants_basic(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<ParticipantBasicInfo>, AppError> {
        ParticipantRepository::new(self.pool.clone())
            .get_session_participants_basic(session_id)
            .await
    }

    /// Get user's debt/owed amounts in a session
    pub async fn get_user_debt_in_session(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(Decimal, Decimal), AppError> {
        SessionDebtRepository::new(self.pool.clone())
            .get_user_debt_in_session(session_id, user_id)
            .await
    }

    /// Get total settled amount in a session
    pub async fn get_session_settled_amount(&self, session_id: Uuid) -> Result<Decimal, AppError> {
        SessionDebtRepository::new(self.pool.clone())
            .get_session_settled_amount(session_id)
            .await
    }

    /// Batch get participants for multiple sessions (max 5 per session)
    pub async fn batch_get_participants(
        &self,
        session_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Vec<ParticipantBasicInfo>>, AppError> {
        ParticipantRepository::new(self.pool.clone())
            .batch_get_participants(session_ids)
            .await
    }

    /// Batch get user's debt/owed amounts in multiple sessions
    pub async fn batch_get_user_debts(
        &self,
        session_ids: &[Uuid],
        user_id: Uuid,
    ) -> Result<std::collections::HashMap<Uuid, (Decimal, Decimal)>, AppError> {
        SessionDebtRepository::new(self.pool.clone())
            .batch_get_user_debts(session_ids, user_id)
            .await
    }

    /// Batch get settled amounts for multiple sessions
    pub async fn batch_get_settled_amounts(
        &self,
        session_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Decimal>, AppError> {
        SessionDebtRepository::new(self.pool.clone())
            .batch_get_settled_amounts(session_ids)
            .await
    }

    pub async fn create(
        &self,
        name: &str,
        location: Option<&str>,
        created_by: Uuid,
    ) -> Result<SessionResponse, AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .create(name, location, created_by)
            .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_with_participants(
        &self,
        name: &str,
        location: Option<&str>,
        session_date: Option<chrono::NaiveDate>,
        created_by: Uuid,
        group_id: Option<Uuid>,
        participant_ids: Option<&[Uuid]>,
        guest_names: Option<&[String]>,
        base_currency: Option<&str>,
        timezone: Option<&str>,
    ) -> Result<SessionResponse, AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .create_with_participants(
                name,
                location,
                session_date,
                created_by,
                group_id,
                participant_ids,
                guest_names,
                base_currency,
                timezone,
            )
            .await
    }

    pub async fn find_by_id_with_details(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<SessionDetailResponse>, AppError> {
        SessionReadRepository::new(self.pool.clone())
            .find_by_id_with_details(session_id, user_id)
            .await
    }

    pub async fn verify_owner(&self, session_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        SessionReadRepository::new(self.pool.clone())
            .verify_owner(session_id, user_id)
            .await
    }

    pub async fn verify_participant(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        SessionReadRepository::new(self.pool.clone())
            .verify_participant(session_id, user_id)
            .await
    }

    pub async fn get_session_base_currency(&self, session_id: Uuid) -> Result<String, AppError> {
        SessionReadRepository::new(self.pool.clone())
            .get_session_base_currency(session_id)
            .await
    }

    pub async fn update_status(
        &self,
        session_id: Uuid,
        status: SessionStatus,
    ) -> Result<SessionResponse, AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .update_status(session_id, status)
            .await
    }

    pub async fn update_minimize_debts(
        &self,
        session_id: Uuid,
        minimize_debts: bool,
    ) -> Result<SessionResponse, AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .update_minimize_debts(session_id, minimize_debts)
            .await
    }

    pub async fn set_archived(
        &self,
        session_id: Uuid,
        archived: bool,
    ) -> Result<SessionResponse, AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .set_archived(session_id, archived)
            .await
    }

    pub async fn add_participant(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        guest_name: Option<String>,
    ) -> Result<ParticipantResponse, AppError> {
        ParticipantRepository::new(self.pool.clone())
            .add_participant(session_id, user_id, guest_name)
            .await
    }

    pub async fn update_participant(
        &self,
        participant_id: Uuid,
        guest_name: Option<String>,
        default_weight: Option<i32>,
        is_active: Option<bool>,
    ) -> Result<ParticipantResponse, AppError> {
        ParticipantRepository::new(self.pool.clone())
            .update_participant(participant_id, guest_name, default_weight, is_active)
            .await
    }

    pub async fn delete_participant(&self, participant_id: Uuid) -> Result<(), AppError> {
        ParticipantRepository::new(self.pool.clone())
            .delete_participant(participant_id)
            .await
    }

    pub async fn delete(&self, session_id: Uuid) -> Result<(), AppError> {
        SessionWriteRepository::new(self.pool.clone())
            .delete(session_id)
            .await
    }

    pub async fn find_bills_by_session(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<BillResponse>, AppError> {
        SessionBillRepository::new(self.pool.clone())
            .find_bills_by_session(session_id)
            .await
    }

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
        SessionBillRepository::new(self.pool.clone())
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

    pub async fn recalculate_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionDebtRepository::recalculate_debts(tx, session_id).await
    }

    pub async fn recalculate_minimized_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionDebtRepository::recalculate_minimized_debts(tx, session_id).await
    }

    pub async fn recalculate_direct_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        SessionDebtRepository::recalculate_direct_debts(tx, session_id).await
    }

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
        SessionBillRepository::new(self.pool.clone())
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

    pub async fn delete_bill(&self, bill_id: Uuid, session_id: Uuid) -> Result<(), AppError> {
        SessionBillRepository::new(self.pool.clone())
            .delete_bill(bill_id, session_id)
            .await
    }
    pub async fn find_bills_with_details(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<BillDetailResponse>, AppError> {
        SessionBillRepository::new(self.pool.clone())
            .find_bills_with_details(session_id)
            .await
    }
}
