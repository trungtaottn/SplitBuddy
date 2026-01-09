use moka::future::Cache;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;

use crate::api::sessions::ParticipantResponse;
use crate::domain::session::SessionStatus;

/// Cached feature flag data
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CachedFeatureFlag {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub module: Option<String>,
}

/// Cached session detail data
#[derive(Clone, Debug)]
pub struct CachedSession {
    pub id: Uuid,
    pub name: String,
    pub location: Option<String>,
    pub status: SessionStatus,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub session_date: chrono::NaiveDate,
    pub total_amount: Decimal,
    pub group_id: Option<Uuid>,
    pub participants: Vec<ParticipantResponse>,
}

/// WebSocket ticket data
#[derive(Clone, Debug)]
pub struct WsTicket {
    pub user_id: Uuid,
    #[allow(dead_code)]
    pub role: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

/// Application cache manager using moka
#[derive(Clone)]
pub struct AppCache {
    /// Cache for feature flags - key is the feature key string
    pub feature_flags: Cache<String, CachedFeatureFlag>,
    /// Cache for all feature flags list
    pub all_features: Cache<String, Vec<CachedFeatureFlag>>,
    /// Cache for session details - key is session UUID
    pub sessions: Cache<Uuid, CachedSession>,
    /// Cache for WebSocket tickets - key is ticket UUID (short-lived, single-use)
    pub ws_tickets: Cache<Uuid, WsTicket>,
}

impl AppCache {
    pub fn new() -> Self {
        Self {
            // Individual feature flag cache - 5 minute TTL, max 100 entries
            feature_flags: Cache::builder()
                .time_to_live(Duration::from_secs(300))
                .max_capacity(100)
                .build(),
            // All features list cache - 1 minute TTL (changes less frequently checked)
            all_features: Cache::builder()
                .time_to_live(Duration::from_secs(60))
                .max_capacity(1)
                .build(),
            // Session details cache - 5 minute TTL, max 500 entries
            sessions: Cache::builder()
                .time_to_live(Duration::from_secs(300))
                .max_capacity(500)
                .build(),
            // WebSocket tickets - 30 second TTL, max 1000 entries (single-use, auto-deleted after use)
            ws_tickets: Cache::builder()
                .time_to_live(Duration::from_secs(30))
                .max_capacity(1000)
                .build(),
        }
    }

    /// Invalidate all feature flag caches (call when admin updates a flag)
    pub async fn invalidate_feature_flags(&self) {
        self.feature_flags.invalidate_all();
        self.all_features.invalidate_all();
    }

    /// Invalidate a specific feature flag
    pub async fn invalidate_feature_flag(&self, key: &str) {
        self.feature_flags.invalidate(key).await;
        self.all_features.invalidate_all();
    }

    /// Get cached session
    pub async fn get_session(&self, session_id: Uuid) -> Option<CachedSession> {
        self.sessions.get(&session_id).await
    }

    /// Cache a session
    pub async fn cache_session(&self, session: CachedSession) {
        self.sessions.insert(session.id, session).await;
    }

    /// Invalidate a specific session cache
    pub async fn invalidate_session(&self, session_id: Uuid) {
        self.sessions.invalidate(&session_id).await;
    }

    /// Store a WebSocket ticket (single-use, short-lived)
    pub async fn store_ws_ticket(&self, ticket_id: Uuid, ticket: WsTicket) {
        self.ws_tickets.insert(ticket_id, ticket).await;
    }

    /// Get and consume a WebSocket ticket (removes it after use)
    pub async fn consume_ws_ticket(&self, ticket_id: Uuid) -> Option<WsTicket> {
        self.ws_tickets.remove(&ticket_id).await
    }
}

impl Default for AppCache {
    fn default() -> Self {
        Self::new()
    }
}
