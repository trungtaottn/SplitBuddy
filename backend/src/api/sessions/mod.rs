use axum::{
    routing::{get, post, put},
    Router,
};

use crate::api::AppState;

pub(crate) mod authz;
mod bill_currency;
mod bill_events;
mod bill_requests;
pub mod bills;
pub mod debts;
pub mod dto;
mod import_export_csv;
mod import_export_handlers;
mod import_export_parser;
pub mod participants;
mod session_handlers;
mod session_status_handlers;
mod stats_handlers;

use bills::{create_bill, delete_bill, list_bills, update_bill};
pub use dto::*;
use import_export_handlers::{
    export_session, export_session_v2, import_session, import_session_preview,
};
use participants::{add_participant, delete_participant, update_participant};
use session_handlers::{
    archive_session, bulk_archive_sessions, create_session, delete_session, get_session,
    list_sessions, restore_session,
};
use session_status_handlers::{close_session, reopen_session, update_minimize_debts};
use stats_handlers::who_pays_next;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/bulk-archive", post(bulk_archive_sessions))
        .route("/:id", get(get_session).delete(delete_session))
        .route("/:id/participants", post(add_participant))
        .route(
            "/:id/participants/:pid",
            put(update_participant).delete(delete_participant),
        )
        .route("/:id/close", post(close_session))
        .route("/:id/reopen", post(reopen_session))
        .route("/:id/minimize-debts", put(update_minimize_debts))
        .route("/:id/archive", post(archive_session))
        .route("/:id/restore", post(restore_session))
        .route("/:id/bills", get(list_bills).post(create_bill))
        .route("/:id/bills/:bill_id", put(update_bill).delete(delete_bill))
        .route("/:id/export", get(export_session))
        .route("/:id/export/v2", get(export_session_v2))
        .route("/:id/import/preview", post(import_session_preview))
        .route("/:id/import", post(import_session))
        .route("/:id/who-pays-next", get(who_pays_next))
        .route("/:id/spin", post(super::games::spin_wheel))
        .route("/:id/spin-history", get(super::games::get_spin_history))
        .route("/:id/debt-stats", get(debts::get_debt_stats))
        .route("/:id/debts/pending", get(debts::get_pending_debts))
}
