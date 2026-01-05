//! Audit logging service for tracking important user actions
//!
//! This module provides functionality to log security-sensitive and
//! business-critical actions for compliance and debugging purposes.

use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Extract client IP and User-Agent from request headers
pub fn extract_client_info(headers: &HeaderMap) -> (Option<String>, Option<String>) {
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        });

    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    (ip, user_agent)
}

/// Audit log action types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    // Authentication
    Login,
    Logout,
    Register,
    PasswordChange,
    PasswordReset,
    
    // Sessions
    SessionCreate,
    SessionClose,
    SessionReopen,
    SessionDelete,
    
    // Bills
    BillCreate,
    BillUpdate,
    BillDelete,
    
    // Debts
    SettlementRequest,
    SettlementConfirm,
    SettlementReject,
    GuestSettlement,
    
    // Admin actions
    AdminUserCreate,
    AdminUserUpdate,
    FeatureToggle,
    MusicUpload,
    MusicDelete,
    
    // Other
    Custom(String),
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditAction::Login => write!(f, "login"),
            AuditAction::Logout => write!(f, "logout"),
            AuditAction::Register => write!(f, "register"),
            AuditAction::PasswordChange => write!(f, "password_change"),
            AuditAction::PasswordReset => write!(f, "password_reset"),
            AuditAction::SessionCreate => write!(f, "session_create"),
            AuditAction::SessionClose => write!(f, "session_close"),
            AuditAction::SessionReopen => write!(f, "session_reopen"),
            AuditAction::SessionDelete => write!(f, "session_delete"),
            AuditAction::BillCreate => write!(f, "bill_create"),
            AuditAction::BillUpdate => write!(f, "bill_update"),
            AuditAction::BillDelete => write!(f, "bill_delete"),
            AuditAction::SettlementRequest => write!(f, "settlement_request"),
            AuditAction::SettlementConfirm => write!(f, "settlement_confirm"),
            AuditAction::SettlementReject => write!(f, "settlement_reject"),
            AuditAction::GuestSettlement => write!(f, "guest_settlement"),
            AuditAction::AdminUserCreate => write!(f, "admin_user_create"),
            AuditAction::AdminUserUpdate => write!(f, "admin_user_update"),
            AuditAction::FeatureToggle => write!(f, "feature_toggle"),
            AuditAction::MusicUpload => write!(f, "music_upload"),
            AuditAction::MusicDelete => write!(f, "music_delete"),
            AuditAction::Custom(s) => write!(f, "{}", s),
        }
    }
}

/// Entity types that can be audited
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEntityType {
    User,
    Session,
    Bill,
    Debt,
    Group,
    FeatureFlag,
    Music,
    Other(String),
}

impl std::fmt::Display for AuditEntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuditEntityType::User => write!(f, "user"),
            AuditEntityType::Session => write!(f, "session"),
            AuditEntityType::Bill => write!(f, "bill"),
            AuditEntityType::Debt => write!(f, "debt"),
            AuditEntityType::Group => write!(f, "group"),
            AuditEntityType::FeatureFlag => write!(f, "feature_flag"),
            AuditEntityType::Music => write!(f, "music"),
            AuditEntityType::Other(s) => write!(f, "{}", s),
        }
    }
}

/// Builder for creating audit log entries
pub struct AuditLogBuilder {
    user_id: Option<Uuid>,
    user_email: Option<String>,
    action: AuditAction,
    entity_type: AuditEntityType,
    entity_id: Option<Uuid>,
    description: Option<String>,
    metadata: serde_json::Value,
    ip_address: Option<String>,
    user_agent: Option<String>,
}

impl AuditLogBuilder {
    pub fn new(action: AuditAction, entity_type: AuditEntityType) -> Self {
        Self {
            user_id: None,
            user_email: None,
            action,
            entity_type,
            entity_id: None,
            description: None,
            metadata: serde_json::json!({}),
            ip_address: None,
            user_agent: None,
        }
    }

    pub fn user(mut self, user_id: Uuid, email: Option<String>) -> Self {
        self.user_id = Some(user_id);
        self.user_email = email;
        self
    }

    pub fn entity_id(mut self, id: Uuid) -> Self {
        self.entity_id = Some(id);
        self
    }

    pub fn description(mut self, desc: impl Into<String>) -> Self {
        self.description = Some(desc.into());
        self
    }

    pub fn metadata(mut self, data: serde_json::Value) -> Self {
        self.metadata = data;
        self
    }

    pub fn client_info(mut self, ip: Option<String>, user_agent: Option<String>) -> Self {
        self.ip_address = ip;
        self.user_agent = user_agent;
        self
    }

    /// Save the audit log entry to the database
    pub async fn save(self, pool: &PgPool) -> Result<Uuid, sqlx::Error> {
        let id = Uuid::new_v4();
        
        sqlx::query(
            r#"
            INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, 
                                   description, metadata, ip_address, user_agent, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            "#
        )
        .bind(id)
        .bind(self.user_id)
        .bind(&self.user_email)
        .bind(self.action.to_string())
        .bind(self.entity_type.to_string())
        .bind(self.entity_id)
        .bind(&self.description)
        .bind(&self.metadata)
        .bind(&self.ip_address)
        .bind(&self.user_agent)
        .execute(pool)
        .await?;

        tracing::debug!(
            "Audit log created: {} on {} by {:?}",
            self.action,
            self.entity_type,
            self.user_id
        );

        Ok(id)
    }
}

/// Query audit logs with filtering
#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub user_id: Option<Uuid>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub from_date: Option<chrono::DateTime<chrono::Utc>>,
    pub to_date: Option<chrono::DateTime<chrono::Utc>>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_email: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub description: Option<String>,
    pub metadata: serde_json::Value,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Fetch audit logs with optional filtering
pub async fn fetch_audit_logs(
    pool: &PgPool,
    query: AuditLogQuery,
) -> Result<(Vec<AuditLogEntry>, i64), sqlx::Error> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = (page - 1) * limit;

    let logs: Vec<AuditLogEntry> = sqlx::query_as(
        r#"
        SELECT id, user_id, user_email, action, entity_type, entity_id, 
               description, metadata, ip_address, user_agent, created_at
        FROM audit_logs
        WHERE ($1::uuid IS NULL OR user_id = $1)
          AND ($2::text IS NULL OR action = $2)
          AND ($3::text IS NULL OR entity_type = $3)
          AND ($4::uuid IS NULL OR entity_id = $4)
          AND ($5::timestamptz IS NULL OR created_at >= $5)
          AND ($6::timestamptz IS NULL OR created_at <= $6)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#
    )
    .bind(query.user_id)
    .bind(&query.action)
    .bind(&query.entity_type)
    .bind(query.entity_id)
    .bind(query.from_date)
    .bind(query.to_date)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)::bigint
        FROM audit_logs
        WHERE ($1::uuid IS NULL OR user_id = $1)
          AND ($2::text IS NULL OR action = $2)
          AND ($3::text IS NULL OR entity_type = $3)
          AND ($4::uuid IS NULL OR entity_id = $4)
          AND ($5::timestamptz IS NULL OR created_at >= $5)
          AND ($6::timestamptz IS NULL OR created_at <= $6)
        "#
    )
    .bind(query.user_id)
    .bind(&query.action)
    .bind(&query.entity_type)
    .bind(query.entity_id)
    .bind(query.from_date)
    .bind(query.to_date)
    .fetch_one(pool)
    .await?;

    Ok((logs, total))
}
