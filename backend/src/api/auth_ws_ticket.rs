use axum::{extract::State, Json};
use chrono::Utc;
use uuid::Uuid;

use crate::api::auth_dto::WsTicketResponse;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::cache::WsTicket;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

#[utoipa::path(
    post,
    path = "/api/auth/ws-ticket",
    tag = "auth",
    responses(
        (status = 200, description = "WebSocket ticket generated", body = WsTicketResponse),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearerAuth" = [])
    )
)]
pub async fn get_ws_ticket(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<WsTicketResponse>>, AppError> {
    let user_name: String = sqlx::query_scalar("SELECT full_name FROM users WHERE id = $1")
        .bind(auth_user.user_id)
        .fetch_one(&state.pool)
        .await
        .unwrap_or_else(|_| "Unknown".to_string());

    let ticket_id = Uuid::new_v4();

    let ticket = WsTicket {
        user_id: auth_user.user_id,
        user_name,
        role: auth_user.role,
        expires_at: Utc::now() + chrono::Duration::seconds(30),
    };

    state.cache.store_ws_ticket(ticket_id, ticket).await;

    Ok(ok(WsTicketResponse {
        ticket: ticket_id.to_string(),
        expires_in_seconds: 30,
    }))
}
