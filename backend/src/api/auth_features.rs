use axum::{extract::State, Json};

use crate::api::auth_dto::FeatureFlagPublic;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::cache::CachedFeatureFlag;
use crate::error::AppError;

pub async fn get_features(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<FeatureFlagPublic>>>, AppError> {
    tracing::info!("get_features handler called");

    #[allow(dead_code)]
    const CACHE_KEY: &str = "all_public_features";

    if let Some(cached) = state.cache.get_all_features().await {
        tracing::info!("Cache hit for features");
        let features: Vec<FeatureFlagPublic> = cached
            .iter()
            .map(|f| FeatureFlagPublic {
                key: f.key.clone(),
                enabled: f.enabled,
            })
            .collect();
        return Ok(ok(features));
    }

    tracing::info!("Cache miss, fetching from database");

    let features: Vec<FeatureFlagPublic> =
        sqlx::query_as(r#"SELECT key, enabled FROM feature_flags ORDER BY key ASC"#)
            .fetch_all(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Database error fetching features: {:?}", e);
                AppError::Database(e)
            })?;

    tracing::info!("Fetched {} features from database", features.len());

    let cached_features: Vec<CachedFeatureFlag> = features
        .iter()
        .map(|f| CachedFeatureFlag {
            id: uuid::Uuid::nil(),
            key: f.key.clone(),
            name: f.key.clone(),
            description: None,
            enabled: f.enabled,
            module: None,
        })
        .collect();

    state.cache.cache_all_features(cached_features).await;

    Ok(ok(features))
}
