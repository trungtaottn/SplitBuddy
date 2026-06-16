use utoipa::OpenApi;

use crate::api::auth_dto::{AuthResponse, LoginRequest, RegisterRequest, UserResponse};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "SplitBuddy API",
        version = "1.0.0",
        description = "API for SplitBuddy - Bill splitting application for group expenses",
        contact(
            name = "SplitBuddy Team",
            email = "support@splitbuddy.app"
        ),
        license(
            name = "MIT"
        )
    ),
    servers(
        (url = "http://localhost:8080", description = "Local development server")
    ),
    tags(
        (name = "auth", description = "Authentication endpoints"),
        (name = "users", description = "User profile management"),
        (name = "sessions", description = "Session (drinking party) management"),
        (name = "debts", description = "Debt tracking and settlement")
    ),
    paths(
        crate::api::auth::register,
        crate::api::auth::login,
    ),
    components(
        schemas(
            RegisterRequest,
            LoginRequest,
            AuthResponse,
            UserResponse,
        )
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::Http::new(
                        utoipa::openapi::security::HttpAuthScheme::Bearer,
                    ),
                ),
            );
        }
    }
}
