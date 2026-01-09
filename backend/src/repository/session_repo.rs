#![allow(dead_code)]
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::sessions::{
    BillResponse, ParticipantBasicInfo, ParticipantResponse, PayerInput, SessionDetailResponse,
    SessionResponse, SplitDetailInput,
};
use crate::domain::session::{ParticipantRole, SessionStatus};
use crate::error::AppError;

pub struct SessionRepository {
    pool: PgPool,
}

impl SessionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user(&self, user_id: Uuid) -> Result<Vec<SessionResponse>, AppError> {
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
                (SELECT COALESCE(SUM(amount), 0) FROM bills WHERE session_id = s.id) as total_amount
            FROM sessions s
            WHERE s.id IN (
                SELECT session_id FROM session_participants WHERE user_id = $1
            )
            ORDER BY s.session_date DESC, s.created_at DESC
            "#
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        // Batch load all related data (fix N+1 queries)
        let session_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
        let participants_map = self.batch_get_participants(&session_ids).await?;
        let debts_map = self.batch_get_user_debts(&session_ids, user_id).await?;
        let settled_map = self.batch_get_settled_amounts(&session_ids).await?;

        // Build sessions with pre-loaded data
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
                    participants,
                    my_debt,
                    my_owed,
                    settled_amount,
                }
            })
            .collect();

        Ok(sessions)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn find_by_user_paginated(
        &self,
        user_id: Uuid,
        search: Option<&str>,
        status: Option<&str>,
        from: Option<chrono::NaiveDate>,
        to: Option<chrono::NaiveDate>,
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
        }

        let offset = (page - 1) * limit;

        // Build dynamic query
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
                (SELECT COALESCE(SUM(amount), 0) FROM bills WHERE session_id = s.id) as total_amount
            FROM sessions s
            WHERE s.id IN (
                SELECT session_id FROM session_participants WHERE user_id = $1
            )
            AND ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%')
            AND ($3::text IS NULL OR s.status::text = $3)
            AND ($4::date IS NULL OR s.session_date >= $4)
            AND ($5::date IS NULL OR s.session_date <= $5)
            ORDER BY s.session_date DESC, s.created_at DESC
            LIMIT $6 OFFSET $7
            "#
        )
        .bind(user_id)
        .bind(search)
        .bind(status)
        .bind(from)
        .bind(to)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        // Get total count
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
            "#,
        )
        .bind(user_id)
        .bind(search)
        .bind(status)
        .bind(from)
        .bind(to)
        .fetch_one(&self.pool)
        .await?;

        // Batch load all related data (fix N+1 queries)
        let session_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
        let participants_map = self.batch_get_participants(&session_ids).await?;
        let debts_map = self.batch_get_user_debts(&session_ids, user_id).await?;
        let settled_map = self.batch_get_settled_amounts(&session_ids).await?;

        // Build sessions with pre-loaded data
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
                    participants,
                    my_debt,
                    my_owed,
                    settled_amount,
                }
            })
            .collect();

        Ok((sessions, total))
    }

    /// Get basic participant info for session cards (max 5)
    async fn get_session_participants_basic(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<ParticipantBasicInfo>, AppError> {
        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            id: Uuid,
            name: String,
            avatar_url: Option<String>,
        }

        let participants: Vec<ParticipantRow> = sqlx::query_as(
            r#"
            SELECT 
                sp.id,
                COALESCE(u.full_name, sp.guest_name, 'Guest') as name,
                u.avatar_url
            FROM session_participants sp
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.session_id = $1
            ORDER BY sp.joined_at
            LIMIT 5
            "#,
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(participants
            .into_iter()
            .map(|p| ParticipantBasicInfo {
                id: p.id,
                name: p.name,
                avatar_url: p.avatar_url,
            })
            .collect())
    }

    /// Get user's debt/owed amounts in a session
    async fn get_user_debt_in_session(
        &self,
        session_id: Uuid,
        user_id: Uuid,
    ) -> Result<(Decimal, Decimal), AppError> {
        // First get user's participant_id in this session
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

        // Get amount user owes (debtor)
        let my_debt: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts 
            WHERE session_id = $1 AND debtor_id = $2 AND status = 'pending'
            "#,
        )
        .bind(session_id)
        .bind(participant_id)
        .fetch_one(&self.pool)
        .await?;

        // Get amount user is owed (creditor)
        let my_owed: Decimal = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM debts 
            WHERE session_id = $1 AND creditor_id = $2 AND status = 'pending'
            "#,
        )
        .bind(session_id)
        .bind(participant_id)
        .fetch_one(&self.pool)
        .await?;

        Ok((my_debt, my_owed))
    }

    /// Get total settled amount in a session
    async fn get_session_settled_amount(&self, session_id: Uuid) -> Result<Decimal, AppError> {
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

    /// Batch get participants for multiple sessions (max 5 per session)
    async fn batch_get_participants(
        &self,
        session_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Vec<ParticipantBasicInfo>>, AppError> {
        use std::collections::HashMap;

        if session_ids.is_empty() {
            return Ok(HashMap::new());
        }

        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            session_id: Uuid,
            id: Uuid,
            name: String,
            avatar_url: Option<String>,
            row_num: i64,
        }

        let participants: Vec<ParticipantRow> = sqlx::query_as(
            r#"
            SELECT session_id, id, name, avatar_url, row_num FROM (
                SELECT 
                    sp.session_id,
                    sp.id,
                    COALESCE(u.full_name, sp.guest_name, 'Guest') as name,
                    u.avatar_url,
                    ROW_NUMBER() OVER (PARTITION BY sp.session_id ORDER BY sp.joined_at) as row_num
                FROM session_participants sp
                LEFT JOIN users u ON sp.user_id = u.id
                WHERE sp.session_id = ANY($1)
            ) sub
            WHERE row_num <= 5
            "#,
        )
        .bind(session_ids)
        .fetch_all(&self.pool)
        .await?;

        let mut result: HashMap<Uuid, Vec<ParticipantBasicInfo>> = HashMap::new();
        for p in participants {
            result
                .entry(p.session_id)
                .or_default()
                .push(ParticipantBasicInfo {
                    id: p.id,
                    name: p.name,
                    avatar_url: p.avatar_url,
                });
        }

        // Ensure all session_ids have an entry (even if empty)
        for sid in session_ids {
            result.entry(*sid).or_default();
        }

        Ok(result)
    }

    /// Batch get user's debt/owed amounts in multiple sessions
    async fn batch_get_user_debts(
        &self,
        session_ids: &[Uuid],
        user_id: Uuid,
    ) -> Result<std::collections::HashMap<Uuid, (Decimal, Decimal)>, AppError> {
        use std::collections::HashMap;

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
                COALESCE(SUM(CASE WHEN d.debtor_id = sp.id AND d.status = 'pending' THEN d.amount ELSE 0 END), 0) as my_debt,
                COALESCE(SUM(CASE WHEN d.creditor_id = sp.id AND d.status = 'pending' THEN d.amount ELSE 0 END), 0) as my_owed
            FROM session_participants sp
            LEFT JOIN debts d ON d.session_id = sp.session_id AND (d.debtor_id = sp.id OR d.creditor_id = sp.id)
            WHERE sp.session_id = ANY($1) AND sp.user_id = $2
            GROUP BY sp.session_id
            "#
        )
        .bind(session_ids)
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut result: HashMap<Uuid, (Decimal, Decimal)> = HashMap::new();
        for d in debts {
            result.insert(d.session_id, (d.my_debt, d.my_owed));
        }

        // Ensure all session_ids have an entry with zeros
        for sid in session_ids {
            result.entry(*sid).or_insert((Decimal::ZERO, Decimal::ZERO));
        }

        Ok(result)
    }

    /// Batch get settled amounts for multiple sessions
    async fn batch_get_settled_amounts(
        &self,
        session_ids: &[Uuid],
    ) -> Result<std::collections::HashMap<Uuid, Decimal>, AppError> {
        use std::collections::HashMap;

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

        // Ensure all session_ids have an entry with zero
        for sid in session_ids {
            result.entry(*sid).or_insert(Decimal::ZERO);
        }

        Ok(result)
    }

    pub async fn create(
        &self,
        name: &str,
        location: Option<&str>,
        created_by: Uuid,
    ) -> Result<SessionResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        let session_id = Uuid::new_v4();
        let session_date = chrono::Utc::now().date_naive();

        sqlx::query(
            r#"
            INSERT INTO sessions (id, name, location, status, created_by, session_date, created_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW())
            "#
        )
        .bind(session_id)
        .bind(name)
        .bind(location)
        .bind(created_by)
        .bind(session_date)
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"
            INSERT INTO session_participants (id, session_id, user_id, role, joined_at)
            VALUES ($1, $2, $3, 'owner', NOW())
            "#,
            Uuid::new_v4(),
            session_id,
            created_by
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        // Get owner info for participants list
        let owner_info: Option<(String, Option<String>)> =
            sqlx::query_as("SELECT full_name, avatar_url FROM users WHERE id = $1")
                .bind(created_by)
                .fetch_optional(&self.pool)
                .await?;

        let participants = vec![ParticipantBasicInfo {
            id: Uuid::nil(), // Will be actual ID but we don't have it easily here
            name: owner_info
                .clone()
                .map(|(n, _)| n)
                .unwrap_or_else(|| "Unknown".to_string()),
            avatar_url: owner_info.and_then(|(_, a)| a),
        }];

        Ok(SessionResponse {
            id: session_id,
            name: name.to_string(),
            location: location.map(String::from),
            status: SessionStatus::Active,
            created_by,
            created_at: chrono::Utc::now(),
            session_date,
            participant_count: 1,
            total_amount: Decimal::ZERO,
            participants,
            my_debt: Decimal::ZERO,
            my_owed: Decimal::ZERO,
            settled_amount: Decimal::ZERO,
        })
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
    ) -> Result<SessionResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        let session_id = Uuid::new_v4();
        let date = session_date.unwrap_or_else(|| chrono::Utc::now().date_naive());

        sqlx::query(
            r#"
            INSERT INTO sessions (id, name, location, status, created_by, group_id, session_date, created_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW(), NOW())
            "#
        )
        .bind(session_id)
        .bind(name)
        .bind(location)
        .bind(created_by)
        .bind(group_id)
        .bind(date)
        .execute(&mut *tx)
        .await?;

        // Add creator as owner
        sqlx::query!(
            r#"
            INSERT INTO session_participants (id, session_id, user_id, role, joined_at)
            VALUES ($1, $2, $3, 'owner', NOW())
            "#,
            Uuid::new_v4(),
            session_id,
            created_by
        )
        .execute(&mut *tx)
        .await?;

        // Add selected participants as members
        let mut participant_count = 1i64;
        if let Some(ids) = participant_ids {
            for user_id in ids {
                if *user_id != created_by {
                    sqlx::query!(
                        r#"
                        INSERT INTO session_participants (id, session_id, user_id, role, joined_at)
                        VALUES ($1, $2, $3, 'member', NOW())
                        ON CONFLICT DO NOTHING
                        "#,
                        Uuid::new_v4(),
                        session_id,
                        user_id
                    )
                    .execute(&mut *tx)
                    .await?;
                    participant_count += 1;
                }
            }
        }

        // Add guests (participants without user accounts)
        if let Some(guests) = guest_names {
            for guest_name in guests {
                if !guest_name.trim().is_empty() {
                    sqlx::query!(
                        r#"
                        INSERT INTO session_participants (id, session_id, user_id, guest_name, role, joined_at)
                        VALUES ($1, $2, NULL, $3, 'member', NOW())
                        "#,
                        Uuid::new_v4(),
                        session_id,
                        guest_name.trim()
                    )
                    .execute(&mut *tx)
                    .await?;
                    participant_count += 1;
                }
            }
        }

        tx.commit().await?;

        // Get participants basic info
        let participants = self.get_session_participants_basic(session_id).await?;

        Ok(SessionResponse {
            id: session_id,
            name: name.to_string(),
            location: location.map(String::from),
            status: SessionStatus::Active,
            created_by,
            created_at: chrono::Utc::now(),
            session_date: date,
            participant_count,
            total_amount: Decimal::ZERO,
            participants,
            my_debt: Decimal::ZERO,
            my_owed: Decimal::ZERO,
            settled_amount: Decimal::ZERO,
        })
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
                s.group_id
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

        let participants = sqlx::query!(
            r#"
            SELECT 
                sp.id,
                sp.user_id,
                sp.guest_name,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as "display_name!",
                sp.role as "role: ParticipantRole",
                sp.joined_at
            FROM session_participants sp
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.session_id = $1
            ORDER BY sp.joined_at
            "#,
            session_id
        )
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
            participants: participants
                .into_iter()
                .map(|p| ParticipantResponse {
                    id: p.id,
                    user_id: p.user_id,
                    guest_name: p.guest_name,
                    display_name: p.display_name,
                    role: p.role,
                    joined_at: p.joined_at,
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

    pub async fn update_status(
        &self,
        session_id: Uuid,
        status: SessionStatus,
    ) -> Result<SessionResponse, AppError> {
        let status_str = match status {
            SessionStatus::Active => "active",
            SessionStatus::Closed => "closed",
        };

        #[derive(sqlx::FromRow)]
        struct SessionRow {
            id: Uuid,
            name: String,
            location: Option<String>,
            status: String,
            created_by: Uuid,
            created_at: chrono::DateTime<chrono::Utc>,
            session_date: chrono::NaiveDate,
        }

        let session: SessionRow = sqlx::query_as(
            r#"
            UPDATE sessions
            SET status = $1::session_status, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, location, status::text, created_by, created_at, session_date
            "#,
        )
        .bind(status_str)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

        let participant_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM session_participants WHERE session_id = $1"#,
            session_id
        )
        .fetch_one(&self.pool)
        .await?;

        let total_amount = sqlx::query_scalar!(
            r#"SELECT COALESCE(SUM(amount), 0) as "total!" FROM bills WHERE session_id = $1"#,
            session_id
        )
        .fetch_one(&self.pool)
        .await?;

        // Get participants and debt info
        let participants = self.get_session_participants_basic(session_id).await?;
        let settled_amount = self.get_session_settled_amount(session_id).await?;

        Ok(SessionResponse {
            id: session.id,
            name: session.name,
            location: session.location,
            status: if session.status == "closed" {
                SessionStatus::Closed
            } else {
                SessionStatus::Active
            },
            created_by: session.created_by,
            created_at: session.created_at,
            session_date: session.session_date,
            participant_count,
            total_amount,
            participants,
            my_debt: Decimal::ZERO, // Not tracking user context here
            my_owed: Decimal::ZERO,
            settled_amount,
        })
    }

    pub async fn add_participant(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        guest_name: Option<String>,
    ) -> Result<ParticipantResponse, AppError> {
        let participant_id = Uuid::new_v4();
        let display_name = if let Some(uid) = user_id {
            let user = sqlx::query_scalar!(r#"SELECT full_name FROM users WHERE id = $1"#, uid)
                .fetch_optional(&self.pool)
                .await?
                .ok_or(AppError::UserNotFound { user_id: uid })?;
            user
        } else {
            guest_name.clone().unwrap_or_else(|| "Guest".to_string())
        };

        sqlx::query!(
            r#"
            INSERT INTO session_participants (id, session_id, user_id, guest_name, role, joined_at)
            VALUES ($1, $2, $3, $4, 'member', NOW())
            "#,
            participant_id,
            session_id,
            user_id,
            guest_name
        )
        .execute(&self.pool)
        .await?;

        Ok(ParticipantResponse {
            id: participant_id,
            user_id,
            guest_name,
            display_name,
            role: ParticipantRole::Member,
            joined_at: chrono::Utc::now(),
        })
    }

    pub async fn update_participant(
        &self,
        participant_id: Uuid,
        guest_name: Option<String>,
    ) -> Result<ParticipantResponse, AppError> {
        let participant = sqlx::query!(
            r#"
            UPDATE session_participants
            SET guest_name = COALESCE($1, guest_name)
            WHERE id = $2
            RETURNING id, session_id, user_id, guest_name, role::text as "role!", joined_at
            "#,
            guest_name,
            participant_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Validation {
            field: "participant_id".to_string(),
            message: "Participant not found".to_string(),
        })?;

        let display_name = if let Some(uid) = participant.user_id {
            sqlx::query_scalar!(r#"SELECT full_name FROM users WHERE id = $1"#, uid)
                .fetch_optional(&self.pool)
                .await?
                .unwrap_or_else(|| "Unknown".to_string())
        } else {
            participant
                .guest_name
                .clone()
                .unwrap_or_else(|| "Guest".to_string())
        };

        Ok(ParticipantResponse {
            id: participant.id,
            user_id: participant.user_id,
            guest_name: participant.guest_name,
            display_name,
            role: if participant.role == "owner" {
                ParticipantRole::Owner
            } else {
                ParticipantRole::Member
            },
            joined_at: participant.joined_at,
        })
    }

    pub async fn delete_participant(&self, participant_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            "DELETE FROM session_participants WHERE id = $1",
            participant_id
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete(&self, session_id: Uuid) -> Result<(), AppError> {
        // Foreign key constraints with ON DELETE CASCADE will handle related data
        sqlx::query!("DELETE FROM sessions WHERE id = $1", session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

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

    #[allow(clippy::too_many_arguments)]
    pub async fn create_bill(
        &self,
        session_id: Uuid,
        description: &str,
        amount: Decimal,
        split_strategy: &str,
        created_by: Uuid,
        payers: &[PayerInput],
        split_details: Option<&[SplitDetailInput]>,
        category_id: Option<Uuid>,
    ) -> Result<BillResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        let bill_id = Uuid::new_v4();

        sqlx::query(
            r#"
            INSERT INTO bills (id, session_id, description, amount, split_strategy, created_by, category_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            "#,
        )
        .bind(bill_id)
        .bind(session_id)
        .bind(description)
        .bind(amount)
        .bind(split_strategy)
        .bind(created_by)
        .bind(category_id)
        .execute(&mut *tx)
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
            .execute(&mut *tx)
            .await?;
        }

        if split_strategy.to_uppercase() == "CUSTOM" {
            if let Some(details) = split_details {
                for detail in details {
                    sqlx::query!(
                        r#"
                        INSERT INTO bill_splits (id, bill_id, participant_id, amount_owed)
                        VALUES ($1, $2, $3, $4)
                        "#,
                        Uuid::new_v4(),
                        bill_id,
                        detail.participant_id,
                        detail.amount
                    )
                    .execute(&mut *tx)
                    .await?;
                }
            }
        } else {
            // For EQUAL split, use split_details if provided (selected participants only)
            // Otherwise fall back to all participants
            if let Some(details) = split_details {
                if !details.is_empty() {
                    for detail in details {
                        sqlx::query!(
                            r#"
                            INSERT INTO bill_splits (id, bill_id, participant_id, amount_owed)
                            VALUES ($1, $2, $3, $4)
                            "#,
                            Uuid::new_v4(),
                            bill_id,
                            detail.participant_id,
                            detail.amount
                        )
                        .execute(&mut *tx)
                        .await?;
                    }
                } else {
                    // Empty split_details, split among all participants
                    Self::split_among_all_participants(&mut tx, bill_id, session_id, amount)
                        .await?;
                }
            } else {
                // No split_details provided, split among all participants
                Self::split_among_all_participants(&mut tx, bill_id, session_id, amount).await?;
            }
        }

        Self::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        Ok(BillResponse {
            id: bill_id,
            session_id,
            description: description.to_string(),
            amount,
            split_strategy: split_strategy.to_string(),
            created_by,
            created_at: chrono::Utc::now(),
        })
    }

    async fn split_among_all_participants(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        bill_id: Uuid,
        session_id: Uuid,
        amount: Decimal,
    ) -> Result<(), AppError> {
        let participants = sqlx::query_scalar!(
            r#"SELECT id FROM session_participants WHERE session_id = $1"#,
            session_id
        )
        .fetch_all(&mut **tx)
        .await?;

        let participant_count = participants.len();
        if participant_count > 0 {
            let split_amount = amount / Decimal::from(participant_count);

            for participant_id in participants {
                sqlx::query!(
                    r#"
                    INSERT INTO bill_splits (id, bill_id, participant_id, amount_owed)
                    VALUES ($1, $2, $3, $4)
                    "#,
                    Uuid::new_v4(),
                    bill_id,
                    participant_id,
                    split_amount
                )
                .execute(&mut **tx)
                .await?;
            }
        }
        Ok(())
    }

    async fn recalculate_debts(
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        session_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query!(
            r#"DELETE FROM debts WHERE session_id = $1 AND status = 'pending'"#,
            session_id
        )
        .execute(&mut **tx)
        .await?;

        let balances = sqlx::query!(
            r#"
            SELECT 
                sp.id as participant_id,
                COALESCE(SUM(bp.amount_paid), 0) - COALESCE(SUM(bs.amount_owed), 0) as "balance!"
            FROM session_participants sp
            LEFT JOIN bill_payers bp ON sp.id = bp.participant_id
            LEFT JOIN bill_splits bs ON sp.id = bs.participant_id
            WHERE sp.session_id = $1
            GROUP BY sp.id
            "#,
            session_id
        )
        .fetch_all(&mut **tx)
        .await?;

        let mut creditors: Vec<_> = balances
            .iter()
            .filter(|b| b.balance > Decimal::ZERO)
            .collect();
        let mut debtors: Vec<_> = balances
            .iter()
            .filter(|b| b.balance < Decimal::ZERO)
            .collect();

        creditors.sort_by(|a, b| b.balance.cmp(&a.balance));
        debtors.sort_by(|a, b| a.balance.cmp(&b.balance));

        let mut c_idx = 0;
        let mut d_idx = 0;
        let mut creditor_remaining: Vec<Decimal> = creditors.iter().map(|c| c.balance).collect();
        let mut debtor_remaining: Vec<Decimal> = debtors.iter().map(|d| d.balance.abs()).collect();

        while c_idx < creditors.len() && d_idx < debtors.len() {
            let transfer = creditor_remaining[c_idx].min(debtor_remaining[d_idx]);

            if transfer > Decimal::ZERO {
                sqlx::query!(
                    r#"
                    INSERT INTO debts (id, session_id, debtor_id, creditor_id, amount, status, created_at)
                    VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
                    "#,
                    Uuid::new_v4(),
                    session_id,
                    debtors[d_idx].participant_id,
                    creditors[c_idx].participant_id,
                    transfer
                )
                .execute(&mut **tx)
                .await?;

                creditor_remaining[c_idx] -= transfer;
                debtor_remaining[d_idx] -= transfer;
            }

            if creditor_remaining[c_idx] == Decimal::ZERO {
                c_idx += 1;
            }
            if debtor_remaining[d_idx] == Decimal::ZERO {
                d_idx += 1;
            }
        }

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update_bill(
        &self,
        bill_id: Uuid,
        session_id: Uuid,
        description: Option<&str>,
        amount: Option<Decimal>,
        split_strategy: Option<&str>,
        payers: Option<&[PayerInput]>,
        split_details: Option<&[SplitDetailInput]>,
        category_id: Option<Uuid>,
        receipt_url: Option<&str>,
    ) -> Result<BillResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        // Update bill basic info
        let updated_bill: BillResponse = sqlx::query_as(
            r#"
            UPDATE bills
            SET 
                description = COALESCE($1, description),
                amount = COALESCE($2, amount),
                split_strategy = COALESCE($3, split_strategy),
                category_id = COALESCE($4, category_id),
                receipt_url = COALESCE($5, receipt_url)
            WHERE id = $6
            RETURNING id, session_id, description, amount, split_strategy, created_by, created_at
            "#,
        )
        .bind(description)
        .bind(amount)
        .bind(split_strategy)
        .bind(category_id)
        .bind(receipt_url)
        .bind(bill_id)
        .fetch_one(&mut *tx)
        .await?;

        // Update payers if provided
        if let Some(payer_list) = payers {
            // Delete existing payers
            sqlx::query!("DELETE FROM bill_payers WHERE bill_id = $1", bill_id)
                .execute(&mut *tx)
                .await?;

            // Insert new payers
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

        // Update splits if provided
        if let Some(split_list) = split_details {
            // Delete existing splits
            sqlx::query!("DELETE FROM bill_splits WHERE bill_id = $1", bill_id)
                .execute(&mut *tx)
                .await?;

            // Insert new splits
            for split in split_list {
                sqlx::query!(
                    r#"
                    INSERT INTO bill_splits (id, bill_id, participant_id, amount_owed)
                    VALUES ($1, $2, $3, $4)
                    "#,
                    Uuid::new_v4(),
                    bill_id,
                    split.participant_id,
                    split.amount
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        // Recalculate debts
        Self::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        Ok(updated_bill)
    }

    pub async fn delete_bill(&self, bill_id: Uuid, session_id: Uuid) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;

        // Delete bill payers
        sqlx::query!("DELETE FROM bill_payers WHERE bill_id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        // Delete bill splits
        sqlx::query!("DELETE FROM bill_splits WHERE bill_id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        // Delete the bill itself
        sqlx::query!("DELETE FROM bills WHERE id = $1", bill_id)
            .execute(&mut *tx)
            .await?;

        // Recalculate debts for the session
        Self::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        Ok(())
    }
}
