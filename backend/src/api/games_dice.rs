use axum::{extract::State, Json};
use rand::Rng;
use serde::Serialize;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

#[derive(Serialize)]
pub struct DiceResult {
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub is_double: bool,
    pub rule_name: String,
    pub rule_description: String,
    pub action: String,
    pub severity: String, // "safe", "mild", "spicy", "extreme"
    pub target: String,   // "self", "choose", "all", "left", "right", "none"
}

pub async fn roll_dice(
    State(state): State<AppState>,
    _auth_user: AuthUser,
) -> Result<Json<ApiResponse<DiceResult>>, AppError> {
    require_feature_enabled(&state, "games").await?;
    require_feature_enabled(&state, "game_dice").await?;

    let mut rng = rand::thread_rng();

    let dice1: u8 = rng.gen_range(1..=6);
    let dice2: u8 = rng.gen_range(1..=6);
    let total = dice1 + dice2;
    let is_double = dice1 == dice2;

    let (rule_name, rule_description, action, severity, target) = if is_double {
        match dice1 {
            1 => (
                "Snake Eyes",
                "Đôi 1 - Xui xẻo nhất!",
                "Uống 2 shot và làm 1 thử thách",
                "extreme",
                "self",
            ),
            2 => (
                "Đôi Nhị",
                "May mắn thoát nạn",
                "Được miễn uống lượt này",
                "safe",
                "none",
            ),
            3 => (
                "Three Man",
                "Bạn là Three Man!",
                "Mỗi khi ai đó roll ra 3, bạn phải uống",
                "spicy",
                "self",
            ),
            4 => (
                "Floor Master",
                "Chạm sàn!",
                "Tất cả chạm sàn, người cuối uống 2 shot",
                "mild",
                "all",
            ),
            5 => (
                "Thumb Master",
                "Bạn là Thumb Master!",
                "Đặt ngón tay lên bàn bất kỳ lúc nào, người cuối uống",
                "mild",
                "self",
            ),
            6 => (
                "Đôi Lục - VƯƠNG",
                "Bạn là VƯƠNG!",
                "Chọn 2 người bất kỳ uống 2 shot mỗi người",
                "extreme",
                "choose",
            ),
            _ => ("???", "Không xác định", "Không có gì", "safe", "none"),
        }
    } else {
        match total {
            2 => (
                "Snake Eyes",
                "Tổng 2 - Xui nhất!",
                "Uống 3 shot",
                "extreme",
                "self",
            ),
            3 => ("Ba Que", "Số xui!", "Uống 1 shot", "mild", "self"),
            4 => (
                "Whores",
                "Tất cả nữ!",
                "Các bạn nữ uống 1 shot",
                "mild",
                "all",
            ),
            5 => (
                "Thumb Master",
                "Đặt ngón cái!",
                "Bạn là Thumb Master đến lượt tiếp",
                "safe",
                "self",
            ),
            6 => (
                "Dicks",
                "Tất cả nam!",
                "Các bạn nam uống 1 shot",
                "mild",
                "all",
            ),
            7 => (
                "Heaven",
                "Giơ tay lên trời!",
                "Người cuối giơ tay uống 2 shot",
                "spicy",
                "all",
            ),
            8 => (
                "Mate",
                "Chọn bạn nhậu!",
                "Chọn 1 người, cả 2 cùng uống mỗi lần bạn uống",
                "mild",
                "choose",
            ),
            9 => (
                "Rhyme Time",
                "Thời gian gieo vần!",
                "Nói 1 từ, người tiếp theo phải vần, ai thua uống",
                "spicy",
                "all",
            ),
            10 => (
                "Categories",
                "Đặt chủ đề!",
                "Chọn 1 category (bia, xe,...), ai không nghĩ ra uống",
                "spicy",
                "all",
            ),
            11 => (
                "Make a Rule",
                "Đặt luật mới!",
                "Tạo 1 rule mới cho cả bàn, ai vi phạm uống",
                "spicy",
                "self",
            ),
            12 => (
                "Social!",
                "Tất cả cùng uống!",
                "Cả bàn nâng ly và uống cùng nhau!",
                "extreme",
                "all",
            ),
            _ => ("???", "Không xác định", "Roll lại", "safe", "none"),
        }
    };

    Ok(ok(DiceResult {
        dice1,
        dice2,
        total,
        is_double,
        rule_name: rule_name.to_string(),
        rule_description: rule_description.to_string(),
        action: action.to_string(),
        severity: severity.to_string(),
        target: target.to_string(),
    }))
}
