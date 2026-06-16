use axum::{extract::State, routing::post, Json, Router};

use crate::api::ai_dto::{ChatRequest, ChatResponse, GreetingRequest, GreetingResponse};
use crate::api::ai_generation::{
    generate_ai_chat, generate_ai_greeting, generate_fallback_chat, generate_fallback_greeting,
    get_random_slogan,
};
use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/greeting", post(get_greeting))
        .route("/chat", post(chat))
}

async fn get_greeting(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(payload): Json<GreetingRequest>,
) -> Result<Json<ApiResponse<GreetingResponse>>, AppError> {
    require_feature_enabled(&state, "ai_assistant").await?;

    let openai_key = std::env::var("OPENAI_API_KEY").ok();

    let (message, suggestion, action) = if let Some(api_key) = openai_key {
        // Use OpenAI for personalized greeting
        match generate_ai_greeting(
            &state.http_client,
            &api_key,
            &payload.user_name,
            payload.mood.as_deref(),
        )
        .await
        {
            Ok(result) => result,
            Err(_) => generate_fallback_greeting(&payload.user_name, payload.mood.as_deref()),
        }
    } else {
        // Fallback without OpenAI
        generate_fallback_greeting(&payload.user_name, payload.mood.as_deref())
    };

    Ok(ok(GreetingResponse {
        message,
        suggestion,
        action,
        slogan: get_random_slogan(),
    }))
}

async fn chat(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(payload): Json<ChatRequest>,
) -> Result<Json<ApiResponse<ChatResponse>>, AppError> {
    require_feature_enabled(&state, "ai_assistant").await?;

    let openai_key = std::env::var("OPENAI_API_KEY").ok();

    let (reply, action) = if let Some(api_key) = openai_key {
        match generate_ai_chat(
            &state.http_client,
            &api_key,
            &payload.message,
            payload.context.as_deref(),
        )
        .await
        {
            Ok(result) => result,
            Err(_) => (
                "Xin lỗi, tôi đang bận nhậu, thử lại sau nhé!".to_string(),
                None,
            ),
        }
    } else {
        generate_fallback_chat(&payload.message)
    };

    Ok(ok(ChatResponse { reply, action }))
}
