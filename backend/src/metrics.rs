//! Prometheus metrics for SplitBuddy
//!
//! Custom metrics for monitoring application performance and business metrics.

use metrics::{counter, gauge, histogram};

/// Record a new session created
pub fn record_session_created() {
    counter!("splitbuddy_sessions_created_total").increment(1);
}

/// Record a new bill created with its amount
pub fn record_bill_created(amount: f64) {
    counter!("splitbuddy_bills_created_total").increment(1);
    histogram!("splitbuddy_bill_amount").record(amount);
}

/// Record a debt settled with its amount
pub fn record_debt_settled(amount: f64) {
    counter!("splitbuddy_debts_settled_total").increment(1);
    histogram!("splitbuddy_settlement_amount").record(amount);
}

/// Update WebSocket connection count
pub fn set_websocket_connections(count: u64) {
    gauge!("splitbuddy_websocket_connections").set(count as f64);
}

/// Record a game played
pub fn record_game_played(game_type: &str) {
    counter!("splitbuddy_games_played_total", "game_type" => game_type.to_string()).increment(1);
}

/// Record an AI request result
pub fn record_ai_request(success: bool) {
    let status = if success { "success" } else { "failure" };
    counter!("splitbuddy_ai_requests_total", "status" => status.to_string()).increment(1);
}

/// Record user login
pub fn record_user_login() {
    counter!("splitbuddy_user_logins_total").increment(1);
}

/// Record user registration
pub fn record_user_registration() {
    counter!("splitbuddy_user_registrations_total").increment(1);
}

/// Record notification sent
pub fn record_notification_sent(notification_type: &str) {
    counter!("splitbuddy_notifications_sent_total", "type" => notification_type.to_string()).increment(1);
}
