//! Redis Cache Module
//!
//! Provides distributed caching using Redis for multi-instance deployments.
//! Falls back gracefully to in-memory cache when Redis is unavailable.
//!
//! ## Features
//! - Connection pooling with bb8
//! - Automatic serialization/deserialization with serde
//! - Graceful degradation on Redis failure
//! - Pattern-based cache invalidation
//!
//! ## Usage
//! ```rust,ignore
//! let redis_cache = RedisCache::new("redis://localhost:6379").await?;
//! redis_cache.set("key", &value, Duration::from_secs(300)).await?;
//! let value: Option<MyType> = redis_cache.get("key").await?;
//! ```

use bb8_redis::{bb8, RedisConnectionManager};
use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use tracing::{debug, error, warn};

/// Redis cache wrapper with connection pooling
#[derive(Clone)]
pub struct RedisCache {
    pool: bb8::Pool<RedisConnectionManager>,
    /// Key prefix for namespacing (e.g., "splitbuddy:prod:")
    prefix: String,
}

/// Result type for Redis operations
pub type RedisCacheResult<T> = Result<T, RedisCacheError>;

/// Errors that can occur during Redis cache operations
#[derive(Debug, thiserror::Error)]
pub enum RedisCacheError {
    #[error("Redis connection error: {0}")]
    Connection(String),
    #[error("Redis pool error: {0}")]
    Pool(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Deserialization error: {0}")]
    Deserialization(String),
    #[error("Redis command error: {0}")]
    Command(String),
}

impl From<redis::RedisError> for RedisCacheError {
    fn from(err: redis::RedisError) -> Self {
        RedisCacheError::Command(err.to_string())
    }
}

impl From<bb8::RunError<redis::RedisError>> for RedisCacheError {
    fn from(err: bb8::RunError<redis::RedisError>) -> Self {
        RedisCacheError::Pool(err.to_string())
    }
}

#[allow(dead_code)]
impl RedisCache {
    /// Create a new Redis cache connection
    ///
    /// # Arguments
    /// * `redis_url` - Redis connection URL (e.g., "redis://localhost:6379")
    /// * `prefix` - Key prefix for namespacing
    ///
    /// # Example
    /// ```rust,ignore
    /// let cache = RedisCache::new("redis://localhost:6379", "splitbuddy:").await?;
    /// ```
    pub async fn new(redis_url: &str, prefix: &str) -> RedisCacheResult<Self> {
        let manager = RedisConnectionManager::new(redis_url)
            .map_err(|e| RedisCacheError::Connection(e.to_string()))?;

        let pool = bb8::Pool::builder()
            .max_size(20)
            .min_idle(Some(2))
            .connection_timeout(Duration::from_secs(5))
            .idle_timeout(Some(Duration::from_secs(300)))
            .build(manager)
            .await
            .map_err(|e| RedisCacheError::Pool(e.to_string()))?;

        // Test connection
        {
            let mut conn = pool.get().await?;
            let _: String = redis::cmd("PING")
                .query_async(&mut *conn)
                .await
                .map_err(|e| RedisCacheError::Connection(format!("Redis ping failed: {}", e)))?;
        }

        debug!("Redis cache connected to {}", redis_url);

        Ok(Self {
            pool,
            prefix: prefix.to_string(),
        })
    }

    /// Get a value from cache
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> RedisCacheResult<Option<T>> {
        let full_key = format!("{}{}", self.prefix, key);

        let mut conn = self.pool.get().await?;
        let value: Option<String> = conn.get(&full_key).await?;

        match value {
            Some(json) => {
                let parsed: T = serde_json::from_str(&json)
                    .map_err(|e| RedisCacheError::Deserialization(e.to_string()))?;
                debug!("Cache HIT: {}", full_key);
                Ok(Some(parsed))
            }
            None => {
                debug!("Cache MISS: {}", full_key);
                Ok(None)
            }
        }
    }

    /// Set a value in cache with TTL
    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Duration,
    ) -> RedisCacheResult<()> {
        let full_key = format!("{}{}", self.prefix, key);
        let json = serde_json::to_string(value)
            .map_err(|e| RedisCacheError::Serialization(e.to_string()))?;

        let mut conn = self.pool.get().await?;
        conn.set_ex::<_, _, ()>(&full_key, json, ttl.as_secs())
            .await?;

        debug!("Cache SET: {} (TTL: {}s)", full_key, ttl.as_secs());
        Ok(())
    }

    /// Delete a specific key from cache
    pub async fn del(&self, key: &str) -> RedisCacheResult<()> {
        let full_key = format!("{}{}", self.prefix, key);

        let mut conn = self.pool.get().await?;
        conn.del::<_, ()>(&full_key).await?;

        debug!("Cache DEL: {}", full_key);
        Ok(())
    }

    /// Delete all keys matching a pattern
    ///
    /// # Warning
    /// This uses SCAN which is safe for production, but may be slow for large datasets.
    pub async fn invalidate_pattern(&self, pattern: &str) -> RedisCacheResult<u64> {
        let full_pattern = format!("{}{}", self.prefix, pattern);

        let mut conn = self.pool.get().await?;
        let mut deleted = 0u64;

        // Use SCAN for safe iteration in production
        let mut cursor = 0;
        loop {
            let (new_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(&full_pattern)
                .arg("COUNT")
                .arg(100)
                .query_async(&mut *conn)
                .await?;

            if !keys.is_empty() {
                let count: u64 = conn.del(&keys).await?;
                deleted += count;
            }

            cursor = new_cursor;
            if cursor == 0 {
                break;
            }
        }

        debug!(
            "Cache INVALIDATE pattern '{}': {} keys deleted",
            full_pattern, deleted
        );
        Ok(deleted)
    }

    /// Check if Redis is healthy
    pub async fn health_check(&self) -> bool {
        match self.pool.get().await {
            Ok(mut conn) => {
                let result: Result<String, _> = redis::cmd("PING").query_async(&mut *conn).await;
                result.is_ok()
            }
            Err(_) => false,
        }
    }

    /// Get pool statistics
    pub fn pool_stats(&self) -> PoolStats {
        let state = self.pool.state();
        PoolStats {
            connections: state.connections,
            idle_connections: state.idle_connections,
        }
    }
}

/// Pool statistics
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PoolStats {
    pub connections: u32,
    pub idle_connections: u32,
}

/// Optional Redis cache that gracefully degrades
///
/// Use this when Redis is optional and the app should work without it.
#[derive(Clone)]
pub struct OptionalRedisCache {
    inner: Option<RedisCache>,
}

#[allow(dead_code)]
impl OptionalRedisCache {
    /// Create with Redis connection (may fail silently)
    pub async fn new(redis_url: Option<&str>, prefix: &str) -> Self {
        let inner = match redis_url {
            Some(url) => match RedisCache::new(url, prefix).await {
                Ok(cache) => {
                    tracing::info!("Redis cache connected successfully");
                    Some(cache)
                }
                Err(e) => {
                    warn!(
                        "Redis cache unavailable, falling back to local cache: {}",
                        e
                    );
                    None
                }
            },
            None => {
                debug!("Redis URL not configured, using local cache only");
                None
            }
        };

        Self { inner }
    }

    /// Check if Redis is available
    pub fn is_available(&self) -> bool {
        self.inner.is_some()
    }

    /// Get value (returns None if Redis unavailable or key not found)
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        match &self.inner {
            Some(cache) => match cache.get(key).await {
                Ok(value) => value,
                Err(e) => {
                    error!("Redis GET error: {}", e);
                    None
                }
            },
            None => None,
        }
    }

    /// Set value (silently fails if Redis unavailable)
    pub async fn set<T: Serialize>(&self, key: &str, value: &T, ttl: Duration) {
        if let Some(cache) = &self.inner {
            if let Err(e) = cache.set(key, value, ttl).await {
                error!("Redis SET error: {}", e);
            }
        }
    }

    /// Delete value (silently fails if Redis unavailable)
    pub async fn del(&self, key: &str) {
        if let Some(cache) = &self.inner {
            if let Err(e) = cache.del(key).await {
                error!("Redis DEL error: {}", e);
            }
        }
    }

    /// Invalidate pattern (silently fails if Redis unavailable)
    pub async fn invalidate_pattern(&self, pattern: &str) {
        if let Some(cache) = &self.inner {
            if let Err(e) = cache.invalidate_pattern(pattern).await {
                error!("Redis INVALIDATE error: {}", e);
            }
        }
    }

    /// Health check
    pub async fn health_check(&self) -> bool {
        match &self.inner {
            Some(cache) => cache.health_check().await,
            None => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_optional_cache_without_redis() {
        let cache = OptionalRedisCache::new(None, "test:").await;
        assert!(!cache.is_available());

        // Should not panic
        let result: Option<String> = cache.get("foo").await;
        assert!(result.is_none());

        cache
            .set("foo", &"bar".to_string(), Duration::from_secs(60))
            .await;
        cache.del("foo").await;
    }
}
