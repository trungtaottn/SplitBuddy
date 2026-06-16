//! Participant Repository
//!
//! Provides specialized operations for session participants.

use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::sessions::{ParticipantBasicInfo, ParticipantResponse};
use crate::domain::session::ParticipantRole;
use crate::error::AppError;

/// Repository for participant-related operations within sessions
pub struct ParticipantRepository {
    pool: PgPool,
}

impl ParticipantRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get pool reference for direct queries
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Get basic participant info for session cards (max 5)
    pub async fn get_session_participants_basic(
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

    /// Batch get participants for multiple sessions (max 5 per session)
    pub async fn batch_get_participants(
        &self,
        session_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<ParticipantBasicInfo>>, AppError> {
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

        for sid in session_ids {
            result.entry(*sid).or_default();
        }

        Ok(result)
    }

    /// Add a new participant to a session
    pub async fn add_participant(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        guest_name: Option<String>,
    ) -> Result<ParticipantResponse, AppError> {
        let participant_id = Uuid::new_v4();
        let display_name = if let Some(uid) = user_id {
            sqlx::query_scalar!(r#"SELECT full_name FROM users WHERE id = $1"#, uid)
                .fetch_optional(&self.pool)
                .await?
                .ok_or(AppError::UserNotFound { user_id: uid })?
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
            default_weight: 1,
            is_active: true,
        })
    }

    /// Update a participant's details
    pub async fn update_participant(
        &self,
        participant_id: Uuid,
        guest_name: Option<String>,
        default_weight: Option<i32>,
        is_active: Option<bool>,
    ) -> Result<ParticipantResponse, AppError> {
        if let Some(weight) = default_weight {
            if weight <= 0 {
                return Err(AppError::Validation {
                    field: "default_weight".to_string(),
                    message: "Weight must be greater than 0".to_string(),
                });
            }
        }

        #[derive(sqlx::FromRow)]
        struct UpdatedParticipant {
            id: Uuid,
            user_id: Option<Uuid>,
            guest_name: Option<String>,
            role: String,
            joined_at: chrono::DateTime<chrono::Utc>,
            default_weight: i32,
            is_active: bool,
        }

        let participant: UpdatedParticipant = sqlx::query_as(
            r#"
            UPDATE session_participants
            SET guest_name = COALESCE($1, guest_name),
                default_weight = COALESCE($2, default_weight),
                is_active = COALESCE($3, is_active)
            WHERE id = $4
            RETURNING id, user_id, guest_name, role::text, joined_at, default_weight, is_active
            "#,
        )
        .bind(guest_name)
        .bind(default_weight)
        .bind(is_active)
        .bind(participant_id)
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
            default_weight: participant.default_weight,
            is_active: participant.is_active,
        })
    }

    /// Delete a participant from a session
    pub async fn delete_participant(&self, participant_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            "DELETE FROM session_participants WHERE id = $1",
            participant_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get participant by ID with full details
    pub async fn get_participant_by_id(
        &self,
        participant_id: Uuid,
    ) -> Result<Option<ParticipantResponse>, AppError> {
        #[derive(sqlx::FromRow)]
        struct ParticipantRow {
            id: Uuid,
            #[allow(dead_code)]
            session_id: Uuid,
            user_id: Option<Uuid>,
            guest_name: Option<String>,
            display_name: String,
            role: String,
            joined_at: chrono::DateTime<chrono::Utc>,
            default_weight: i32,
            is_active: bool,
        }

        let row: Option<ParticipantRow> = sqlx::query_as(
            r#"
            SELECT 
                sp.id,
                sp.session_id,
                sp.user_id,
                sp.guest_name,
                COALESCE(u.full_name, sp.guest_name, 'Guest') as display_name,
                sp.role::text as role,
                sp.joined_at,
                sp.default_weight,
                sp.is_active
            FROM session_participants sp
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.id = $1
            "#,
        )
        .bind(participant_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| ParticipantResponse {
            id: r.id,
            user_id: r.user_id,
            guest_name: r.guest_name,
            display_name: r.display_name,
            role: match r.role.as_str() {
                "owner" => crate::domain::session::ParticipantRole::Owner,
                _ => crate::domain::session::ParticipantRole::Member,
            },
            joined_at: r.joined_at,
            default_weight: r.default_weight,
            is_active: r.is_active,
        }))
    }

    /// Count participants in a session
    pub async fn count_participants(&self, session_id: Uuid) -> Result<i64, AppError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::bigint FROM session_participants WHERE session_id = $1",
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count)
    }

    /// Get all active participants in a session
    pub async fn get_active_participants(
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
            WHERE sp.session_id = $1 AND sp.is_active = true
            ORDER BY sp.joined_at
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
}
