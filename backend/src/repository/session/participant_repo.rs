//! Participant Repository
//!
//! Provides specialized operations for session participants.
//! Currently delegates to SessionRepository, will be migrated incrementally.

use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::sessions::{ParticipantBasicInfo, ParticipantResponse};
use crate::error::AppError;
use crate::repository::session_repo::SessionRepository;

/// Repository for participant-related operations within sessions
pub struct ParticipantRepository {
    pool: PgPool,
    // Keep reference to session repo for delegation during migration
    session_repo: SessionRepository,
}

impl ParticipantRepository {
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
    // These will be migrated to direct implementation in Phase 2
    // ========================================

    /// Get basic participant info for session cards (max 5)
    pub async fn get_session_participants_basic(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<ParticipantBasicInfo>, AppError> {
        // Delegate to session_repo for now
        self.session_repo
            .get_session_participants_basic(session_id)
            .await
    }

    /// Batch get participants for multiple sessions (max 5 per session)
    pub async fn batch_get_participants(
        &self,
        session_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<ParticipantBasicInfo>>, AppError> {
        self.session_repo.batch_get_participants(session_ids).await
    }

    /// Add a new participant to a session
    pub async fn add_participant(
        &self,
        session_id: Uuid,
        user_id: Option<Uuid>,
        guest_name: Option<String>,
    ) -> Result<ParticipantResponse, AppError> {
        self.session_repo
            .add_participant(session_id, user_id, guest_name)
            .await
    }

    /// Update a participant's details
    pub async fn update_participant(
        &self,
        participant_id: Uuid,
        guest_name: Option<String>,
        default_weight: Option<i32>,
        is_active: Option<bool>,
    ) -> Result<ParticipantResponse, AppError> {
        self.session_repo
            .update_participant(participant_id, guest_name, default_weight, is_active)
            .await
    }

    /// Delete a participant from a session
    pub async fn delete_participant(&self, participant_id: Uuid) -> Result<(), AppError> {
        self.session_repo.delete_participant(participant_id).await
    }

    // ========================================
    // New methods (Phase 2+)
    // Add new functionality here that doesn't exist in SessionRepository
    // ========================================

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

#[cfg(test)]
mod tests {
    // Tests will be added during Phase 2 migration
}
