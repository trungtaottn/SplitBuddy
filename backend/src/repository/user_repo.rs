use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::user::User;
use crate::error::AppError;

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        email: &str,
        password_hash: &str,
        full_name: &str,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(email)
        .bind(password_hash)
        .bind(full_name)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT * FROM users WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT * FROM users WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update(
        &self,
        id: Uuid,
        full_name: Option<String>,
        avatar_url: Option<String>,
    ) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET 
                full_name = COALESCE($2, full_name),
                avatar_url = COALESCE($3, avatar_url),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(full_name)
        .bind(avatar_url)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update_password(&self, id: Uuid, password_hash: String) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $2, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(password_hash)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
