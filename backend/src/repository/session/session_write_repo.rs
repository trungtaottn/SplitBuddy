use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::sessions::{ParticipantBasicInfo, SessionResponse};
use crate::domain::session::SessionStatus;
use crate::error::AppError;
use crate::repository::session::{ParticipantRepository, SessionDebtRepository};

pub struct SessionWriteRepository {
    pool: PgPool,
    participant_repo: ParticipantRepository,
    debt_repo: SessionDebtRepository,
}

impl SessionWriteRepository {
    pub fn new(pool: PgPool) -> Self {
        Self {
            participant_repo: ParticipantRepository::new(pool.clone()),
            debt_repo: SessionDebtRepository::new(pool.clone()),
            pool,
        }
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
            INSERT INTO sessions (
                id,
                name,
                location,
                status,
                created_by,
                session_date,
                base_currency,
                timezone,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, 'active', $4, $5, 'VND', 'Asia/Ho_Chi_Minh', NOW(), NOW())
            "#,
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

        let owner_info: Option<(String, Option<String>)> =
            sqlx::query_as("SELECT full_name, avatar_url FROM users WHERE id = $1")
                .bind(created_by)
                .fetch_optional(&self.pool)
                .await?;

        let participants = vec![ParticipantBasicInfo {
            id: Uuid::nil(),
            name: owner_info
                .clone()
                .map(|(name, _)| name)
                .unwrap_or_else(|| "Unknown".to_string()),
            avatar_url: owner_info.and_then(|(_, avatar_url)| avatar_url),
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
            base_currency: "VND".to_string(),
            minimize_debts: true,
            timezone: "Asia/Ho_Chi_Minh".to_string(),
            archived_at: None,
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
        base_currency: Option<&str>,
        timezone: Option<&str>,
    ) -> Result<SessionResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        let session_id = Uuid::new_v4();
        let date = session_date.unwrap_or_else(|| chrono::Utc::now().date_naive());

        sqlx::query(
            r#"
            INSERT INTO sessions (
                id,
                name,
                location,
                status,
                created_by,
                group_id,
                session_date,
                base_currency,
                timezone,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, 'active', $4, $5, $6, COALESCE($7, 'VND'), COALESCE($8, 'Asia/Ho_Chi_Minh'), NOW(), NOW())
            "#
        )
        .bind(session_id)
        .bind(name)
        .bind(location)
        .bind(created_by)
        .bind(group_id)
        .bind(date)
        .bind(base_currency)
        .bind(timezone)
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

        let participants = self
            .participant_repo
            .get_session_participants_basic(session_id)
            .await?;
        let resolved_base_currency = base_currency.unwrap_or("VND");
        let resolved_timezone = timezone.unwrap_or("Asia/Ho_Chi_Minh");

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
            base_currency: resolved_base_currency.to_string(),
            minimize_debts: true,
            timezone: resolved_timezone.to_string(),
            archived_at: None,
            participants,
            my_debt: Decimal::ZERO,
            my_owed: Decimal::ZERO,
            settled_amount: Decimal::ZERO,
        })
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

        let session = sqlx::query_as::<_, SessionRow>(
            r#"
            UPDATE sessions
            SET status = $1::session_status, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, location, status::text, created_by, created_at, session_date,
                      base_currency, minimize_debts, timezone, archived_at
            "#,
        )
        .bind(status_str)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

        self.build_session_response(session, Decimal::ZERO, Decimal::ZERO)
            .await
    }

    pub async fn update_minimize_debts(
        &self,
        session_id: Uuid,
        minimize_debts: bool,
    ) -> Result<SessionResponse, AppError> {
        let mut tx = self.pool.begin().await?;

        let session = sqlx::query_as::<_, SessionRow>(
            r#"
            UPDATE sessions
            SET minimize_debts = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, location, status::text, created_by, created_at, session_date,
                      base_currency, minimize_debts, timezone, archived_at
            "#,
        )
        .bind(minimize_debts)
        .bind(session_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

        SessionDebtRepository::recalculate_debts(&mut tx, session_id).await?;

        tx.commit().await?;

        self.build_session_response(session, Decimal::ZERO, Decimal::ZERO)
            .await
    }

    pub async fn set_archived(
        &self,
        session_id: Uuid,
        archived: bool,
    ) -> Result<SessionResponse, AppError> {
        let archived_at = archived.then(chrono::Utc::now);

        let session = sqlx::query_as::<_, SessionRow>(
            r#"
            UPDATE sessions
            SET archived_at = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, location, status::text, created_by, created_at, session_date,
                      base_currency, minimize_debts, timezone, archived_at
            "#,
        )
        .bind(archived_at)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

        self.build_session_response(session, Decimal::ZERO, Decimal::ZERO)
            .await
    }

    pub async fn delete(&self, session_id: Uuid) -> Result<(), AppError> {
        sqlx::query!("DELETE FROM sessions WHERE id = $1", session_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn build_session_response(
        &self,
        session: SessionRow,
        my_debt: Decimal,
        my_owed: Decimal,
    ) -> Result<SessionResponse, AppError> {
        let participant_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) as "count!" FROM session_participants WHERE session_id = $1"#,
            session.id
        )
        .fetch_one(&self.pool)
        .await?;

        let total_amount = sqlx::query_scalar!(
            r#"SELECT COALESCE(SUM(amount), 0) as "total!" FROM bills WHERE session_id = $1"#,
            session.id
        )
        .fetch_one(&self.pool)
        .await?;

        let participants = self
            .participant_repo
            .get_session_participants_basic(session.id)
            .await?;
        let settled_amount = self
            .debt_repo
            .get_session_settled_amount(session.id)
            .await?;

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
            base_currency: session.base_currency,
            minimize_debts: session.minimize_debts,
            timezone: session.timezone,
            archived_at: session.archived_at,
            participants,
            my_debt,
            my_owed,
            settled_amount,
        })
    }
}

#[derive(sqlx::FromRow)]
struct SessionRow {
    id: Uuid,
    name: String,
    location: Option<String>,
    status: String,
    created_by: Uuid,
    created_at: chrono::DateTime<chrono::Utc>,
    session_date: chrono::NaiveDate,
    base_currency: String,
    minimize_debts: bool,
    timezone: String,
    archived_at: Option<chrono::DateTime<chrono::Utc>>,
}
