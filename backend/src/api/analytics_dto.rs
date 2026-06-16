use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AnalyticsQuery {
    pub from: Option<chrono::NaiveDate>,
    pub to: Option<chrono::NaiveDate>,
    pub session_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct SpendingAnalyticsResponse {
    pub total_spent: String,
    pub total_received: String,
    pub net_balance: String,
    pub session_count: i64,
    pub avg_per_session: String,
    pub top_category: Option<CategorySpending>,
    pub category_breakdown: Vec<CategorySpending>,
}

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct CategorySpending {
    pub category_id: Option<Uuid>,
    pub category_name: Option<String>,
    pub total_amount: String,
    pub bill_count: i64,
}

#[derive(Serialize)]
pub struct SpendingTrendsResponse {
    pub monthly: Vec<MonthlySpending>,
    pub yearly: Vec<YearlySpending>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MonthlySpending {
    pub year: i32,
    pub month: i32,
    pub total_amount: String,
    pub session_count: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct YearlySpending {
    pub year: i32,
    pub total_amount: String,
    pub session_count: i64,
}
