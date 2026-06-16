use axum::{
    extract::{DefaultBodyLimit, State},
    routing::{delete, get, post, put},
    Json, Router,
};

use crate::api::admin_dto::AuditLogsResponse;
use crate::api::admin_features::{
    list_features, toggle_all_features, toggle_feature, toggle_module_features,
};
use crate::api::admin_music::{add_music_url, delete_music, list_music};
use crate::api::admin_music_upload::upload_music;
use crate::api::admin_users::{create_user, list_users, reset_password};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::audit::{fetch_audit_logs, AuditLogQuery};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id/password", put(reset_password))
        .route("/features", get(list_features))
        .route("/features/toggle-all", put(toggle_all_features))
        .route("/features/module/:module", put(toggle_module_features))
        .route("/features/:key", put(toggle_feature))
        .route("/music/url", post(add_music_url)) // Must be before /music/:id
        .route("/music/:id", delete(delete_music))
        .route(
            "/music",
            get(list_music)
                .post(upload_music)
                .layer(DefaultBodyLimit::max(50 * 1024 * 1024)),
        ) // 50MB limit
        .route("/audit-logs", get(get_audit_logs))
}

pub(crate) fn require_admin(auth_user: &AuthUser) -> Result<(), AppError> {
    if auth_user.role != "admin" {
        return Err(AppError::Forbidden {
            message: "Admin access required".to_string(),
        });
    }
    Ok(())
}

async fn get_audit_logs(
    State(state): State<AppState>,
    auth_user: AuthUser,
    axum::extract::Query(query): axum::extract::Query<AuditLogQuery>,
) -> Result<Json<ApiResponse<AuditLogsResponse>>, AppError> {
    require_admin(&auth_user)?;

    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);

    let (logs, total) = fetch_audit_logs(&state.pool, query)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to fetch audit logs: {}", e)))?;

    Ok(ok(AuditLogsResponse {
        logs,
        total,
        page,
        limit,
    }))
}
