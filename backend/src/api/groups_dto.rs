use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub struct GroupResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub member_count: i64,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Serialize)]
pub struct GroupDetailResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
    pub members: Vec<MemberResponse>,
}

#[derive(Serialize)]
pub struct MemberResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct GroupQuery {
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct AddMemberRequest {
    pub email: String,
    pub full_name: Option<String>,
    pub password: Option<String>,
}

#[derive(Serialize)]
pub struct GroupDebtSummary {
    pub group_id: Uuid,
    pub group_name: String,
    pub members: Vec<GroupMemberDebt>,
    pub sessions: Vec<GroupSessionDebt>,
}

#[derive(Serialize)]
pub struct GroupMemberDebt {
    pub user_id: Uuid,
    pub name: String,
    pub total_paid: rust_decimal::Decimal,
    pub total_owed: rust_decimal::Decimal,
    pub balance: rust_decimal::Decimal,
}

#[derive(Serialize)]
pub struct GroupSessionDebt {
    pub session_id: Uuid,
    pub session_name: String,
    pub session_date: chrono::NaiveDate,
    pub total_amount: rust_decimal::Decimal,
    pub payers: Vec<SessionPayer>,
    pub member_amounts: Vec<MemberSessionAmount>,
}

#[derive(Serialize)]
pub struct SessionPayer {
    pub user_id: Uuid,
    pub name: String,
    pub amount_paid: rust_decimal::Decimal,
}

#[derive(Serialize)]
pub struct MemberSessionAmount {
    pub user_id: Uuid,
    pub amount_owed: rust_decimal::Decimal,
}

#[derive(Serialize)]
pub struct SimplifiedDebtSummary {
    pub group_id: Uuid,
    pub group_name: String,
    pub simplified_debts: Vec<SimplifiedDebt>,
    pub total_transactions: usize,
    pub total_amount: rust_decimal::Decimal,
}

#[derive(Serialize, Clone)]
pub struct SimplifiedDebt {
    pub from_user_id: Uuid,
    pub from_user_name: String,
    pub to_user_id: Uuid,
    pub to_user_name: String,
    pub amount: rust_decimal::Decimal,
}
