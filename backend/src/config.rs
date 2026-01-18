use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub port: u16,
    // Security settings
    pub admin_default_password: String,
    pub cors_origins: Vec<String>,
    pub rate_limit_requests_per_second: u64,
    pub rate_limit_burst_size: u32,
    // HTTP client settings
    pub http_timeout_seconds: u64,
    pub http_connect_timeout_seconds: u64,
    // Scheduler settings
    pub recurring_expense_scheduler_interval_seconds: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        // Parse CORS origins from comma-separated string
        let cors_origins = env::var("CORS_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:5173,http://localhost:8080".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Ok(Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            jwt_expiration_hours: env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .expect("JWT_EXPIRATION_HOURS must be a number"),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a number"),
            // Security settings
            admin_default_password: env::var("ADMIN_DEFAULT_PASSWORD").unwrap_or_else(|_| {
                // Enforce password in production
                if env::var("RUST_ENV").unwrap_or_default() == "production"
                    || env::var("HEROKU").is_ok()
                    || env::var("RAILWAY_ENVIRONMENT").is_ok()
                {
                    panic!("ADMIN_DEFAULT_PASSWORD must be set in production!");
                }
                tracing::warn!("⚠️  Using development default password - CHANGE IN PRODUCTION!");
                "DevAdmin123!".to_string()
            }),
            cors_origins,
            rate_limit_requests_per_second: env::var("RATE_LIMIT_RPS")
                .unwrap_or_else(|_| "200".to_string())
                .parse()
                .unwrap_or(200),
            rate_limit_burst_size: env::var("RATE_LIMIT_BURST")
                .unwrap_or_else(|_| "500".to_string())
                .parse()
                .unwrap_or(500),
            // HTTP client settings (for OpenAI, external APIs)
            http_timeout_seconds: env::var("HTTP_TIMEOUT_SECONDS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            http_connect_timeout_seconds: env::var("HTTP_CONNECT_TIMEOUT_SECONDS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .unwrap_or(10),
            // Scheduler settings - default to 5 minutes (300 seconds)
            recurring_expense_scheduler_interval_seconds: env::var(
                "RECURRING_EXPENSE_SCHEDULER_INTERVAL_SECONDS",
            )
            .unwrap_or_else(|_| "300".to_string())
            .parse()
            .unwrap_or(300),
        })
    }
}
