use anyhow::anyhow;

use crate::error::AppError;

pub async fn generate_ai_greeting(
    client: &reqwest::Client,
    api_key: &str,
    name: &str,
    mood: Option<&str>,
) -> Result<(String, Option<String>, Option<String>), AppError> {
    let first_name = name.split_whitespace().last().unwrap_or(name);
    let mood_context = mood
        .map(|m| format!("Người dùng đang cảm thấy: {}", m))
        .unwrap_or_default();

    let system_prompt = format!(
        concat!(
            "Bạn là trợ lý vui vẻ của app chia tiền nhậu SplitBuddy. \n",
            "Phong cách: Thân thiện, hài hước, dùng tiếng Việt tự nhiên có emoji.\n",
            "Mục tiêu: Khuyến khích người dùng tạo cuộc nhậu với bạn bè.\n",
            "Trả lời ngắn gọn, tối đa 2 câu.\n",
            "QUAN TRỌNG: Luôn gọi người dùng bằng tên \"{}\" - KHÔNG ĐƯỢC dùng từ \"bạn\".\n",
            "Nếu người dùng buồn/mệt/stress -> gợi ý đi nhậu để xả stress.\n",
            "Nếu người dùng vui -> gợi ý tạo cuộc nhậu ăn mừng."
        ),
        first_name
    );

    let user_prompt = format!(
        "Chào hỏi {} một cách vui vẻ, gọi tên {} trực tiếp. {}",
        first_name, first_name, mood_context
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

pub async fn generate_ai_chat(
    client: &reqwest::Client,
    api_key: &str,
    message: &str,
    context: Option<&str>,
) -> Result<(String, Option<String>), AppError> {
    let system_prompt = r#"Bạn là trợ lý vui vẻ của app chia tiền nhậu SplitBuddy.
Phong cách: Thân thiện, hài hước, tự nhiên, dùng emoji.
Trả lời ngắn gọn (1-2 câu).
Nếu người dùng muốn nhậu/tạo cuộc -> khuyến khích và gợi ý tạo cuộc nhậu.
Nếu người dùng hỏi về công nợ -> gợi ý xem công nợ nhóm.
Luôn tích cực và vui vẻ!"#;

    let context_info = context
        .map(|c| format!("\nContext: {}", c))
        .unwrap_or_default();

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

    let action = if reply.to_lowercase().contains("tạo cuộc")
        || reply.to_lowercase().contains("nhậu")
    {
        Some("create_session".to_string())
    } else if reply.to_lowercase().contains("công nợ") {
        Some("view_debts".to_string())
    } else {
        None
    };

    Ok((reply, action))
}
