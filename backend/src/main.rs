use std::net::SocketAddr;
use std::sync::Arc;

use axum::{Router, response::Response, middleware::{self as axum_mw, Next}, extract::Request, body::Body};
use axum::http::header;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer, key_extractor::KeyExtractor};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

mod api;
mod audit;
mod cache;
mod config;
mod domain;
mod error;
mod middleware;
mod openapi;
mod repository;
mod utils;

use cache::AppCache;
use config::Config;
use openapi::ApiDoc;
use sqlx::PgPool;

/// Custom key extractor that works with localhost and proxied requests
#[derive(Clone)]
struct RealIpKeyExtractor;

impl KeyExtractor for RealIpKeyExtractor {
    type Key = String;

    fn extract<T>(&self, req: &axum::http::Request<T>) -> Result<Self::Key, tower_governor::GovernorError> {
        // Try X-Forwarded-For first (for proxied requests)
        if let Some(forwarded) = req.headers().get("x-forwarded-for") {
            if let Ok(value) = forwarded.to_str() {
                if let Some(ip) = value.split(',').next() {
                    return Ok(ip.trim().to_string());
                }
            }
        }
        
        // Try X-Real-IP
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(value) = real_ip.to_str() {
                return Ok(value.to_string());
            }
        }
        
        // Fallback to a default key for localhost/direct connections
        // This is safe because we're rate limiting all local requests together
        Ok("local".to_string())
    }
}

// Middleware to add no-cache headers for HTML files (forces browser to check for updates)
async fn add_cache_headers(request: Request, next: Next) -> Response<Body> {
    let path = request.uri().path().to_string();
    let mut response: Response<Body> = next.run(request).await;
    
    // For HTML files and root path, disable caching to ensure users get latest version
    if path == "/" || path.ends_with(".html") || path.ends_with("/") || !path.contains('.') {
        response.headers_mut().insert(
            header::CACHE_CONTROL,
            "no-cache, no-store, must-revalidate".parse().unwrap(),
        );
        response.headers_mut().insert(
            header::PRAGMA,
            "no-cache".parse().unwrap(),
        );
        response.headers_mut().insert(
            header::EXPIRES,
            "0".parse().unwrap(),
        );
    }
    
    response
}

async fn init_admin_user(pool: &PgPool, admin_password: &str) -> anyhow::Result<()> {
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

    // Hash password from environment config
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(admin_password.as_bytes(), &salt)
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

    tracing::info!("Created admin user: admin@splitbuddy.com (password set from ADMIN_DEFAULT_PASSWORD env)");
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
    
    // Only add sslmode=require for Heroku (production) - check if DATABASE_URL contains heroku
    let database_url = if config.database_url.contains("sslmode") {
        config.database_url.clone()
    } else if config.database_url.contains("heroku") || config.database_url.contains("amazonaws") {
        // Production database - require SSL
        if config.database_url.contains('?') {
            format!("{}&sslmode=require", config.database_url)
        } else {
            format!("{}?sslmode=require", config.database_url)
        }
    } else {
        // Local development - no SSL
        config.database_url.clone()
    };
    
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("Running migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Initialize admin user if not exists (using password from config)
    init_admin_user(&pool, &config.admin_default_password).await?;

    // Initialize application cache
    let cache = AppCache::new();
    tracing::info!("Application cache initialized");

    // Initialize WebSocket manager for real-time updates
    let ws_manager = api::WsManager::new();
    tracing::info!("WebSocket manager initialized");

    let app_state = api::AppState {
        pool,
        config: config.clone(),
        cache,
        ws_manager,
    };

    // Configure CORS - use specific origins from config instead of Any
    let cors = {
        use axum::http::{HeaderName, HeaderValue, Method};
        use tower_http::cors::AllowOrigin;
        
        let origins: Vec<HeaderValue> = config.cors_origins
            .iter()
            .filter_map(|origin| origin.parse().ok())
            .collect();
        
        // Common headers that frontend typically needs
        let allowed_headers = [
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("accept"),
            HeaderName::from_static("origin"),
            HeaderName::from_static("x-requested-with"),
        ];
        
        // Common methods
        let allowed_methods = [
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ];
        
        if origins.is_empty() {
            tracing::warn!("No valid CORS origins configured, allowing all origins (not recommended for production)");
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        } else {
            tracing::info!("CORS configured for origins: {:?}", config.cors_origins);
            CorsLayer::new()
                .allow_origin(AllowOrigin::list(origins))
                .allow_methods(allowed_methods)
                .allow_headers(allowed_headers)
                .allow_credentials(true)
        }
    };

    // Create uploads directory if it doesn't exist
    tokio::fs::create_dir_all("uploads/avatars").await.ok();

    // Configure rate limiting with custom key extractor for localhost handling
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(config.rate_limit_requests_per_second)
            .burst_size(config.rate_limit_burst_size)
            .key_extractor(RealIpKeyExtractor)
            .finish()
            .expect("Failed to create rate limiter config"),
    );
    let governor_limiter = governor_conf.limiter().clone();
    
    // Spawn background task to clean up rate limiter state
    let governor_limiter_clone = governor_limiter.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            governor_limiter_clone.retain_recent();
        }
    });

    tracing::info!("Rate limiting configured: {} req/s, burst size {}", 
        config.rate_limit_requests_per_second, 
        config.rate_limit_burst_size
    );

    // Serve static files (frontend) - fallback to index.html for SPA routing
    let static_service = ServeDir::new("static")
        .not_found_service(ServeFile::new("static/index.html"));
    
    // Serve uploaded files
    let uploads_service = ServeDir::new("uploads");

    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest("/api", api::routes())
        .nest_service("/uploads", uploads_service)
        .with_state(app_state)
        .fallback_service(static_service)
        .layer(axum_mw::from_fn(add_cache_headers))
        .layer(cors)
        .layer(GovernorLayer { config: governor_conf })
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("🚀 Server starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
