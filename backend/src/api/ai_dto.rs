use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct GreetingRequest {
    pub user_name: String,
    pub mood: Option<String>,
}

#[derive(Serialize)]
pub struct GreetingResponse {
    pub message: String,
    pub suggestion: Option<String>,
    pub action: Option<String>,
    pub slogan: String,
}

#[derive(Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub context: Option<String>,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub reply: String,
    pub action: Option<String>,
}
