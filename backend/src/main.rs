use std::net::SocketAddr;

use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_http::services::{ServeDir, ServeFile};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

mod api;
mod config;
mod domain;
mod error;
mod middleware;
mod openapi;
mod repository;

use config::Config;
use openapi::ApiDoc;
use sqlx::PgPool;

async fn init_admin_user(pool: &PgPool) -> anyhow::Result<()> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };
    use uuid::Uuid;

    // Check if admin exists
    let exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM users WHERE email = 'admin@splitbuddy.com'"
    )
    .fetch_optional(pool)
    .await?;

    if exists.is_some() {
        tracing::info!("Admin user already exists");
        return Ok(());
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(b"Admin123", &salt)
        .map_err(|e| anyhow::anyhow!("Failed to hash password: {}", e))?
        .to_string();

    // Create admin user
    let admin_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
        VALUES ($1, 'admin@splitbuddy.com', $2, 'System Admin', 'admin', NOW(), NOW())
        "#
    )
    .bind(admin_id)
    .bind(&password_hash)
    .execute(pool)
    .await?;

    tracing::info!("✅ Created admin user: admin@splitbuddy.com / Admin123");
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "splitbuddy=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;

    tracing::info!("Connecting to database...");
    
    // Heroku Postgres requires SSL - append sslmode if not present
    let database_url = if config.database_url.contains("sslmode") {
        config.database_url.clone()
    } else if config.database_url.contains('?') {
        format!("{}&sslmode=require", config.database_url)
    } else {
        format!("{}?sslmode=require", config.database_url)
    };
    
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Initialize admin user if not exists
    init_admin_user(&pool).await?;

    let app_state = api::AppState {
        pool,
        config: config.clone(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Serve static files (frontend) - fallback to index.html for SPA routing
    let static_service = ServeDir::new("static")
        .not_found_service(ServeFile::new("static/index.html"));

    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest("/api", api::routes())
        .with_state(app_state)
        .fallback_service(static_service)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("🚀 Server starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
