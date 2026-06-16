use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::groups_dto::{GroupDebtSummary, SimplifiedDebt, SimplifiedDebtSummary};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::domain::split_calculator::{ParticipantBalance, SplitCalculator};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::group_repo::GroupRepository;

pub async fn get_group_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupDebtSummary>>, AppError> {
    require_feature_enabled(&state, "groups").await?;
    require_feature_enabled(&state, "group_debts").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo
        .find_by_id(group_id)
        .await?
        .ok_or_else(|| AppError::Validation {
            field: "group_id".to_string(),
            message: "Group not found".to_string(),
        })?;

    let summary = repo.get_group_debt_summary(group_id, &group.name).await?;

    Ok(ok(summary))
}

pub async fn get_simplified_debts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SimplifiedDebtSummary>>, AppError> {
    require_feature_enabled(&state, "groups").await?;
    require_feature_enabled(&state, "group_debts").await?;
    require_feature_enabled(&state, "group_debts_simplified").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo
        .find_by_id(group_id)
        .await?
        .ok_or_else(|| AppError::Validation {
            field: "group_id".to_string(),
            message: "Group not found".to_string(),
        })?;

    let summary = repo.get_group_debt_summary(group_id, &group.name).await?;

    let mut names_by_user_id: HashMap<Uuid, String> = HashMap::new();
    let mut balances: Vec<ParticipantBalance> = Vec::new();
    for member in &summary.members {
        names_by_user_id.insert(member.user_id, member.name.clone());
        balances.push(ParticipantBalance {
            participant_id: member.user_id,
            balance: member.balance,
        });
    }

    let mut simplified_debts: Vec<SimplifiedDebt> = SplitCalculator::simplify_debts(balances)
        .into_iter()
        .map(|debt| SimplifiedDebt {
            from_user_id: debt.debtor_id,
            from_user_name: names_by_user_id
                .get(&debt.debtor_id)
                .cloned()
                .unwrap_or_else(|| "Unknown".to_string()),
            to_user_id: debt.creditor_id,
            to_user_name: names_by_user_id
                .get(&debt.creditor_id)
                .cloned()
                .unwrap_or_else(|| "Unknown".to_string()),
            amount: debt.amount,
        })
        .collect();

    simplified_debts.sort_by(|a, b| {
        b.amount
            .cmp(&a.amount)
            .then_with(|| a.from_user_id.cmp(&b.from_user_id))
            .then_with(|| a.to_user_id.cmp(&b.to_user_id))
    });

    let total_amount: Decimal = simplified_debts.iter().map(|d| d.amount).sum();

    Ok(ok(SimplifiedDebtSummary {
        group_id,
        group_name: group.name,
        simplified_debts: simplified_debts.clone(),
        total_transactions: simplified_debts.len(),
        total_amount,
    }))
}
