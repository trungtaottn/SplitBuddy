use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::groups_debts::{get_group_debts, get_simplified_debts};
use crate::api::groups_dto::{
    CreateGroupRequest, GroupDetailResponse, GroupQuery, GroupResponse, MemberResponse,
};
use crate::api::groups_members::{add_member, get_members, remove_member};
use crate::api::response::{created, ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::group_repo::GroupRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_groups).post(create_group))
        .route("/:id", get(get_group))
        .route("/:id/members", get(get_members).post(add_member))
        .route(
            "/:id/members/:user_id",
            axum::routing::delete(remove_member),
        )
        .route("/:id/archive", axum::routing::post(archive_group))
        .route("/:id/restore", axum::routing::post(restore_group))
        .route("/:id/debts", get(get_group_debts))
        .route("/:id/debts/simplified", get(get_simplified_debts))
}

async fn list_groups(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<GroupQuery>,
) -> Result<Json<ApiResponse<Vec<GroupResponse>>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());
    let groups = repo
        .find_by_user(auth_user.user_id, query.include_archived)
        .await?;

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
            archived_at: group.archived_at,
        });
    }

    Ok(ok(responses))
}

async fn create_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> Result<(axum::http::StatusCode, Json<ApiResponse<GroupResponse>>), AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    let group = repo
        .create(
            &payload.name,
            payload.description.as_deref(),
            auth_user.user_id,
        )
        .await?;

    Ok(created(GroupResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        member_count: 1,
        archived_at: group.archived_at,
    }))
}

async fn get_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupDetailResponse>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    // Check if user is member
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

    let members = repo.get_members(group_id).await?;

    Ok(ok(GroupDetailResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        archived_at: group.archived_at,
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

async fn archive_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupResponse>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_admin(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "Only group admin can archive this group".to_string(),
        });
    }

    let group = repo.set_archived(group_id, true).await?;
    let members = repo.get_members(group_id).await?;

    Ok(ok(GroupResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        member_count: members.len() as i64,
        archived_at: group.archived_at,
    }))
}

async fn restore_group(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> Result<Json<ApiResponse<GroupResponse>>, AppError> {
    require_feature_enabled(&state, "groups").await?;

    let repo = GroupRepository::new(state.pool.clone());

    if !repo.is_admin(group_id, auth_user.user_id).await? {
        return Err(AppError::Forbidden {
            message: "Only group admin can restore this group".to_string(),
        });
    }

    let group = repo.set_archived(group_id, false).await?;
    let members = repo.get_members(group_id).await?;

    Ok(ok(GroupResponse {
        id: group.id,
        name: group.name,
        description: group.description,
        created_by: group.created_by,
        created_at: group.created_at,
        member_count: members.len() as i64,
        archived_at: group.archived_at,
    }))
}
