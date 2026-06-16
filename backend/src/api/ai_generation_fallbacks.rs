pub fn generate_fallback_greeting(
    name: &str,
    mood: Option<&str>,
) -> (String, Option<String>, Option<String>) {
    let first_name = name.split_whitespace().last().unwrap_or(name);

    match mood {
        Some("happy") | Some("vui") => (
            format!(
                "Chào {}! Vui quá ta! Vui thì phải đi ăn mừng thôi!",
                first_name
            ),
            Some("Tạo cuộc nhậu ăn mừng ngay nào! 🍻".to_string()),
            Some("create_session".to_string()),
        ),
        Some("sad") | Some("buồn") => (
            format!(
                "Ôi {}! Buồn gì vậy? Buồn thì đi nhậu cho quên sầu thôi!",
                first_name
            ),
            Some("Nhậu đi cho khuây khỏa nè! Tạo cuộc nhậu ngay! 🍺".to_string()),
            Some("create_session".to_string()),
        ),
        Some("tired") | Some("mệt") => (
            format!("Chào {}! Mệt hả? Thư giãn với ly bia lạnh nhé!", first_name),
            Some("Nghỉ ngơi rồi hẹn anh em đi nhậu! 🍻".to_string()),
            Some("create_session".to_string()),
        ),
        Some("stressed") | Some("căng thẳng") => (
            format!(
                "Ê {}! Căng thẳng quá hả? Xả stress đi nhậu thôi!",
                first_name
            ),
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

pub fn generate_fallback_chat(message: &str) -> (String, Option<String>) {
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
        ("Hôm nay nhậu không?".to_string(), None)
    }
}
