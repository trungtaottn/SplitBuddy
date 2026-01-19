use axum::Router;
use sqlx::PgPool;
use std::time::Duration;

use crate::cache::HybridCache;
use crate::config::Config;

pub mod admin;
pub mod ai;
pub mod analytics;
pub mod auth;
pub mod bills;
pub mod categories;
pub mod debts;
pub mod feed;
pub mod fx;
pub mod games;
pub mod groups;
pub mod health;
pub mod notifications;
pub mod payments;
pub mod personas;
pub mod recurring_expenses;
pub mod response;
pub mod sessions;
pub mod templates;
pub mod uploads;
pub mod users;
pub mod wrapped;
pub mod ws;

pub use ws::WsManager;

use crate::services::push_service::PushService;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub cache: HybridCache,
    pub ws_manager: WsManager,
    pub http_client: reqwest::Client,
    pub push_service: std::sync::Arc<PushService>,
}

impl AppState {
    /// Create a new AppState with all dependencies initialized
    pub fn new(pool: PgPool, config: Config, cache: HybridCache, ws_manager: WsManager) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.http_timeout_seconds))
            .connect_timeout(Duration::from_secs(config.http_connect_timeout_seconds))
            .build()
            .expect("Failed to create HTTP client");

        let push_service = std::sync::Arc::new(PushService::new(pool.clone()));

        Self {
            pool,
            config,
            cache,
            ws_manager,
            http_client,
            push_service,
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
        .nest("/fx", fx::routes())
        .nest("/notifications", notifications::routes())
        .nest("/ai", ai::routes())
        .nest("/games", games::routes())
        .nest("/uploads", uploads::routes())
        .nest("/personas", personas::routes())
        .nest("/wrapped", wrapped::routes())
        .nest("/payments", payments::routes())
        .nest("/feed", feed::routes())
        .nest("/categories", categories::routes())
        .nest("/templates", templates::routes())
        .nest("/analytics", analytics::routes())
        .nest("/recurring-expenses", recurring_expenses::routes())
        .nest("/health", health::routes())
        .nest("/ws", ws::routes())
}
