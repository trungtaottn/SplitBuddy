//! Cache Module
//!
//! Provides both local (in-memory) and distributed (Redis) caching capabilities.
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                      HybridCache                            │
//! │  ┌─────────────────┐          ┌─────────────────────────┐   │
//! │  │  Local Cache    │  ◄────►  │  Redis Cache (Optional) │   │
//! │  │  (moka, fast)   │          │  (distributed, shared)  │   │
//! │  └─────────────────┘          └─────────────────────────┘   │
//! └─────────────────────────────────────────────────────────────┘
//! ```
//!
//! ## Usage
//!
//! For backward compatibility, `AppCache` from `local` module is still available.
//! For new code, consider using `HybridCache` which combines both local and Redis.

pub mod local;
pub mod redis;

// Re-export commonly used types for backward compatibility
pub use local::{AppCache, CachedFeatureFlag, CachedSession, CachedUser, WsTicket};
pub use redis::OptionalRedisCache;

#[allow(dead_code)]
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use tracing::debug;

/// Hybrid cache that uses both local and Redis caching
///
/// Strategy:
/// - Read: Check local first, then Redis, update local on Redis hit
/// - Write: Write to both local and Redis
/// - Invalidate: Invalidate both
#[derive(Clone)]
pub struct HybridCache {
    local: AppCache,
    redis: OptionalRedisCache,
}

#[allow(dead_code)]
impl HybridCache {
    /// Create a new hybrid cache
    pub async fn new(redis_url: Option<&str>) -> Self {
        let local = AppCache::new();
        let redis = OptionalRedisCache::new(redis_url, "splitbuddy:").await;

        Self { local, redis }
    }

    /// Get local cache reference (for backward compatibility)
    pub fn local(&self) -> &AppCache {
        &self.local
    }

    /// Check if Redis is available
    pub fn redis_available(&self) -> bool {
        self.redis.is_available()
    }

    // ========================================
    // Session caching with hybrid strategy
    // ========================================

    /// Get cached session (hybrid: local first, then Redis)
    pub async fn get_session(&self, session_id: uuid::Uuid) -> Option<CachedSession> {
        // Try local first
        if let Some(session) = self.local.get_session(session_id).await {
            debug!("Session {} found in local cache", session_id);
            return Some(session);
        }

        // Try Redis (if available)
        // Key format: session:{id}
        let key = format!("session:{}", session_id);
        if let Some(session) = self.redis.get::<CachedSession>(&key).await {
            debug!("Session {} found in Redis cache", session_id);
            // Populate local cache
            self.local.cache_session(session.clone()).await;
            return Some(session);
        }

        None
    }

    /// Cache a session (hybrid: write to both)
    pub async fn cache_session(&self, session: CachedSession) {
        let session_id = session.id;
        self.local.cache_session(session.clone()).await;

        let key = format!("session:{}", session_id);
        // Cache in Redis for 1 hour (3600 seconds)
        // Sessions are relatively static but important to keep fresh
        self.redis
            .set(&key, &session, Duration::from_secs(3600))
            .await;
        debug!("Session {} cached in local and Redis", session_id);
    }

    /// Invalidate session cache
    pub async fn invalidate_session(&self, session_id: uuid::Uuid) {
        self.local.invalidate_session(session_id).await;
        // Also invalidate any related Redis keys
        self.redis.del(&format!("session:{}", session_id)).await;
        debug!("Session {} invalidated from all caches", session_id);
    }

    // ========================================
    // User caching with hybrid strategy
    // ========================================

    /// Get cached user (hybrid: local first, then Redis)
    pub async fn get_user(&self, user_id: uuid::Uuid) -> Option<CachedUser> {
        // Try local first
        if let Some(user) = self.local.get_user(user_id).await {
            debug!("User {} found in local cache", user_id);
            return Some(user);
        }

        // Try Redis
        let key = format!("user:{}", user_id);
        if let Some(user) = self.redis.get::<CachedUser>(&key).await {
            debug!("User {} found in Redis cache", user_id);
            // Populate local cache
            self.local.cache_user(user.clone()).await;
            return Some(user);
        }

        None
    }

    /// Cache a user (hybrid: write to both)
    pub async fn cache_user(&self, user: CachedUser) {
        let user_id = user.id;
        self.local.cache_user(user.clone()).await;

        let key = format!("user:{}", user_id);
        // Cache in Redis for 1 hour
        self.redis.set(&key, &user, Duration::from_secs(3600)).await;
        debug!("User {} cached in local and Redis", user_id);
    }

    /// Invalidate user cache
    pub async fn invalidate_user(&self, user_id: uuid::Uuid) {
        self.local.invalidate_user(user_id).await;
        self.redis.del(&format!("user:{}", user_id)).await;
        debug!("User {} invalidated from all caches", user_id);
    }

    // ========================================
    // Feature flags caching
    // ========================================

    /// Get all feature flags (hybrid)
    pub async fn get_all_features(&self) -> Option<Vec<CachedFeatureFlag>> {
        // Try local first
        if let Some(flags) = self.local.all_features.get(&"all".to_string()).await {
            return Some(flags);
        }

        // Try Redis
        if let Some(flags) = self
            .redis
            .get::<Vec<CachedFeatureFlag>>("features:all")
            .await
        {
            // Populate local cache
            self.local
                .all_features
                .insert("all".to_string(), flags.clone())
                .await;
            return Some(flags);
        }

        None
    }

    /// Cache all feature flags
    pub async fn cache_all_features(&self, flags: Vec<CachedFeatureFlag>) {
        self.local
            .all_features
            .insert("all".to_string(), flags.clone())
            .await;
        self.redis
            .set("features:all", &flags, Duration::from_secs(300))
            .await;
    }

    /// Invalidate feature flags cache
    pub async fn invalidate_feature_flags(&self) {
        self.local.invalidate_feature_flags().await;
        self.redis.del("features:all").await;
    }

    // ========================================
    // Generic key-value caching (Redis only for distributed)
    // ========================================

    /// Get a value from Redis cache
    pub async fn redis_get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.redis.get(key).await
    }

    /// Set a value in Redis cache
    pub async fn redis_set<T: Serialize>(&self, key: &str, value: &T, ttl: Duration) {
        self.redis.set(key, value, ttl).await
    }

    /// Delete from Redis cache
    pub async fn redis_del(&self, key: &str) {
        self.redis.del(key).await
    }

    /// Invalidate Redis keys by pattern
    pub async fn redis_invalidate_pattern(&self, pattern: &str) {
        self.redis.invalidate_pattern(pattern).await
    }

    // ========================================
    // WebSocket tickets (local only - short-lived)
    // ========================================

    /// Store WebSocket ticket
    pub async fn store_ws_ticket(&self, ticket_id: uuid::Uuid, ticket: WsTicket) {
        self.local.store_ws_ticket(ticket_id, ticket).await;
    }

    /// Consume WebSocket ticket
    pub async fn consume_ws_ticket(&self, ticket_id: uuid::Uuid) -> Option<WsTicket> {
        self.local.consume_ws_ticket(ticket_id).await
    }

    // ========================================
    // Health checks
    // ========================================

    /// Check Redis health
    pub async fn redis_health(&self) -> bool {
        self.redis.health_check().await
    }
}
