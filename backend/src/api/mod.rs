use axum::Router;
use sqlx::PgPool;

use crate::config::Config;

pub mod admin;
pub mod ai;
pub mod auth;
pub mod bills;
pub mod debts;
pub mod games;
pub mod groups;
pub mod response;
pub mod sessions;
pub mod uploads;
pub mod users;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
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
}
