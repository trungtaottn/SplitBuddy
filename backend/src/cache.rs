use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;

/// Cached feature flag data
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CachedFeatureFlag {
    pub id: Uuid,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
}

/// Application cache manager using moka
#[derive(Clone)]
pub struct AppCache {
    /// Cache for feature flags - key is the feature key string
    pub feature_flags: Cache<String, CachedFeatureFlag>,
    /// Cache for all feature flags list
    pub all_features: Cache<String, Vec<CachedFeatureFlag>>,
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
}

impl Default for AppCache {
    fn default() -> Self {
        Self::new()
    }
}
