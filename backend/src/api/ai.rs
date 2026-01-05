use axum::{
    extract::State,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use anyhow::anyhow;

use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/greeting", post(get_greeting))
        .route("/chat", post(chat))
}

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

const SLOGANS: &[&str] = &[
    "Không nhậu đời không nể! 🍻",
    "Nhậu là nghệ thuật, say là đẳng cấp! 🎨",
    "Cuộc đời ngắn lắm, nhậu đi đừng ngại! 🌟",
    "Một ly không say, hai ly chưa đủ! 🥂",
    "Bạn bè là để nhậu cùng! 👥",
    "Hôm nay không nhậu, mai hối hận! 😎",
    "Tiền tiêu hết, tình bạn còn mãi! 💪",
    "Bia lạnh, bạn thân, cuộc đời tươi đẹp! 🍺",
    "Nhậu để quên buồn, vui để nhớ bạn! 🎉",
    "Sống là để nhậu, nhậu để sống vui! 🌈",
    "Trăm năm bia đá, nghìn năm bia ôm! 🏆",
    "Chia bill rõ ràng, tình bạn bền lâu! 💰",
    "Uống có trách nhiệm, chia có công bằng! ⚖️",
    "Ly này tôi mời, ly sau bạn trả! 🤝",
    "Nhậu không say, lần sau ai mời! 🍾",
    "Đời là những cuộc nhậu bất tận! ♾️",
    "Có bạn có bia, có bia có vui! 🎊",
    "Cạn ly đi, chuyện đời tính sau! 🥃",
    "Không say không về, về thì phải tỉnh! 🚗",
    "Chia tiền công bằng, ai cũng vui lòng! 😄",
    "Một người vì mọi người, mọi người vì bia! 🍻",
    "Nhậu hôm nay, lo ngày mai! 📅",
    "Tiền chia đều, vui chia đôi! 💸",
    "Bạn nhậu tốt, bạn đời tốt hơn! ❤️",
    "Ly bia kết nối, tình bạn thăng hoa! 🌸",
    "Say là tạm thời, kỷ niệm là mãi mãi! 📸",
    "Nhậu ít nói nhiều, nhậu nhiều... quên nói! 🤫",
    "Chia bill như chia sẻ, công bằng như tình bạn! 🤗",
    "Đừng để tiền bạc làm hỏng cuộc vui! 💵",
    "Uống vì đam mê, chia vì công bằng! 🎯",
];

fn get_random_slogan() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as usize;
    SLOGANS[seed % SLOGANS.len()].to_string()
}

async fn get_greeting(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(payload): Json<GreetingRequest>,
) -> Result<Json<ApiResponse<GreetingResponse>>, AppError> {
    let openai_key = std::env::var("OPENAI_API_KEY").ok();
    
    let (message, suggestion, action) = if let Some(api_key) = openai_key {
        // Use OpenAI for personalized greeting
        match generate_ai_greeting(&api_key, &payload.user_name, payload.mood.as_deref()).await {
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

fn generate_fallback_greeting(name: &str, mood: Option<&str>) -> (String, Option<String>, Option<String>) {
    let first_name = name.split_whitespace().last().unwrap_or(name);
    
    match mood {
        Some("happy") | Some("vui") => (
            format!("Chào {}! Vui quá ta! Vui thì phải đi ăn mừng thôi!", first_name),
            Some("Tạo cuộc nhậu ăn mừng ngay nào! 🍻".to_string()),
            Some("create_session".to_string()),
        ),
        Some("sad") | Some("buồn") => (
            format!("Ôi {}! Buồn gì vậy? Buồn thì đi nhậu cho quên sầu thôi!", first_name),
            Some("Nhậu đi cho khuây khỏa nè! Tạo cuộc nhậu ngay! 🍺".to_string()),
            Some("create_session".to_string()),
        ),
        Some("tired") | Some("mệt") => (
            format!("Chào {}! Mệt hả? Thư giãn với ly bia lạnh nhé!", first_name),
            Some("Nghỉ ngơi rồi hẹn anh em đi nhậu! 🍻".to_string()),
            Some("create_session".to_string()),
        ),
        Some("stressed") | Some("căng thẳng") => (
            format!("Ê {}! Căng thẳng quá hả? Xả stress đi nhậu thôi!", first_name),
            Some("Gọi hội đi nhậu xả stress ngay! 🎉".to_string()),
            Some("create_session".to_string()),
        ),
        Some("excited") | Some("hào hứng") => (
            format!("Wow {}! Hào hứng quá ta! Có gì hot vậy?", first_name),
            Some("Chia sẻ niềm vui với anh em qua cuộc nhậu nào! 🥳".to_string()),
            Some("create_session".to_string()),
        ),
        _ => (
            format!("Chào {}! Hôm nay thế nào rồi?", first_name),
            None,
            None,
        ),
    }
}

async fn generate_ai_greeting(
    api_key: &str,
    name: &str,
    mood: Option<&str>,
) -> Result<(String, Option<String>, Option<String>), AppError> {
    let client = reqwest::Client::new();
    
    let first_name = name.split_whitespace().last().unwrap_or(name);
    let mood_context = mood.map(|m| format!("Người dùng đang cảm thấy: {}", m)).unwrap_or_default();
    
    let system_prompt = format!(r#"Bạn là trợ lý vui vẻ của app chia tiền nhậu SplitBuddy. 
Phong cách: Thân thiện, hài hước, dùng tiếng Việt tự nhiên có emoji.
Mục tiêu: Khuyến khích người dùng tạo cuộc nhậu với bạn bè.
Trả lời ngắn gọn, tối đa 2 câu.
QUAN TRỌNG: Luôn gọi người dùng bằng tên "{}" - KHÔNG ĐƯỢC dùng từ "bạn".
Nếu người dùng buồn/mệt/stress -> gợi ý đi nhậu để xả stress.
Nếu người dùng vui -> gợi ý tạo cuộc nhậu ăn mừng."#, first_name);

    let user_prompt = format!(
        "Chào hỏi {} một cách vui vẻ, gọi tên {} trực tiếp. {}",
        first_name,
        first_name,
        mood_context
    );

    let request_body = serde_json::json!({
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 150,
        "temperature": 0.8
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow!(e.to_string())))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow!(e.to_string())))?;

    let message = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Chào bạn!")
        .to_string();

    let (suggestion, action) = if mood.is_some() {
        (
            Some("Rủ nhậu liềnnnnnn".to_string()),
            Some("create_session".to_string()),
        )
    } else {
        (None, None)
    };

    Ok((message, suggestion, action))
}

async fn chat(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(payload): Json<ChatRequest>,
) -> Result<Json<ApiResponse<ChatResponse>>, AppError> {
    let openai_key = std::env::var("OPENAI_API_KEY").ok();
    
    let (reply, action) = if let Some(api_key) = openai_key {
        match generate_ai_chat(&api_key, &payload.message, payload.context.as_deref()).await {
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

fn generate_fallback_chat(message: &str) -> (String, Option<String>) {
    let msg_lower = message.to_lowercase();
    
    if msg_lower.contains("nhậu") || msg_lower.contains("bia") || msg_lower.contains("uống") {
        (
            "Nhậu thôi! Tạo cuộc nhậu ngay đi!".to_string(),
            Some("create_session".to_string()),
        )
    } else if msg_lower.contains("buồn") || msg_lower.contains("chán") {
        (
            "Buồn thì đi nhậu cho vui! Không nhậu đời không nể!".to_string(),
            Some("create_session".to_string()),
        )
    } else if msg_lower.contains("công nợ") || msg_lower.contains("nợ") {
        (
            "Kiểm tra công nợ nhóm ngay nhé!".to_string(),
            Some("view_debts".to_string()),
        )
    } else {
        (
            "Hôm nay nhậu không?".to_string(),
            None,
        )
    }
}

async fn generate_ai_chat(
    api_key: &str,
    message: &str,
    context: Option<&str>,
) -> Result<(String, Option<String>), AppError> {
    let client = reqwest::Client::new();

    let system_prompt = r#"Bạn là trợ lý vui vẻ của app chia tiền nhậu SplitBuddy.
Phong cách: Thân thiện, hài hước, tự nhiên, dùng emoji.
Trả lời ngắn gọn (1-2 câu).
Nếu người dùng muốn nhậu/tạo cuộc -> khuyến khích và gợi ý tạo cuộc nhậu.
Nếu người dùng hỏi về công nợ -> gợi ý xem công nợ nhóm.
Luôn tích cực và vui vẻ!"#;

    let context_info = context.map(|c| format!("\nContext: {}", c)).unwrap_or_default();

    let request_body = serde_json::json!({
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": format!("{}{}", system_prompt, context_info)},
            {"role": "user", "content": message}
        ],
        "max_tokens": 100,
        "temperature": 0.8
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow!(e.to_string())))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow!(e.to_string())))?;

    let reply = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Nhậu thôi!")
        .to_string();

    // Detect action from reply content
    let action = if reply.to_lowercase().contains("tạo cuộc") || reply.to_lowercase().contains("nhậu") {
        Some("create_session".to_string())
    } else if reply.to_lowercase().contains("công nợ") {
        Some("view_debts".to_string())
    } else {
        None
    };

    Ok((reply, action))
}
