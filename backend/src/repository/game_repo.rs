use sqlx::PgPool;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use crate::error::AppError;

pub struct GameRepository {
    pool: PgPool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct GameHistoryEntry {
    pub id: Uuid,
    pub session_id: Option<Uuid>,
    pub game_type: String,
    pub content_id: Option<Uuid>,
    pub content_text: String,
    pub difficulty: Option<String>,
    pub player_id: Option<Uuid>,
    pub result: Option<String>,
    pub drink_count: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct GameHistoryWithPlayer {
    pub id: Uuid,
    pub game_type: String,
    pub content_text: String,
    pub difficulty: Option<String>,
    pub player_name: Option<String>,
    pub result: Option<String>,
    pub drink_count: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateGameHistory {
    pub session_id: Option<Uuid>,
    pub game_type: String,
    pub content_id: Option<Uuid>,
    pub content_text: String,
    pub difficulty: Option<String>,
    pub player_id: Option<Uuid>,
    pub result: Option<String>,
    pub drink_count: Option<i32>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CustomQuestion {
    pub id: Uuid,
    pub user_id: Uuid,
    pub game_type: String,
    pub content_type: String,
    pub content: String,
    pub difficulty: Option<String>,
    pub is_public: Option<bool>,
    pub use_count: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomQuestion {
    pub game_type: String,
    pub content_type: Option<String>,
    pub content: String,
    pub difficulty: Option<String>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DrinkingStats {
    pub id: Uuid,
    pub session_id: Uuid,
    pub participant_id: Uuid,
    pub total_drinks: Option<i32>,
    pub games_played: Option<i32>,
    pub games_lost: Option<i32>,
    pub last_drink_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DrinkingStatsWithName {
    pub participant_id: Uuid,
    pub participant_name: String,
    pub total_drinks: i32,
    pub games_played: i32,
    pub games_lost: i32,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub participant_id: Uuid,
    pub participant_name: String,
    pub total_drinks: i64,
    pub total_games: i64,
    pub rank: Option<i64>,
}

impl GameRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Game History
    pub async fn add_history(&self, entry: CreateGameHistory) -> Result<GameHistoryEntry, AppError> {
        let result = sqlx::query_as!(
            GameHistoryEntry,
            r#"
            INSERT INTO game_history (session_id, game_type, content_id, content_text, difficulty, player_id, result, drink_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, session_id, game_type, content_id, content_text, difficulty, player_id, result, drink_count, created_at
            "#,
            entry.session_id,
            entry.game_type,
            entry.content_id,
            entry.content_text,
            entry.difficulty,
            entry.player_id,
            entry.result,
            entry.drink_count
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    pub async fn get_session_history(&self, session_id: Uuid, limit: i64) -> Result<Vec<GameHistoryWithPlayer>, AppError> {
        let history = sqlx::query_as!(
            GameHistoryWithPlayer,
            r#"
            SELECT 
                gh.id,
                gh.game_type,
                gh.content_text,
                gh.difficulty,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as player_name,
                gh.result,
                gh.drink_count,
                gh.created_at
            FROM game_history gh
            LEFT JOIN session_participants sp ON gh.player_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE gh.session_id = $1
            ORDER BY gh.created_at DESC
            LIMIT $2
            "#,
            session_id,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(history)
    }

    // Custom Questions
    pub async fn create_custom_question(&self, user_id: Uuid, data: CreateCustomQuestion) -> Result<CustomQuestion, AppError> {
        let result = sqlx::query_as!(
            CustomQuestion,
            r#"
            INSERT INTO custom_questions (user_id, game_type, content_type, content, difficulty, is_public)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, game_type, content_type, content, difficulty, is_public, use_count, created_at
            "#,
            user_id,
            data.game_type,
            data.content_type.unwrap_or_else(|| "question".to_string()),
            data.content,
            data.difficulty,
            data.is_public.unwrap_or(false)
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    pub async fn get_user_custom_questions(&self, user_id: Uuid, game_type: Option<String>) -> Result<Vec<CustomQuestion>, AppError> {
        let questions = if let Some(gt) = game_type {
            sqlx::query_as!(
                CustomQuestion,
                r#"
                SELECT id, user_id, game_type, content_type, content, difficulty, is_public, use_count, created_at
                FROM custom_questions
                WHERE user_id = $1 AND game_type = $2
                ORDER BY created_at DESC
                "#,
                user_id,
                gt
            )
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as!(
                CustomQuestion,
                r#"
                SELECT id, user_id, game_type, content_type, content, difficulty, is_public, use_count, created_at
                FROM custom_questions
                WHERE user_id = $1
                ORDER BY created_at DESC
                "#,
                user_id
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(questions)
    }

    pub async fn get_random_custom_question(&self, user_id: Uuid, game_type: &str) -> Result<Option<CustomQuestion>, AppError> {
        let question = sqlx::query_as!(
            CustomQuestion,
            r#"
            SELECT id, user_id, game_type, content_type, content, difficulty, is_public, use_count, created_at
            FROM custom_questions
            WHERE (user_id = $1 OR is_public = true) AND game_type = $2
            ORDER BY RANDOM()
            LIMIT 1
            "#,
            user_id,
            game_type
        )
        .fetch_optional(&self.pool)
        .await?;

        // Increment use count if found
        if let Some(ref q) = question {
            sqlx::query!(
                "UPDATE custom_questions SET use_count = use_count + 1 WHERE id = $1",
                q.id
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(question)
    }

    pub async fn delete_custom_question(&self, user_id: Uuid, question_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            "DELETE FROM custom_questions WHERE id = $1 AND user_id = $2",
            question_id,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Drinking Stats
    pub async fn record_drink(&self, session_id: Uuid, participant_id: Uuid, drinks: i32, lost: bool) -> Result<DrinkingStats, AppError> {
        let result = sqlx::query_as!(
            DrinkingStats,
            r#"
            INSERT INTO drinking_stats (session_id, participant_id, total_drinks, games_played, games_lost, last_drink_at)
            VALUES ($1, $2, $3, 1, $4, NOW())
            ON CONFLICT (session_id, participant_id)
            DO UPDATE SET 
                total_drinks = drinking_stats.total_drinks + $3,
                games_played = drinking_stats.games_played + 1,
                games_lost = drinking_stats.games_lost + $4,
                last_drink_at = NOW(),
                updated_at = NOW()
            RETURNING id, session_id, participant_id, total_drinks, games_played, games_lost, last_drink_at, updated_at
            "#,
            session_id,
            participant_id,
            drinks,
            if lost { 1 } else { 0 }
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    pub async fn get_session_stats(&self, session_id: Uuid) -> Result<Vec<DrinkingStatsWithName>, AppError> {
        let stats = sqlx::query_as!(
            DrinkingStatsWithName,
            r#"
            SELECT 
                ds.participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as "participant_name!",
                COALESCE(ds.total_drinks, 0) as "total_drinks!",
                COALESCE(ds.games_played, 0) as "games_played!",
                COALESCE(ds.games_lost, 0) as "games_lost!"
            FROM drinking_stats ds
            JOIN session_participants sp ON ds.participant_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE ds.session_id = $1
            ORDER BY ds.total_drinks DESC
            "#,
            session_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(stats)
    }

    pub async fn get_leaderboard(&self, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
        let leaderboard = sqlx::query_as!(
            LeaderboardEntry,
            r#"
            SELECT 
                sp.id as participant_id,
                COALESCE(u.full_name, sp.guest_name, 'Unknown') as "participant_name!",
                COALESCE(SUM(ds.total_drinks), 0) as "total_drinks!",
                COALESCE(SUM(ds.games_played), 0) as "total_games!",
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.total_drinks), 0) DESC) as rank
            FROM session_participants sp
            LEFT JOIN drinking_stats ds ON sp.id = ds.participant_id
            LEFT JOIN users u ON sp.user_id = u.id
            GROUP BY sp.id, u.full_name, sp.guest_name
            HAVING COALESCE(SUM(ds.total_drinks), 0) > 0
            ORDER BY total_drinks DESC
            LIMIT $1
            "#,
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(leaderboard)
    }
}
