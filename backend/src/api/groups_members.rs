use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::groups_dto::{AddMemberRequest, MemberResponse};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::group_repo::GroupRepository;

pub async fn get_members(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<MemberResponse>>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

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

pub async fn add_member(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<AddMemberRequest>,
) -> Result<Json<ApiResponse<MemberResponse>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let user = repo
        .find_user_by_email(&payload.email)
        .await?
        .ok_or_else(|| AppError::Validation {
            field: "email".to_string(),
            message: "Người dùng không tồn tại. Vui lòng liên hệ Admin để tạo tài khoản."
                .to_string(),
        })?;

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

pub async fn remove_member(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path((group_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_member(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "You are not a member of this group".to_string(),
        });
    }

    let group = repo
        .find_by_id(group_id)
        .await?
        .ok_or(AppError::Validation {
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
