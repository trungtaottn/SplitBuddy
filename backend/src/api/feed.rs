use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::response::ok;
use crate::api::response::ApiResponse;
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::feed_repo::FeedRepository;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_feed))
        .route("/:id/like", post(toggle_like))
        .route("/:id/comments", post(add_comment))
        .route("/:id/comments", get(get_comments))
}

#[derive(Serialize)]
pub struct FeedResponse {
    pub id: Uuid,
    pub user: UserInfo,
    pub type_: String, // Renamed from activity_type for cleaner JSON
    pub target_id: Uuid,
    pub target_type: String,
    pub meta_data: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub stats: ActivityStats,
    pub user_interaction: UserInteraction,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct ActivityStats {
    pub likes: i64,
    pub comments: i64,
}

#[derive(Serialize)]
pub struct UserInteraction {
    pub has_liked: bool,
}

#[derive(Deserialize)]
pub struct FeedParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

async fn get_feed(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(params): Query<FeedParams>,
) -> Result<Json<ApiResponse<Vec<FeedResponse>>>, AppError> {
    let repo = FeedRepository::new(state.pool.clone());
    let activities = repo
        .get_feed(
            auth_user.user_id,
            params.limit.unwrap_or(20),
            params.offset.unwrap_or(0),
        )
        .await?;

    let response = activities
        .into_iter()
        .map(|a| FeedResponse {
            id: a.id,
            user: UserInfo {
                id: a.user_id,
                name: a.user_name,
                avatar: a.user_avatar,
            },
            type_: a.activity_type,
            target_id: a.target_id,
            target_type: a.target_type,
            meta_data: a.meta_data,
            created_at: a.created_at,
            stats: ActivityStats {
                likes: a.like_count,
                comments: a.comment_count,
            },
            user_interaction: UserInteraction {
                has_liked: a.has_liked,
            },
        })
        .collect();

    Ok(ok(response))
}

async fn toggle_like(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let repo = FeedRepository::new(state.pool.clone());
    let liked = repo.toggle_like(id, auth_user.user_id).await?;
    Ok(ok(liked))
}

#[derive(Deserialize)]
pub struct AddCommentRequest {
    pub content: String,
}

#[derive(Serialize)]
pub struct CommentResponse {
    pub id: Uuid,
    pub user: UserInfo,
    pub content: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

async fn add_comment(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<AddCommentRequest>,
) -> Result<Json<ApiResponse<CommentResponse>>, AppError> {
    let repo = FeedRepository::new(state.pool.clone());
    let comment = repo
        .add_comment(id, auth_user.user_id, &req.content)
        .await?;

    Ok(ok(CommentResponse {
        id: comment.id,
        user: UserInfo {
            id: comment.user_id,
            name: comment.user_name,
            avatar: comment.user_avatar,
        },
        content: comment.content,
        created_at: comment.created_at,
    }))
}

async fn get_comments(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<CommentResponse>>>, AppError> {
    let repo = FeedRepository::new(state.pool.clone());
    let comments = repo.get_comments(id).await?;

    let response = comments
        .into_iter()
        .map(|c| CommentResponse {
            id: c.id,
            user: UserInfo {
                id: c.user_id,
                name: c.user_name,
                avatar: c.user_avatar,
            },
            content: c.content,
            created_at: c.created_at,
        })
        .collect();

    Ok(ok(response))
}
