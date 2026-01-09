use axum::Router;
use sqlx::PgPool;
use std::time::Duration;

use crate::cache::AppCache;
use crate::config::Config;

pub mod admin;
pub mod ai;
pub mod analytics;
pub mod auth;
pub mod bills;
pub mod categories;
pub mod debts;
pub mod games;
pub mod groups;
pub mod health;
pub mod notifications;
pub mod payments;
pub mod personas;
pub mod response;
pub mod sessions;
pub mod templates;
pub mod uploads;
pub mod users;
pub mod wrapped;
pub mod ws;

pub use ws::WsManager;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub cache: AppCache,
    pub ws_manager: WsManager,
    pub http_client: reqwest::Client,
}

impl AppState {
    /// Create a new AppState with all dependencies initialized
    pub fn new(pool: PgPool, config: Config, cache: AppCache, ws_manager: WsManager) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.http_timeout_seconds))
            .connect_timeout(Duration::from_secs(config.http_connect_timeout_seconds))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            pool,
            config,
            cache,
            ws_manager,
            http_client,
        }
    }
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/admin", admin::routes())
        .nest("/users", users::routes())
        .nest("/groups", groups::routes())
        .nest("/sessions", sessions::routes())
        .nest("/debts", debts::routes())
        .nest("/notifications", notifications::routes())
        .nest("/ai", ai::routes())
        .nest("/games", games::routes())
        .nest("/uploads", uploads::routes())
        .nest("/personas", personas::routes())
        .nest("/wrapped", wrapped::routes())
        .nest("/payments", payments::routes())
        .nest("/categories", categories::routes())
        .nest("/templates", templates::routes())
        .nest("/analytics", analytics::routes())
        .nest("/health", health::routes())
        .nest("/ws", ws::routes())
}
