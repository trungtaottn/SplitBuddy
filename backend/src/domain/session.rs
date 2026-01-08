#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "session_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Active,
    Closed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "participant_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ParticipantRole {
    Owner,
    Member,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Session {
    pub id: Uuid,
    pub name: String,
    pub location: Option<String>,
    pub status: SessionStatus,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct SessionParticipant {
    pub id: Uuid,
    pub session_id: Uuid,
    pub user_id: Option<Uuid>,
    pub guest_name: Option<String>,
    pub role: ParticipantRole,
    pub joined_at: DateTime<Utc>,
}

impl SessionParticipant {
    pub fn display_name(&self) -> String {
        self.guest_name
            .clone()
            .unwrap_or_else(|| "Unknown User".to_string())
    }

    pub fn is_guest(&self) -> bool {
        self.user_id.is_none()
    }
}
