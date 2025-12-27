// Bills API - Additional endpoints for bill management
// Main bill CRUD is in sessions.rs under /sessions/:id/bills
// This module can be extended for standalone bill operations

use axum::Router;

use crate::api::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
}
