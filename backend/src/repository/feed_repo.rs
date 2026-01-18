use crate::error::AppError;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Activity {
    pub id: Uuid,
    pub user_id: Uuid,
    pub activity_type: String,
    pub target_id: Uuid,
    pub target_type: String,
    pub meta_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ActivityWithUser {
    pub id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub activity_type: String,
    pub target_id: Uuid,
    pub target_type: String,
    pub meta_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub like_count: i64,
    pub comment_count: i64,
    pub has_liked: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Comment {
    pub id: Uuid,
    pub activity_id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

pub struct FeedRepository {
    pool: PgPool,
}

impl FeedRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_activity(
        &self,
        user_id: Uuid,
        activity_type: &str,
        target_id: Uuid,
        target_type: &str,
        meta_data: serde_json::Value,
    ) -> Result<Activity, AppError> {
        let activity = sqlx::query_as::<_, Activity>(
            r#"
            INSERT INTO activities (user_id, activity_type, target_id, target_type, meta_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(activity_type)
        .bind(target_id)
        .bind(target_type)
        .bind(meta_data)
        .fetch_one(&self.pool)
        .await?;

        Ok(activity)
    }

    pub async fn get_feed(
        &self,
        current_user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<ActivityWithUser>, AppError> {
        // Query to get activities with user info, like count, comment count, and if current user liked
        let activities = sqlx::query_as::<_, ActivityWithUser>(
            r#"
            SELECT 
                a.id,
                a.user_id,
                u.full_name as user_name,
                u.avatar_url as user_avatar,
                a.activity_type,
                a.target_id,
                a.target_type,
                a.meta_data,
                a.created_at,
                (SELECT COUNT(*) FROM activity_likes al WHERE al.activity_id = a.id) as like_count,
                (SELECT COUNT(*) FROM activity_comments ac WHERE ac.activity_id = a.id) as comment_count,
                EXISTS(SELECT 1 FROM activity_likes al WHERE al.activity_id = a.id AND al.user_id = $1) as has_liked
            FROM activities a
            JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(current_user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(activities)
    }

    pub async fn toggle_like(&self, activity_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        // Check if exists
        let exists: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = $1 AND user_id = $2)",
        )
        .bind(activity_id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        if exists.0 {
            // Unlike
            sqlx::query("DELETE FROM activity_likes WHERE activity_id = $1 AND user_id = $2")
                .bind(activity_id)
                .bind(user_id)
                .execute(&self.pool)
                .await?;
            Ok(false) // Unliked
        } else {
            // Like
            sqlx::query("INSERT INTO activity_likes (activity_id, user_id) VALUES ($1, $2)")
                .bind(activity_id)
                .bind(user_id)
                .execute(&self.pool)
                .await?;
            Ok(true) // Liked
        }
    }

    pub async fn add_comment(
        &self,
        activity_id: Uuid,
        user_id: Uuid,
        content: &str,
    ) -> Result<Comment, AppError> {
        let comment = sqlx::query_as::<_, Comment>(
            r#"
            WITH inserted AS (
                INSERT INTO activity_comments (activity_id, user_id, content)
                VALUES ($1, $2, $3)
                RETURNING id, activity_id, user_id, content, created_at
            )
            SELECT i.id, i.activity_id, i.user_id, u.full_name as user_name, u.avatar_url as user_avatar, i.content, i.created_at
            FROM inserted i
            JOIN users u ON u.id = i.user_id
            "#
        )
        .bind(activity_id)
        .bind(user_id)
        .bind(content)
        .fetch_one(&self.pool)
        .await?;

        Ok(comment)
    }

    pub async fn get_comments(&self, activity_id: Uuid) -> Result<Vec<Comment>, AppError> {
        let comments = sqlx::query_as::<_, Comment>(
            r#"
            SELECT c.id, c.activity_id, c.user_id, u.full_name as user_name, u.avatar_url as user_avatar, c.content, c.created_at
            FROM activity_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.activity_id = $1
            ORDER BY c.created_at ASC
            "#
        )
        .bind(activity_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(comments)
    }
}
