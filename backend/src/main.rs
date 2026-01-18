// Jemalloc allocator for better memory performance (optional feature)
#[cfg(feature = "jemalloc")]
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::http::header;
use axum::{
    body::Body,
    extract::Request,
    middleware::{self as axum_mw, Next},
    response::Response,
    Router,
};
use sqlx::postgres::PgPoolOptions;
use tokio::signal;
use tower_governor::{governor::GovernorConfigBuilder, key_extractor::KeyExtractor, GovernorLayer};
use tower_http::compression::CompressionLayer;
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::services::{ServeDir, ServeFile};
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
mod scheduler;
mod utils;

use cache::AppCache;
use config::Config;
use openapi::ApiDoc;
use sqlx::PgPool;

/// Custom key extractor that works with localhost and proxied requests
/// Supports: Cloudflare, Nginx, Railway, Heroku, and other proxies
#[derive(Clone)]
struct RealIpKeyExtractor;

impl KeyExtractor for RealIpKeyExtractor {
    type Key = String;

    fn extract<T>(
        &self,
        req: &axum::http::Request<T>,
    ) -> Result<Self::Key, tower_governor::GovernorError> {
        // Priority order for IP extraction:
        // 1. CF-Connecting-IP (Cloudflare)
        // 2. True-Client-IP (Cloudflare Enterprise, Akamai)
        // 3. X-Real-IP (Nginx)
        // 4. X-Forwarded-For (Standard proxy header)
        // 5. Fallback to "unknown" with request URI hash

        // Cloudflare CF-Connecting-IP
        if let Some(cf_ip) = req.headers().get("cf-connecting-ip") {
            if let Ok(value) = cf_ip.to_str() {
                let ip = value.trim();
                if !ip.is_empty() {
                    return Ok(ip.to_string());
                }
            }
        }

        // Cloudflare Enterprise / Akamai True-Client-IP
        if let Some(true_ip) = req.headers().get("true-client-ip") {
            if let Ok(value) = true_ip.to_str() {
                let ip = value.trim();
                if !ip.is_empty() {
                    return Ok(ip.to_string());
                }
            }
        }

        // Nginx X-Real-IP
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(value) = real_ip.to_str() {
                let ip = value.trim();
                if !ip.is_empty() {
                    return Ok(ip.to_string());
                }
            }
        }

        // Standard X-Forwarded-For (first IP in chain)
        if let Some(forwarded) = req.headers().get("x-forwarded-for") {
            if let Ok(value) = forwarded.to_str() {
                if let Some(ip) = value.split(',').next() {
                    let ip = ip.trim();
                    if !ip.is_empty() {
                        return Ok(ip.to_string());
                    }
                }
            }
        }

        // Fallback: use "local" as key (all local requests share rate limit)
        // This is safe for development but should be rare in production
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
        response
            .headers_mut()
            .insert(header::PRAGMA, "no-cache".parse().unwrap());
        response
            .headers_mut()
            .insert(header::EXPIRES, "0".parse().unwrap());
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
    let exists: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE email = 'admin@splitbuddy.com'")
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
        "#,
    )
    .bind(admin_id)
    .bind(&password_hash)
    .execute(pool)
    .await?;

    tracing::info!(
        "Created admin user: admin@splitbuddy.com (password set from ADMIN_DEFAULT_PASSWORD env)"
    );
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                // Production default: info level, reduces noise
                // For debugging, set RUST_LOG=splitbuddy=debug,tower_http=debug
                .unwrap_or_else(|_| "splitbuddy=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize Prometheus metrics exporter
    let metrics_handle = metrics_exporter_prometheus::PrometheusBuilder::new()
        .install_recorder()
        .expect("Failed to install Prometheus recorder");
    tracing::info!("Prometheus metrics initialized");

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
        .max_connections(20)
        .min_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(&database_url)
        .await?;

    tracing::info!("Database pool configured: max=20, min=5, acquire_timeout=3s");

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

    let app_state = api::AppState::new(pool, config.clone(), cache, ws_manager);
    tracing::info!(
        "HTTP client initialized with {}s timeout",
        config.http_timeout_seconds
    );

    // Configure CORS - use specific origins from config instead of Any
    let cors = {
        use axum::http::{HeaderName, HeaderValue, Method};
        use tower_http::cors::AllowOrigin;

        let origins: Vec<HeaderValue> = config
            .cors_origins
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

    // Create uploads directories if they don't exist
    tokio::fs::create_dir_all("uploads/avatars").await.ok();
    tokio::fs::create_dir_all("uploads/receipts").await.ok();
    tokio::fs::create_dir_all("uploads/bank_qr").await.ok();

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

    tracing::info!(
        "Rate limiting configured: {} req/s, burst size {}",
        config.rate_limit_requests_per_second,
        config.rate_limit_burst_size
    );

    // Spawn recurring expense scheduler
    let scheduler = scheduler::RecurringExpenseScheduler::new(
        app_state.pool.clone(),
        config.recurring_expense_scheduler_interval_seconds,
    );
    scheduler.spawn();
    tracing::info!(
        "Recurring expense scheduler initialized (interval: {}s)",
        config.recurring_expense_scheduler_interval_seconds
    );

    // Serve static files (frontend) - fallback to index.html for SPA routing
    let static_service =
        ServeDir::new("static").not_found_service(ServeFile::new("static/index.html"));

    // Serve uploaded files
    let uploads_service = ServeDir::new("uploads");

    // Clone app_state for cleanup after shutdown (before moving into router)
    let shutdown_state = app_state.clone();

    // Request ID header name
    let x_request_id = axum::http::HeaderName::from_static("x-request-id");

    // Metrics endpoint handler
    let metrics_handle_clone = metrics_handle.clone();
    let metrics_route = axum::routing::get(move || {
        let handle = metrics_handle_clone.clone();
        async move { handle.render() }
    });

    // Build API routes with rate limiting
    let api_routes = Router::new()
        .nest("/api", api::routes())
        .with_state(app_state.clone())
        .layer(GovernorLayer {
            config: governor_conf,
        });

    // Build the main app - rate limiting only applies to /api routes
    let app = Router::new()
        .route("/metrics", metrics_route)
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .merge(api_routes) // API routes with rate limiting
        .nest_service("/uploads", uploads_service)
        .fallback_service(static_service) // Static files - no rate limit
        .layer(axum_mw::from_fn(add_cache_headers))
        .layer(CompressionLayer::new())
        .layer(cors)
        .layer(PropagateRequestIdLayer::new(x_request_id.clone()))
        .layer(SetRequestIdLayer::new(x_request_id, MakeRequestUuid));

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("🚀 Server starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    // Cleanup after shutdown signal received
    tracing::info!("Shutting down gracefully...");

    // Notify WebSocket clients
    shutdown_state.ws_manager.broadcast_shutdown().await;

    // Close database connections
    shutdown_state.pool.close().await;
    tracing::info!("Database connections closed");

    Ok(())
}

/// Graceful shutdown signal handler
/// Listens for Ctrl+C (SIGINT) and SIGTERM
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C signal");
        },
        _ = terminate => {
            tracing::info!("Received SIGTERM signal");
        },
    }
}
