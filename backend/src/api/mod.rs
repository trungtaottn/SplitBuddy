use anyhow::{Context, Result};
use axum::Router;
use sqlx::PgPool;
use std::time::Duration;

use crate::cache::HybridCache;
use crate::config::Config;

pub mod admin;
pub mod admin_dto;
pub mod admin_features;
pub mod admin_music;
pub mod admin_music_upload;
pub mod admin_users;
pub mod ai;
pub mod ai_dto;
pub mod ai_generation;
pub mod ai_generation_fallbacks;
pub mod ai_generation_openai;
pub mod ai_generation_slogans;
pub mod analytics;
pub mod analytics_categories;
pub mod analytics_dto;
pub mod analytics_spending;
pub mod analytics_spending_amounts;
pub mod analytics_spending_sessions;
pub mod analytics_trends;
pub mod auth;
pub mod auth_dto;
pub mod auth_features;
pub mod auth_password_reset;
pub mod auth_tokens;
pub mod auth_ws_ticket;
pub mod bills;
pub mod categories;
pub mod debts;
pub mod debts_dto;
pub mod debts_settlement;
mod feature_flags;
pub mod feed;
pub mod fx;
pub mod games;
pub mod games_content;
pub mod games_dice;
pub mod games_dto;
pub mod games_repository_handlers;
pub mod groups;
pub mod groups_debts;
pub mod groups_dto;
pub mod groups_members;
pub mod health;
pub mod notifications;
pub mod notifications_dto;
pub mod notifications_push;
pub mod payments;
pub mod payments_dto;
pub mod payments_qr;
pub mod personas;
pub mod personas_achievements;
pub mod personas_dto;
pub mod recurring_expense_controls;
pub mod recurring_expense_create;
pub mod recurring_expense_crud;
pub mod recurring_expense_dto;
pub mod recurring_expense_exceptions;
pub mod recurring_expense_guards;
pub mod recurring_expenses;
pub mod response;
pub mod sessions;
pub mod templates;
mod upload_storage;
pub mod uploads;
pub mod users;
pub mod users_bank_accounts;
pub mod users_dto;
pub mod wrapped;
pub mod wrapped_dto;
pub mod wrapped_stats;
pub mod ws;
pub mod ws_redis;
pub mod ws_socket;
pub mod ws_types;

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
    pub fn new(
        pool: PgPool,
        config: Config,
        cache: HybridCache,
        ws_manager: WsManager,
    ) -> Result<Self> {
        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.http_timeout_seconds))
            .connect_timeout(Duration::from_secs(config.http_connect_timeout_seconds))
            .build()
            .context("failed to create HTTP client")?;

        let push_service = std::sync::Arc::new(PushService::new(
            pool.clone(),
            config.vapid.private_key.clone(),
            config.vapid.subject.clone(),
        ));

        Ok(Self {
            pool,
            config,
            cache,
            ws_manager,
            http_client,
            push_service,
        })
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
