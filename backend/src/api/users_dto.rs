use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Serialize)]
pub struct UserProfileResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Serialize)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct BankAccountResponse {
    pub id: Uuid,
    pub bank_name: String,
    pub account_number: String,
    pub account_holder_name: String,
    pub is_default: bool,
    pub qr_image_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize, Validate)]
pub struct AddBankAccountRequest {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Bank name must be between 1 and 100 characters"
    ))]
    pub bank_name: String,
    #[validate(length(
        min = 1,
        max = 50,
        message = "Account number must be between 1 and 50 characters"
    ))]
    pub account_number: String,
    #[validate(length(
        min = 1,
        max = 200,
        message = "Account holder name must be between 1 and 200 characters"
    ))]
    pub account_holder_name: String,
    pub is_default: Option<bool>,
    #[validate(length(max = 500, message = "QR image URL must be less than 500 characters"))]
    pub qr_image_url: Option<String>,
}

#[derive(Deserialize, Validate)]
pub struct UpdateBankAccountRequest {
    #[validate(length(max = 100, message = "Bank name must be less than 100 characters"))]
    pub bank_name: Option<String>,
    #[validate(length(max = 50, message = "Account number must be less than 50 characters"))]
    pub account_number: Option<String>,
    #[validate(length(
        max = 200,
        message = "Account holder name must be less than 200 characters"
    ))]
    pub account_holder_name: Option<String>,
    pub is_default: Option<bool>,
    #[validate(length(max = 500, message = "QR image URL must be less than 500 characters"))]
    pub qr_image_url: Option<String>,
}
