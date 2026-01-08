use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::group_repo::GroupRepository;

/// Check if a feature is enabled from database
async fn is_feature_enabled(pool: &sqlx::PgPool, key: &str) -> bool {
    sqlx::query_scalar::<_, bool>(
        "SELECT enabled FROM feature_flags WHERE key = $1"
    )
    .bind(key)
    .fetch_optional(pool)
    .await
    .unwrap_or(None)
    .unwrap_or(true) // Default to enabled if not found
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_groups).post(create_group))
        .route("/:id", get(get_group))
        .route("/:id/members", get(get_members).post(add_member))
        .route("/:id/members/:user_id", axum::routing::delete(remove_member))
        .route("/:id/debts", get(get_group_debts))
        .route("/:id/debts/simplified", get(get_simplified_debts))
}

#[derive(Serialize)]
pub struct GroupResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub member_count: i64,
}

#[derive(Serialize)]
pub struct GroupDetailResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
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

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct AddMemberRequest {
    pub email: String,
    pub full_name: Option<String>,
    pub password: Option<String>,
}

async fn list_groups(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<GroupResponse>>>, AppError> {
    let repo = GroupRepository::new(state.pool.clone());
    let groups = repo.find_by_user(auth_user.user_id).await?;

    let mut responses = Vec::new();
    for group in groups {
        let members = repo.get_members(group.id).await?;
        responses.push(GroupResponse {
            id: group.id,
            name: group.name,
            description: group.description,
            created_by: group.created_by,
            created_at: group.created_at,
            member_count: members.len() as i64,
        });
    }

    Ok(ok(responses))
}

async fn create_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<GroupResponse>>), AppError> {
    let repo = GroupRepository::new(state.pool.clone());

    let group = repo
        .create(&payload.name, payload.description.as_deref(), auth_user.user_id)
        .await?;

    Ok(created(GroupResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        member_count: 1,
    }))
}

async fn get_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupDetailResponse>>, AppError> {
    let repo = GroupRepository::new(state.pool.clone());

    // Check if user is member
    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo.find_by_id(group_id).await?.ok_or(AppError::Validation {
        field: "group_id".to_string(),
        message: "Group not found".to_string(),
    })?;

    let members = repo.get_members(group_id).await?;

    Ok(ok(GroupDetailResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        members: members
            .into_iter()
            .map(|m| MemberResponse {
                id: m.id,
                user_id: m.user_id,
                full_name: m.full_name,
                email: m.email,
                avatar_url: m.avatar_url,
                role: m.role,
                joined_at: m.joined_at,
            })
            .collect(),
    }))
}

async fn get_members(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<MemberResponse>>>, AppError> {
    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let members = repo.get_members(group_id).await?;

    Ok(ok(members
        .into_iter()
        .map(|m| MemberResponse {
            id: m.id,
            user_id: m.user_id,
            full_name: m.full_name,
            email: m.email,
            avatar_url: m.avatar_url,
            role: m.role,
            joined_at: m.joined_at,
        })
        .collect()))
}

async fn add_member(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<AddMemberRequest>,
) -> Result<Json<ApiResponse<MemberResponse>>, AppError> {
    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    // Find user by email - user must exist (created by admin)
    let user = repo.find_user_by_email(&payload.email).await?
        .ok_or_else(|| AppError::Validation {
            field: "email".to_string(),
            message: "Người dùng không tồn tại. Vui lòng liên hệ Admin để tạo tài khoản.".to_string(),
        })?;

    // Check if already member
    if repo.is_member(group_id, user.id).await? {
        return Err(AppError::Validation {
            field: "email".to_string(),
            message: "User is already a member of this group".to_string(),
        });
    }

    let member = repo.add_member(group_id, user.id, "member").await?;

    Ok(ok(MemberResponse {
        id: member.id,
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        role: member.role,
        joined_at: member.joined_at,
    }))
}

async fn remove_member(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((group_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    // Prevent removing self if admin
    let group = repo.find_by_id(group_id).await?.ok_or(AppError::Validation {
        field: "group_id".to_string(),
        message: "Group not found".to_string(),
    })?;

    if user_id == group.created_by {
        return Err(AppError::Validation {
            field: "user_id".to_string(),
            message: "Cannot remove the group creator".to_string(),
        });
    }

    repo.remove_member(group_id, user_id).await?;

    Ok(ok(()))
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

/// Simplified debt after netting - represents minimum transactions needed
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

async fn get_group_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupDebtSummary>>, AppError> {
    // Check feature flag
    if !is_feature_enabled(&state.pool, "group_debts").await {
        return Err(AppError::FeatureDisabled {
            feature: "group_debts".to_string(),
        });
    }

    let repo = GroupRepository::new(state.pool.clone());

    // Verify user is a member of the group
    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo.find_by_id(group_id).await?.ok_or_else(|| AppError::Validation {
        field: "group_id".to_string(),
        message: "Group not found".to_string(),
    })?;

    let summary = repo.get_group_debt_summary(group_id, &group.name).await?;

    Ok(ok(summary))
}

/// Get simplified/netted debts for a group
/// This calculates the minimum number of transactions needed to settle all debts
async fn get_simplified_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SimplifiedDebtSummary>>, AppError> {
    use rust_decimal::Decimal;
    use std::collections::HashMap;

    // Check feature flag
    if !is_feature_enabled(&state.pool, "group_debts_simplified").await {
        return Err(AppError::FeatureDisabled {
            feature: "group_debts_simplified".to_string(),
        });
    }

    let repo = GroupRepository::new(state.pool.clone());

    // Verify user is a member of the group
    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo.find_by_id(group_id).await?.ok_or_else(|| AppError::Validation {
        field: "group_id".to_string(),
        message: "Group not found".to_string(),
    })?;

    // Get full debt summary to calculate balances
    let summary = repo.get_group_debt_summary(group_id, &group.name).await?;

    // Build a map of user_id -> (name, balance)
    // Positive balance = creditor (others owe them)
    // Negative balance = debtor (they owe others)
    let mut balances: HashMap<Uuid, (String, Decimal)> = HashMap::new();
    for member in &summary.members {
        if member.balance != Decimal::ZERO {
            balances.insert(member.user_id, (member.name.clone(), member.balance));
        }
    }

    // Separate into creditors (positive balance) and debtors (negative balance)
    let mut creditors: Vec<(Uuid, String, Decimal)> = balances
        .iter()
        .filter(|(_, (_, balance))| *balance > Decimal::ZERO)
        .map(|(id, (name, balance))| (*id, name.clone(), *balance))
        .collect();

    let mut debtors: Vec<(Uuid, String, Decimal)> = balances
        .iter()
        .filter(|(_, (_, balance))| *balance < Decimal::ZERO)
        .map(|(id, (name, balance))| (*id, name.clone(), balance.abs()))
        .collect();

    // Sort by amount (largest first) for optimal settlement
    creditors.sort_by(|a, b| b.2.cmp(&a.2));
    debtors.sort_by(|a, b| b.2.cmp(&a.2));

    // Calculate simplified debts using greedy algorithm
    let mut simplified_debts: Vec<SimplifiedDebt> = Vec::new();
    let mut c_idx = 0;
    let mut d_idx = 0;
    let mut creditor_remaining: Vec<Decimal> = creditors.iter().map(|c| c.2).collect();
    let mut debtor_remaining: Vec<Decimal> = debtors.iter().map(|d| d.2).collect();

    while c_idx < creditors.len() && d_idx < debtors.len() {
        let transfer = creditor_remaining[c_idx].min(debtor_remaining[d_idx]);

        if transfer > Decimal::ZERO {
            simplified_debts.push(SimplifiedDebt {
                from_user_id: debtors[d_idx].0,
                from_user_name: debtors[d_idx].1.clone(),
                to_user_id: creditors[c_idx].0,
                to_user_name: creditors[c_idx].1.clone(),
                amount: transfer,
            });

            creditor_remaining[c_idx] -= transfer;
            debtor_remaining[d_idx] -= transfer;
        }

        if creditor_remaining[c_idx] == Decimal::ZERO {
            c_idx += 1;
        }
        if debtor_remaining[d_idx] == Decimal::ZERO {
            d_idx += 1;
        }
    }

    let total_amount: Decimal = simplified_debts.iter().map(|d| d.amount).sum();

    Ok(ok(SimplifiedDebtSummary {
        group_id,
        group_name: group.name,
        simplified_debts: simplified_debts.clone(),
        total_transactions: simplified_debts.len(),
        total_amount,
    }))
}
