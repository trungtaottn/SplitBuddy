use crate::api::AppState;
use crate::cache::CachedFeatureFlag;
use crate::error::AppError;

pub async fn require_feature_enabled(state: &AppState, key: &str) -> Result<(), AppError> {
    let features = match state.cache.get_all_features().await {
        Some(features) => features,
        None => {
            let features: Vec<CachedFeatureFlag> = sqlx::query_as(
                r#"
                SELECT id, key, name, description, enabled, module
                FROM feature_flags
                ORDER BY key ASC
                "#,
            )
            .fetch_all(&state.pool)
            .await?;

            state.cache.cache_all_features(features.clone()).await;
            features
        }
    };

    let enabled = features
        .iter()
        .find(|feature| feature.key == key)
        .map(|feature| feature.enabled)
        .unwrap_or(true);

    if enabled {
        Ok(())
    } else {
        Err(AppError::FeatureDisabled {
            feature: key.to_string(),
        })
    }
}
