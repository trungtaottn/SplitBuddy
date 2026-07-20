#![allow(dead_code)]
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

#[derive(sqlx::FromRow)]
pub struct GroupRow {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(sqlx::FromRow)]
pub struct GroupMemberRow {
    pub id: Uuid,
    pub group_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

pub struct GroupRepository {
    pool: PgPool,
}

impl GroupRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        name: &str,
        description: Option<&str>,
        created_by: Uuid,
    ) -> Result<GroupRow, AppError> {
        let group = sqlx::query_as!(
            GroupRow,
            r#"
            INSERT INTO groups (name, description, created_by)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, created_by, created_at, archived_at
            "#,
            name,
            description,
            created_by
        )
        .fetch_one(&self.pool)
        .await?;

        // Auto-add creator as admin
        sqlx::query!(
            r#"
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'admin')
            "#,
            group.id,
            created_by
        )
        .execute(&self.pool)
        .await?;

        Ok(group)
    }

    pub async fn find_by_user(
        &self,
        user_id: Uuid,
        include_archived: bool,
    ) -> Result<Vec<GroupRow>, AppError> {
        let groups = sqlx::query_as!(
            GroupRow,
            r#"
            SELECT g.id, g.name, g.description, g.created_by, g.created_at, g.archived_at
            FROM groups g
            INNER JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1
              AND ($2::bool OR g.archived_at IS NULL)
            ORDER BY g.created_at DESC
            "#,
            user_id,
            include_archived
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(groups)
    }

    pub async fn find_by_id(&self, group_id: Uuid) -> Result<Option<GroupRow>, AppError> {
        let group = sqlx::query_as!(
            GroupRow,
            r#"
            SELECT id, name, description, created_by, created_at, archived_at
            FROM groups
            WHERE id = $1
            "#,
            group_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(group)
    }

    pub async fn is_member(&self, group_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM group_members 
                WHERE group_id = $1 AND user_id = $2
            ) as "exists!"
            "#,
            group_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    pub async fn is_admin(&self, group_id: Uuid, user_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM group_members 
                WHERE group_id = $1 AND user_id = $2 AND role = 'admin'
            ) as "exists!"
            "#,
            group_id,
            user_id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    pub async fn set_archived(&self, group_id: Uuid, archived: bool) -> Result<GroupRow, AppError> {
        let archived_at = if archived {
            Some(chrono::Utc::now())
        } else {
            None
        };

        let group = sqlx::query_as!(
            GroupRow,
            r#"
            UPDATE groups
            SET archived_at = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, description, created_by, created_at, archived_at
            "#,
            archived_at,
            group_id
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Validation {
            field: "group_id".to_string(),
            message: "Group not found".to_string(),
        })?;

        Ok(group)
    }

    pub async fn add_member(
        &self,
        group_id: Uuid,
        user_id: Uuid,
        role: &str,
    ) -> Result<GroupMemberRow, AppError> {
        let id = Uuid::new_v4();
        let member = sqlx::query_as!(
            GroupMemberRow,
            r#"
            INSERT INTO group_members (id, group_id, user_id, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, group_id, user_id, role, joined_at
            "#,
            id,
            group_id,
            user_id,
            role
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(member)
    }

    pub async fn remove_member(&self, group_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            DELETE FROM group_members
            WHERE group_id = $1 AND user_id = $2
            "#,
            group_id,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_members(&self, group_id: Uuid) -> Result<Vec<GroupMemberDetail>, AppError> {
        let members = sqlx::query_as!(
            GroupMemberDetail,
            r#"
            SELECT 
                gm.id,
                gm.user_id,
                u.full_name,
                u.email,
                u.avatar_url,
                gm.role,
                gm.joined_at
            FROM group_members gm
            INNER JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1
            ORDER BY gm.joined_at
            "#,
            group_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(members)
    }

    pub async fn find_user_by_email(&self, email: &str) -> Result<Option<UserBasic>, AppError> {
        let user = sqlx::query_as!(
            UserBasic,
            r#"
            SELECT id, full_name, email, avatar_url
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update_user_password(
        &self,
        user_id: Uuid,
        password: &str,
    ) -> Result<(), AppError> {
        use argon2::{
            password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
            Argon2,
        };

        let salt = SaltString::generate(&mut OsRng);
        let password_hash = Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to hash password: {}", e)))?
            .to_string();

        sqlx::query!(
            r#"UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2"#,
            password_hash,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_user(
        &self,
        email: &str,
        full_name: &str,
        password: Option<&str>,
    ) -> Result<UserBasic, AppError> {
        let id = Uuid::new_v4();

        // Hash password if provided, otherwise empty string (can't login)
        let password_hash = match password {
            Some(pwd) if !pwd.is_empty() => {
                use argon2::{
                    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
                    Argon2,
                };

                let salt = SaltString::generate(&mut OsRng);
                Argon2::default()
                    .hash_password(pwd.as_bytes(), &salt)
                    .map_err(|e| {
                        AppError::Internal(anyhow::anyhow!("Failed to hash password: {}", e))
                    })?
                    .to_string()
            }
            _ => String::new(),
        };

        let user = sqlx::query_as!(
            UserBasic,
            r#"
            INSERT INTO users (id, email, full_name, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, full_name, email, avatar_url
            "#,
            id,
            email,
            full_name,
            password_hash
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }
}

#[derive(sqlx::FromRow)]
pub struct GroupMemberDetail {
    pub id: Uuid,
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(sqlx::FromRow)]
pub struct UserBasic {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
}

use crate::api::groups::{
    GroupDebtSummary, GroupMemberDebt, GroupSessionDebt, MemberSessionAmount, SessionPayer,
};

impl GroupRepository {
    pub async fn get_group_debt_summary(
        &self,
        group_id: Uuid,
        group_name: &str,
    ) -> Result<GroupDebtSummary, AppError> {
        use rust_decimal::Decimal;
        use std::collections::HashMap;

        // Get all members of the group
        let members = self.get_members(group_id).await?;

        // Get all sessions for this group
        #[derive(sqlx::FromRow)]
        struct SessionRow {
            id: Uuid,
            name: String,
            session_date: chrono::NaiveDate,
            total_amount: Decimal,
        }

        let sessions: Vec<SessionRow> = sqlx::query_as(
            r#"
            SELECT 
                s.id,
                s.name,
                s.session_date,
                COALESCE(SUM(b.amount), 0) as total_amount
            FROM sessions s
            LEFT JOIN bills b ON s.id = b.session_id
            WHERE s.group_id = $1
            GROUP BY s.id
            ORDER BY s.session_date DESC
            "#,
        )
        .bind(group_id)
        .fetch_all(&self.pool)
        .await?;

        // Get member totals (paid and owed) across all sessions in this group
        #[derive(sqlx::FromRow)]
        struct MemberTotalRow {
            user_id: Uuid,
            total_paid: Decimal,
            total_owed: Decimal,
        }

        let member_totals: Vec<MemberTotalRow> = sqlx::query_as(
            r#"
            WITH group_sessions AS (
                SELECT id FROM sessions WHERE group_id = $1
            ),
            payments AS (
                SELECT 
                    sp.user_id,
                    COALESCE(SUM(bp.amount_paid), 0) as total_paid
                FROM session_participants sp
                JOIN group_sessions gs ON sp.session_id = gs.id
                LEFT JOIN bill_payers bp ON bp.participant_id = sp.id
                WHERE sp.user_id IS NOT NULL
                GROUP BY sp.user_id
            ),
            splits AS (
                SELECT 
                    sp.user_id,
                    COALESCE(SUM(bs.amount_owed), 0) as total_owed
                FROM session_participants sp
                JOIN group_sessions gs ON sp.session_id = gs.id
                LEFT JOIN bill_splits bs ON bs.participant_id = sp.id
                WHERE sp.user_id IS NOT NULL
                GROUP BY sp.user_id
            )
            SELECT 
                COALESCE(p.user_id, s.user_id) as user_id,
                COALESCE(p.total_paid, 0) as total_paid,
                COALESCE(s.total_owed, 0) as total_owed
            FROM payments p
            FULL OUTER JOIN splits s ON p.user_id = s.user_id
            "#,
        )
        .bind(group_id)
        .fetch_all(&self.pool)
        .await?;

        let totals_map: HashMap<Uuid, (Decimal, Decimal)> = member_totals
            .into_iter()
            .map(|r| (r.user_id, (r.total_paid, r.total_owed)))
            .collect();

        // Build member debt list
        let member_debts: Vec<GroupMemberDebt> = members
            .iter()
            .map(|m| {
                let (total_paid, total_owed) = totals_map
                    .get(&m.user_id)
                    .cloned()
                    .unwrap_or((Decimal::ZERO, Decimal::ZERO));
                GroupMemberDebt {
                    user_id: m.user_id,
                    name: m.full_name.clone(),
                    total_paid,
                    total_owed,
                    balance: total_paid - total_owed,
                }
            })
            .collect();

        // Get per-session amounts for each member
        let mut session_debts: Vec<GroupSessionDebt> = Vec::new();

        // Batched loading of session details
        let session_ids: Vec<Uuid> = sessions.iter().map(|s| s.id).collect();

        // Batch get payers
        #[derive(sqlx::FromRow)]
        struct BatchPayerRow {
            session_id: Uuid,
            user_id: Uuid,
            name: String,
            amount_paid: Decimal,
        }

        let all_payers: Vec<BatchPayerRow> = sqlx::query_as(
            r#"
            SELECT 
                sp.session_id,
                sp.user_id,
                COALESCE(u.full_name, 'Unknown') as name,
                COALESCE(SUM(bp.amount_paid), 0) as amount_paid
            FROM session_participants sp
            JOIN bill_payers bp ON bp.participant_id = sp.id
            JOIN bills b ON bp.bill_id = b.id AND b.session_id = sp.session_id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE sp.session_id = ANY($1) AND sp.user_id IS NOT NULL
            GROUP BY sp.session_id, sp.user_id, u.full_name
            HAVING SUM(bp.amount_paid) > 0
            "#,
        )
        .bind(&session_ids)
        .fetch_all(&self.pool)
        .await?;

        // Batch get member amounts (owed)
        #[derive(sqlx::FromRow)]
        struct BatchMemberAmountRow {
            session_id: Uuid,
            user_id: Uuid,
            amount_owed: Decimal,
        }

        let all_member_amounts: Vec<BatchMemberAmountRow> = sqlx::query_as(
            r#"
            SELECT 
                sp.session_id,
                sp.user_id,
                COALESCE(SUM(bs.amount_owed), 0) as amount_owed
            FROM session_participants sp
            LEFT JOIN bill_splits bs ON bs.participant_id = sp.id
            WHERE sp.session_id = ANY($1) AND sp.user_id IS NOT NULL
            GROUP BY sp.session_id, sp.user_id
            "#,
        )
        .bind(&session_ids)
        .fetch_all(&self.pool)
        .await?;

        // Group by session_id in maps
        let mut payers_map: HashMap<Uuid, Vec<BatchPayerRow>> = HashMap::new();
        for p in all_payers {
            payers_map.entry(p.session_id).or_default().push(p);
        }

        let mut member_amounts_map: HashMap<Uuid, Vec<BatchMemberAmountRow>> = HashMap::new();
        for m in all_member_amounts {
            member_amounts_map.entry(m.session_id).or_default().push(m);
        }

        for session in sessions {
            let payers = payers_map.remove(&session.id).unwrap_or_default();
            let member_amounts = member_amounts_map.remove(&session.id).unwrap_or_default();

            session_debts.push(GroupSessionDebt {
                session_id: session.id,
                session_name: session.name,
                session_date: session.session_date,
                total_amount: session.total_amount,
                payers: payers
                    .into_iter()
                    .map(|r| SessionPayer {
                        user_id: r.user_id,
                        name: r.name,
                        amount_paid: r.amount_paid,
                    })
                    .collect(),
                member_amounts: member_amounts
                    .into_iter()
                    .map(|r| MemberSessionAmount {
                        user_id: r.user_id,
                        amount_owed: r.amount_owed,
                    })
                    .collect(),
            });
        }

        Ok(GroupDebtSummary {
            group_id,
            group_name: group_name.to_string(),
            members: member_debts,
            sessions: session_debts,
        })
    }
}
