use axum::Router;
use sqlx::PgPool;

use crate::cache::AppCache;
use crate::config::Config;

pub mod admin;
pub mod ai;
pub mod auth;
pub mod bills;
pub mod debts;
pub mod games;
pub mod groups;
pub mod health;
pub mod personas;
pub mod response;
pub mod sessions;
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
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/admin", admin::routes())
        .nest("/users", users::routes())
        .nest("/groups", groups::routes())
        .nest("/sessions", sessions::routes())
        .nest("/debts", debts::routes())
        .nest("/ai", ai::routes())
        .nest("/games", games::routes())
        .nest("/uploads", uploads::routes())
        .nest("/personas", personas::routes())
        .nest("/wrapped", wrapped::routes())
        .nest("/health", health::routes())
        .nest("/ws", ws::routes())
}
