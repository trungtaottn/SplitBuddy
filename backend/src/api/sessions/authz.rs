use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn require_active_session_participant(
    pool: &PgPool,
    auth_user: &AuthUser,
    session_id: Uuid,
) -> Result<(), AppError> {
    if auth_user.role == "admin" {
        require_active_session(pool, session_id).await?;
        return Ok(());
    }

    let allowed: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM session_participants sp
            JOIN sessions s ON s.id = sp.session_id
            WHERE sp.session_id = $1
              AND sp.user_id = $2
              AND sp.is_active = true
              AND s.status = 'active'
        )
        "#,
    )
    .bind(session_id)
    .bind(auth_user.user_id)
    .fetch_one(pool)
    .await?;

    if allowed {
        Ok(())
    } else {
        Err(AppError::Forbidden {
            message: "Active session participant access required".to_string(),
        })
    }
}

pub async fn require_session_participant_or_admin(
    pool: &PgPool,
    auth_user: &AuthUser,
    session_id: Uuid,
) -> Result<(), AppError> {
    if auth_user.role == "admin" {
        require_session_exists(pool, session_id).await?;
        return Ok(());
    }

    let allowed: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM session_participants
            WHERE session_id = $1
              AND user_id = $2
              AND is_active = true
        )
        "#,
    )
    .bind(session_id)
    .bind(auth_user.user_id)
    .fetch_one(pool)
    .await?;

    if allowed {
        Ok(())
    } else {
        Err(AppError::Forbidden {
            message: "Session participant or admin access required".to_string(),
        })
    }
}

pub async fn require_session_owner_or_admin(
    pool: &PgPool,
    auth_user: &AuthUser,
    session_id: Uuid,
) -> Result<(), AppError> {
    let session_created_by: Option<Uuid> =
        sqlx::query_scalar("SELECT created_by FROM sessions WHERE id = $1")
            .bind(session_id)
            .fetch_optional(pool)
            .await?;

    let session_created_by = session_created_by.ok_or(AppError::SessionNotFound { session_id })?;
    if can_manage_session(auth_user, session_created_by) {
        Ok(())
    } else {
        Err(AppError::Forbidden {
            message: "Session owner or admin access required".to_string(),
        })
    }
}

pub async fn require_bill_mutator(
    pool: &PgPool,
    auth_user: &AuthUser,
    session_id: Uuid,
    bill_id: Uuid,
) -> Result<(), AppError> {
    let meta: Option<BillMutationMeta> = sqlx::query_as(
        r#"
        SELECT
            b.created_by as bill_created_by,
            s.created_by as session_created_by,
            s.status::text as session_status
        FROM bills b
        JOIN sessions s ON s.id = b.session_id
        WHERE b.id = $1 AND b.session_id = $2
        "#,
    )
    .bind(bill_id)
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    let meta = meta.ok_or(AppError::BillNotFound { bill_id })?;
    if can_mutate_bill(
        auth_user,
        meta.bill_created_by,
        meta.session_created_by,
        meta.session_status.as_str(),
    ) {
        Ok(())
    } else {
        Err(AppError::Forbidden {
            message: "Bill creator, session owner, or admin access required for active sessions"
                .to_string(),
        })
    }
}

pub async fn require_guest_debt_settler(
    pool: &PgPool,
    auth_user: &AuthUser,
    debt_id: Uuid,
) -> Result<Uuid, AppError> {
    let meta: Option<GuestDebtMeta> = sqlx::query_as(
        r#"
        SELECT
            d.session_id,
            s.created_by as session_created_by,
            debtor_sp.user_id IS NULL as is_guest_debtor
        FROM debts d
        JOIN sessions s ON s.id = d.session_id
        JOIN session_participants debtor_sp ON debtor_sp.id = d.debtor_id
        WHERE d.id = $1
        "#,
    )
    .bind(debt_id)
    .fetch_optional(pool)
    .await?;

    let meta = meta.ok_or(AppError::NotFound("Debt not found".to_string()))?;
    if meta.is_guest_debtor && can_manage_session(auth_user, meta.session_created_by) {
        Ok(meta.session_id)
    } else {
        Err(AppError::Forbidden {
            message: "Session owner or admin access required to settle guest debts".to_string(),
        })
    }
}

pub async fn require_debt_requester(
    pool: &PgPool,
    auth_user: &AuthUser,
    debt_id: Uuid,
) -> Result<Uuid, AppError> {
    let meta = fetch_debt_party_meta(pool, debt_id).await?;
    if is_debt_requester(auth_user, meta.debtor_user_id) {
        Ok(meta.session_id)
    } else {
        Err(AppError::Forbidden {
            message: "Debt debtor access required to request settlement".to_string(),
        })
    }
}

pub async fn require_debt_confirmer(
    pool: &PgPool,
    auth_user: &AuthUser,
    debt_id: Uuid,
) -> Result<Uuid, AppError> {
    let meta = fetch_debt_party_meta(pool, debt_id).await?;
    if is_debt_confirmer(auth_user, meta.creditor_user_id) {
        Ok(meta.session_id)
    } else {
        Err(AppError::Forbidden {
            message: "Debt creditor access required to confirm settlement".to_string(),
        })
    }
}

async fn require_active_session(pool: &PgPool, session_id: Uuid) -> Result<(), AppError> {
    let status: Option<String> =
        sqlx::query_scalar("SELECT status::text FROM sessions WHERE id = $1")
            .bind(session_id)
            .fetch_optional(pool)
            .await?;

    match status.as_deref() {
        Some("active") => Ok(()),
        Some(_) => Err(AppError::Forbidden {
            message: "Session is not active".to_string(),
        }),
        None => Err(AppError::SessionNotFound { session_id }),
    }
}

async fn require_session_exists(pool: &PgPool, session_id: Uuid) -> Result<(), AppError> {
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1)")
        .bind(session_id)
        .fetch_one(pool)
        .await?;

    if exists {
        Ok(())
    } else {
        Err(AppError::SessionNotFound { session_id })
    }
}

#[derive(sqlx::FromRow)]
struct BillMutationMeta {
    bill_created_by: Uuid,
    session_created_by: Uuid,
    session_status: String,
}

#[derive(sqlx::FromRow)]
struct GuestDebtMeta {
    session_id: Uuid,
    session_created_by: Uuid,
    is_guest_debtor: bool,
}

#[derive(sqlx::FromRow)]
struct DebtPartyMeta {
    session_id: Uuid,
    debtor_user_id: Option<Uuid>,
    creditor_user_id: Option<Uuid>,
}

async fn fetch_debt_party_meta(pool: &PgPool, debt_id: Uuid) -> Result<DebtPartyMeta, AppError> {
    sqlx::query_as(
        r#"
        SELECT
            d.session_id,
            debtor_sp.user_id as debtor_user_id,
            creditor_sp.user_id as creditor_user_id
        FROM debts d
        JOIN session_participants debtor_sp ON debtor_sp.id = d.debtor_id
        JOIN session_participants creditor_sp ON creditor_sp.id = d.creditor_id
        WHERE d.id = $1
        "#,
    )
    .bind(debt_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound("Debt not found".to_string()))
}

fn can_mutate_bill(
    auth_user: &AuthUser,
    bill_created_by: Uuid,
    session_created_by: Uuid,
    session_status: &str,
) -> bool {
    session_status == "active"
        && (auth_user.role == "admin"
            || auth_user.user_id == bill_created_by
            || auth_user.user_id == session_created_by)
}

fn can_manage_session(auth_user: &AuthUser, session_created_by: Uuid) -> bool {
    auth_user.role == "admin" || auth_user.user_id == session_created_by
}

fn is_debt_requester(auth_user: &AuthUser, debtor_user_id: Option<Uuid>) -> bool {
    debtor_user_id == Some(auth_user.user_id)
}

fn is_debt_confirmer(auth_user: &AuthUser, creditor_user_id: Option<Uuid>) -> bool {
    creditor_user_id == Some(auth_user.user_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn auth_user(user_id: Uuid, role: &str) -> AuthUser {
        AuthUser {
            user_id,
            role: role.to_string(),
        }
    }

    #[test]
    fn bill_creator_owner_or_admin_can_mutate_active_bill() {
        let bill_creator = Uuid::new_v4();
        let session_owner = Uuid::new_v4();
        let admin = auth_user(Uuid::new_v4(), "admin");

        assert!(can_mutate_bill(
            &auth_user(bill_creator, "user"),
            bill_creator,
            session_owner,
            "active"
        ));
        assert!(can_mutate_bill(
            &auth_user(session_owner, "user"),
            bill_creator,
            session_owner,
            "active"
        ));
        assert!(can_mutate_bill(
            &admin,
            bill_creator,
            session_owner,
            "active"
        ));
    }

    #[test]
    fn participant_cannot_mutate_another_participants_bill() {
        let bill_creator = Uuid::new_v4();
        let session_owner = Uuid::new_v4();
        let participant = auth_user(Uuid::new_v4(), "user");

        assert!(!can_mutate_bill(
            &participant,
            bill_creator,
            session_owner,
            "active"
        ));
    }

    #[test]
    fn closed_session_blocks_bill_creator_owner_and_admin() {
        let bill_creator = Uuid::new_v4();
        let session_owner = Uuid::new_v4();
        let admin = auth_user(Uuid::new_v4(), "admin");

        assert!(!can_mutate_bill(
            &auth_user(bill_creator, "user"),
            bill_creator,
            session_owner,
            "closed"
        ));
        assert!(!can_mutate_bill(
            &auth_user(session_owner, "user"),
            bill_creator,
            session_owner,
            "closed"
        ));
        assert!(!can_mutate_bill(
            &admin,
            bill_creator,
            session_owner,
            "closed"
        ));
    }

    #[test]
    fn only_session_owner_or_admin_can_manage_session() {
        let session_owner = Uuid::new_v4();
        let participant = auth_user(Uuid::new_v4(), "user");

        assert!(can_manage_session(
            &auth_user(session_owner, "user"),
            session_owner
        ));
        assert!(can_manage_session(
            &auth_user(Uuid::new_v4(), "admin"),
            session_owner
        ));
        assert!(!can_manage_session(&participant, session_owner));
    }

    #[test]
    fn guest_debt_settlement_uses_session_management_rule() {
        let session_owner = Uuid::new_v4();
        let participant = auth_user(Uuid::new_v4(), "user");

        assert!(can_manage_session(
            &auth_user(session_owner, "user"),
            session_owner
        ));
        assert!(can_manage_session(
            &auth_user(Uuid::new_v4(), "admin"),
            session_owner
        ));
        assert!(!can_manage_session(&participant, session_owner));
    }

    #[test]
    fn debt_request_and_confirm_are_party_scoped() {
        let debtor = Uuid::new_v4();
        let creditor = Uuid::new_v4();
        let stranger = auth_user(Uuid::new_v4(), "user");

        assert!(is_debt_requester(&auth_user(debtor, "user"), Some(debtor)));
        assert!(!is_debt_requester(&stranger, Some(debtor)));
        assert!(is_debt_confirmer(
            &auth_user(creditor, "user"),
            Some(creditor)
        ));
        assert!(!is_debt_confirmer(&stranger, Some(creditor)));
    }
}
