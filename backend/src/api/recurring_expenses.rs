use crate::api::recurring_expense_controls::{
    pause_recurring_expense, resume_recurring_expense, skip_next_occurrence,
};
use crate::api::recurring_expense_create::create_recurring_expense;
use crate::api::recurring_expense_crud::{
    delete_recurring_expense, get_recurring_expense, list_recurring_expenses,
    update_recurring_expense,
};
use crate::api::recurring_expense_exceptions::{add_exception, list_exceptions, remove_exception};
use crate::api::AppState;
use axum::{
    routing::{get, post, put},
    Router,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        // Routes under /api/recurring-expenses
        // List all recurring expenses for a session
        .route("/session/:session_id", get(list_recurring_expenses))
        // Create new recurring expense for a session
        .route("/session/:session_id", post(create_recurring_expense))
        // Get, update, delete specific recurring expense
        .route(
            "/session/:session_id/:recurring_id",
            get(get_recurring_expense)
                .put(update_recurring_expense)
                .delete(delete_recurring_expense),
        )
        // Control actions
        .route(
            "/session/:session_id/:recurring_id/pause",
            put(pause_recurring_expense),
        )
        .route(
            "/session/:session_id/:recurring_id/resume",
            put(resume_recurring_expense),
        )
        .route(
            "/session/:session_id/:recurring_id/skip",
            put(skip_next_occurrence),
        )
        .route(
            "/session/:session_id/:recurring_id/exceptions",
            get(list_exceptions).post(add_exception),
        )
        .route(
            "/session/:session_id/:recurring_id/exceptions/:date",
            axum::routing::delete(remove_exception),
        )
}
