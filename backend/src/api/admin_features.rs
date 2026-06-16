use axum::{
    extract::{Path, State},
    Json,
};

use crate::api::admin::require_admin;
use crate::api::admin_dto::{BulkToggleResponse, FeatureFlag, ToggleFeatureRequest};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn list_features(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<FeatureFlag>>>, AppError> {
    require_admin(&auth_user)?;

    let features: Vec<FeatureFlag> = sqlx::query_as(
        r#"
        SELECT id, key, name, description, enabled, module, created_at, updated_at
        FROM feature_flags
        ORDER BY module ASC, key ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(features))
}

pub async fn toggle_feature(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(key): Path<String>,
    Json(payload): Json<ToggleFeatureRequest>,
) -> Result<Json<ApiResponse<FeatureFlag>>, AppError> {
    require_admin(&auth_user)?;

    let feature: FeatureFlag = sqlx::query_as(
        r#"
        UPDATE feature_flags
        SET enabled = $1, updated_at = NOW()
        WHERE key = $2
        RETURNING id, key, name, description, enabled, module, created_at, updated_at
        "#,
    )
    .bind(payload.enabled)
    .bind(&key)
    .fetch_one(&state.pool)
    .await?;

    state.cache.invalidate_feature_flags().await;
    tracing::info!(
        "Feature flag '{}' updated to {}, cache invalidated",
        key,
        payload.enabled
    );

    Ok(ok(feature))
}

pub async fn toggle_all_features(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<ToggleFeatureRequest>,
) -> Result<Json<ApiResponse<BulkToggleResponse>>, AppError> {
    require_admin(&auth_user)?;

    let result = sqlx::query("UPDATE feature_flags SET enabled = $1, updated_at = NOW()")
        .bind(payload.enabled)
        .execute(&state.pool)
        .await?;

    state.cache.invalidate_feature_flags().await;
    tracing::info!(
        "All feature flags updated to {}, cache invalidated",
        payload.enabled
    );

    Ok(ok(BulkToggleResponse {
        updated_count: result.rows_affected() as i64,
        module: None,
    }))
}

pub async fn toggle_module_features(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(module): Path<String>,
    Json(payload): Json<ToggleFeatureRequest>,
) -> Result<Json<ApiResponse<BulkToggleResponse>>, AppError> {
    require_admin(&auth_user)?;

    let result =
        sqlx::query("UPDATE feature_flags SET enabled = $1, updated_at = NOW() WHERE module = $2")
            .bind(payload.enabled)
            .bind(&module)
            .execute(&state.pool)
            .await?;

    state.cache.invalidate_feature_flags().await;
    tracing::info!(
        "Module '{}' feature flags updated to {}, cache invalidated",
        module,
        payload.enabled
    );

    Ok(ok(BulkToggleResponse {
        updated_count: result.rows_affected() as i64,
        module: Some(module),
    }))
}
