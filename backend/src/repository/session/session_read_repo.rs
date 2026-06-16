use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::sessions::{ParticipantResponse, SessionDetailResponse, SessionResponse};
use crate::domain::session::{ParticipantRole, SessionStatus};
use crate::error::AppError;
use crate::repository::session::{ParticipantRepository, SessionDebtRepository};

pub struct SessionReadRepository {
    pool: PgPool,
    participant_repo: ParticipantRepository,
    debt_repo: SessionDebtRepository,
}

impl SessionReadRepository {
    pub fn new(pool: PgPool) -> Self {
        Self {
            participant_repo: ParticipantRepository::new(pool.clone()),
            debt_repo: SessionDebtRepository::new(pool.clone()),
            pool,
        }
    }

    pub async fn find_by_user(
        &self,
        user_id: Uuid,
        include_archived: bool,
    ) -> Result<Vec<SessionResponse>, AppError> {
        #[derive(sqlx::FromRow)]
        struct SessionRow {
            id: Uuid,
            name: String,
            location: Option<String>,
            status: String,
            created_by: Uuid,
            created_at: chrono::DateTime<chrono::Utc>,
            session_date: chrono::NaiveDate,
            participant_count: i64,
            total_amount: Decimal,
            base_currency: String,
            minimize_debts: bool,
            timezone: String,
            archived_at: Option<chrono::DateTime<chrono::Utc>>,
        }

        let rows: Vec<SessionRow> = sqlx::query_as(
            r#"
            SELECT 
                s.id,
                s.name,
                s.location,
                s.status::text,
                s.created_by,
                s.created_at,
                s.session_date,
                (SELECT COUNT(*) FROM session_participants WHERE session_id = s.id)::bigint as participant_count,
                (SELECT COALESCE(SUM(amount), 0) FROM bills WHERE session_id = s.id) as total_amount,
                s.base_currency,
                s.minimize_debts,
                s.timezone,
                s.archived_at
            FROM sessions s
            WHERE s.id IN (
                SELECT session_id FROM session_participants WHERE user_id = $1
            )
            AND ($2::bool OR s.archived_at IS NULL)
            ORDER BY s.session_date DESC, s.created_at DESC
            "#,
        )
        .bind(user_id)
        .bind(include_archived)
        .fetch_all(&self.pool)
        .await?;

        let session_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
        let participants_map = self
            .participant_repo
            .batch_get_participants(&session_ids)
            .await?;
        let debts_map = self
            .debt_repo
            .batch_get_user_debts(&session_ids, user_id)
            .await?;
        let settled_map = self
            .debt_repo
            .batch_get_settled_amounts(&session_ids)
            .await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let participants = participants_map.get(&row.id).cloned().unwrap_or_default();
                let (my_debt, my_owed) = debts_map
                    .get(&row.id)
                    .copied()
                    .unwrap_or((Decimal::ZERO, Decimal::ZERO));
                let settled_amount = settled_map.get(&row.id).copied().unwrap_or(Decimal::ZERO);

                SessionResponse {
                    id: row.id,
                    name: row.name,
                    location: row.location,
                    status: match row.status.as_str() {
                        "active" => SessionStatus::Active,
                        _ => SessionStatus::Closed,
                    },
                    created_by: row.created_by,
                    created_at: row.created_at,
                    session_date: row.session_date,
                    participant_count: row.participant_count,
                    total_amount: row.total_amount,
                    base_currency: row.base_currency,
                    minimize_debts: row.minimize_debts,
                    timezone: row.timezone,
                    archived_at: row.archived_at,
                    participants,
                    my_debt,
                    my_owed,
                    settled_amount,
                }
            })
            .collect())
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
        #[derive(sqlx::FromRow)]
        struct SessionRow {
            id: Uuid,
            name: String,
            location: Option<String>,
            status: String,
            created_by: Uuid,
            created_at: chrono::DateTime<chrono::Utc>,
            session_date: chrono::NaiveDate,
            participant_count: i64,
            total_amount: Decimal,
            base_currency: String,
            minimize_debts: bool,
            timezone: String,
            archived_at: Option<chrono::DateTime<chrono::Utc>>,
        }

        let offset = (page - 1) * limit;

        let rows: Vec<SessionRow> = sqlx::query_as(
            r#"
            SELECT 
                s.id,
                s.name,
                s.location,
                s.status::text,
                s.created_by,
                s.created_at,
                s.session_date,
                (SELECT COUNT(*) FROM session_participants WHERE session_id = s.id)::bigint as participant_count,
                (SELECT COALESCE(SUM(amount), 0) FROM bills WHERE session_id = s.id) as total_amount,
                s.base_currency,
                s.minimize_debts,
                s.timezone,
                s.archived_at
            FROM sessions s
            WHERE s.id IN (
                SELECT session_id FROM session_participants WHERE user_id = $1
            )
            AND ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%')
            AND ($3::text IS NULL OR s.status::text = $3)
            AND ($4::date IS NULL OR s.session_date >= $4)
            AND ($5::date IS NULL OR s.session_date <= $5)
            AND ($6::bool OR s.archived_at IS NULL)
            ORDER BY s.session_date DESC, s.created_at DESC
            LIMIT $7 OFFSET $8
            "#,
        )
        .bind(user_id)
        .bind(search)
        .bind(status)
        .bind(from)
        .bind(to)
        .bind(include_archived)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)::bigint
            FROM sessions s
            WHERE s.id IN (
                SELECT session_id FROM session_participants WHERE user_id = $1
            )
            AND ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%')
            AND ($3::text IS NULL OR s.status::text = $3)
            AND ($4::date IS NULL OR s.session_date >= $4)
            AND ($5::date IS NULL OR s.session_date <= $5)
            AND ($6::bool OR s.archived_at IS NULL)
            "#,
        )
        .bind(user_id)
        .bind(search)
        .bind(status)
        .bind(from)
        .bind(to)
        .bind(include_archived)
        .fetch_one(&self.pool)
        .await?;

        let session_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
        let participants_map = self
            .participant_repo
            .batch_get_participants(&session_ids)
            .await?;
        let debts_map = self
            .debt_repo
            .batch_get_user_debts(&session_ids, user_id)
            .await?;
        let settled_map = self
            .debt_repo
            .batch_get_settled_amounts(&session_ids)
            .await?;

        let sessions = rows
            .into_iter()
            .map(|row| {
                let participants = participants_map.get(&row.id).cloned().unwrap_or_default();
                let (my_debt, my_owed) = debts_map
                    .get(&row.id)
                    .copied()
                    .unwrap_or((Decimal::ZERO, Decimal::ZERO));
                let settled_amount = settled_map.get(&row.id).copied().unwrap_or(Decimal::ZERO);

                SessionResponse {
                    id: row.id,
                    name: row.name,
                    location: row.location,
                    status: match row.status.as_str() {
                        "active" => SessionStatus::Active,
                        _ => SessionStatus::Closed,
                    },
                    created_by: row.created_by,
                    created_at: row.created_at,
                    session_date: row.session_date,
                    participant_count: row.participant_count,
                    total_amount: row.total_amount,
                    base_currency: row.base_currency,
                    minimize_debts: row.minimize_debts,
                    timezone: row.timezone,
                    archived_at: row.archived_at,
                    participants,
                    my_debt,
                    my_owed,
                    settled_amount,
                }
            })
            .collect();

        Ok((sessions, total))
    }

    pub async fn find_by_id_with_details(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<SessionDetailResponse>, AppError> {
        self.verify_participant(session_id, user_id).await?;

        #[derive(sqlx::FromRow)]
        struct SessionDetailRow {
            id: Uuid,
            name: String,
            location: Option<String>,
            status: String,
            created_by: Uuid,
            created_at: chrono::DateTime<chrono::Utc>,
            session_date: chrono::NaiveDate,
            total_amount: Decimal,
            group_id: Option<Uuid>,
            base_currency: String,
            minimize_debts: bool,
            timezone: String,
            archived_at: Option<chrono::DateTime<chrono::Utc>>,
        }

        let session: Option<SessionDetailRow> = sqlx::query_as(
            r#"
            SELECT 
                s.id,
                s.name,
                s.location,
                s.status::text,
                s.created_by,
                s.created_at,
                s.session_date,
                COALESCE(SUM(b.amount), 0) as total_amount,
                s.group_id,
                s.base_currency,
                s.minimize_debts,
                s.timezone,
                s.archived_at
            FROM sessions s
            LEFT JOIN bills b ON s.id = b.session_id
            WHERE s.id = $1
            GROUP BY s.id
            "#,
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?;

        let session = match session {
            Some(s) => s,
            None => return Ok(None),
        };

        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            id: Uuid,
            user_id: Option<Uuid>,
            guest_name: Option<String>,
            display_name: String,
            role: ParticipantRole,
            joined_at: chrono::DateTime<chrono::Utc>,
            default_weight: i32,
            is_active: bool,
        }

        let participants: Vec<ParticipantRow> = sqlx::query_as(
            r#"
            SELECT 
                sp.id,
                sp.user_id,
                sp.guest_name,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as display_name,
                sp.role,
                sp.joined_at,
                sp.default_weight,
                sp.is_active
            FROM session_participants sp
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.session_id = $1
            ORDER BY sp.joined_at
            "#,
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(Some(SessionDetailResponse {
            id: session.id,
            name: session.name,
            location: session.location,
            status: match session.status.as_str() {
                "active" => SessionStatus::Active,
                _ => SessionStatus::Closed,
            },
            created_by: session.created_by,
            created_at: session.created_at,
            session_date: session.session_date,
            total_amount: session.total_amount,
            group_id: session.group_id,
            base_currency: session.base_currency,
            minimize_debts: session.minimize_debts,
            timezone: session.timezone,
            archived_at: session.archived_at,
            participants: participants
                .into_iter()
                .map(|p| ParticipantResponse {
                    id: p.id,
                    user_id: p.user_id,
                    guest_name: p.guest_name,
                    display_name: p.display_name,
                    role: p.role,
                    joined_at: p.joined_at,
                    default_weight: p.default_weight,
                    is_active: p.is_active,
                })
                .collect(),
        }))
    }

    pub async fn verify_owner(&self, session_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        let is_owner = sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM session_participants 
                WHERE session_id = $1 AND user_id = $2 AND role = 'owner'
            ) as "exists!"
            "#,
            session_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        if !is_owner {
            return Err(AppError::Forbidden {
                message: "Only session owner can perform this action".to_string(),
            });
        }

        Ok(())
    }

    pub async fn verify_participant(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
        let is_participant = sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM session_participants 
                WHERE session_id = $1 AND user_id = $2
            ) as "exists!"
            "#,
            session_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        if !is_participant {
            return Err(AppError::Forbidden {
                message: "You are not a participant of this session".to_string(),
            });
        }

        Ok(())
    }

    pub async fn get_session_base_currency(&self, session_id: Uuid) -> Result<String, AppError> {
        let base_currency = sqlx::query_scalar!(
            r#"SELECT base_currency FROM sessions WHERE id = $1"#,
            session_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

        Ok(base_currency)
    }
}
