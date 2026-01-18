use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use uuid::Uuid;

use crate::api::response::ok;
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::error::AppError;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(list_categories))
}

#[derive(Serialize, sqlx::FromRow)]
pub struct CategoryResponse {
    pub id: Uuid,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_system: bool,
}

/// List all expense categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<CategoryResponse>>>, AppError> {
    let categories: Vec<CategoryResponse> = sqlx::query_as(
        r#"
        SELECT id, name, icon, color, is_system
        FROM expense_categories
        ORDER BY is_system DESC, name ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(ok(categories))
}
