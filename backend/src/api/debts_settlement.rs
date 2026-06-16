use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::api::debts_dto::SettleResponse;
use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::sessions::authz::{
    require_debt_confirmer, require_debt_requester, require_guest_debt_settler,
};
use crate::api::ws::WsEvent;
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::debt_repo::DebtRepository;
use crate::repository::session_repo::SessionRepository;

pub async fn request_settle(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    require_feature_enabled(&state, "debts").await?;

    let repo = DebtRepository::new(state.pool.clone());

    require_debt_requester(&state.pool, &auth_user, debt_id).await?;
    let debt = repo.request_settlement(debt_id, auth_user.user_id).await?;

    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Settlement request sent. Waiting for creditor confirmation.".to_string(),
    }))
}

pub async fn confirm_settle(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    require_feature_enabled(&state, "debts").await?;

    tracing::info!(
        "Confirm settlement request: debt_id={}, user_id={}",
        debt_id,
        auth_user.user_id
    );
    let repo = DebtRepository::new(state.pool.clone());

    require_debt_confirmer(&state.pool, &auth_user, debt_id).await?;
    let debt = match repo.confirm_settlement(debt_id, auth_user.user_id).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!(
                "Failed to confirm settlement: debt_id={}, user_id={}, error={:?}",
                debt_id,
                auth_user.user_id,
                e
            );
            return Err(e);
        }
    };

    if let Ok(true) = auto_archive_if_settled(&state.pool, debt.session_id).await {
        state
            .ws_manager
            .broadcast_to_session(
                debt.session_id,
                WsEvent::SessionStatusChanged {
                    session_id: debt.session_id,
                    status: "ARCHIVED".to_string(),
                },
            )
            .await;
    }

    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    let debt_details: Option<(Uuid, String, String, Decimal)> = sqlx::query_as(
        r#"
        SELECT
            d.debtor_id,
            COALESCE(u.full_name, sp.guest_name, 'Unknown') as creditor_name,
            s.name as session_name,
            d.amount
        FROM debts d
        JOIN sessions s ON d.session_id = s.id
        LEFT JOIN session_participants sp ON d.creditor_id = sp.id
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE d.id = $1
        "#,
    )
    .bind(debt_id)
    .fetch_optional(&state.pool)
    .await?;

    if let Some((debtor_id, creditor_name, session_name, amount)) = debt_details {
        let debtor_user_id: Option<Uuid> =
            sqlx::query_scalar("SELECT user_id FROM session_participants WHERE id = $1")
                .bind(debtor_id)
                .fetch_optional(&state.pool)
                .await?
                .flatten();

        if let Some(user_id) = debtor_user_id {
            let prefs_enabled: bool = sqlx::query_scalar(
                r#"
                SELECT COALESCE(settlement_notifications, true)
                FROM notification_preferences
                WHERE user_id = $1
                "#,
            )
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await?
            .unwrap_or(true);

            if prefs_enabled {
                let notification_id = uuid::Uuid::new_v4();
                sqlx::query(
                    r#"
                    INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
                    VALUES ($1, $2, 'settlement_confirmed', $3, $4, $5, false, NOW())
                    "#,
                )
                .bind(notification_id)
                .bind(user_id)
                .bind("Thanh toán đã được xác nhận".to_string())
                .bind(format!(
                    "{} đã xác nhận thanh toán {} VND từ session '{}'",
                    creditor_name, amount, session_name
                ))
                .bind(serde_json::json!({
                    "debt_id": debt_id,
                    "session_id": debt.session_id,
                    "session_name": session_name,
                    "creditor_name": creditor_name,
                    "amount": amount.to_string()
                }))
                .execute(&state.pool)
                .await?;

                state
                    .ws_manager
                    .send_to_user(
                        user_id,
                        WsEvent::NotificationReceived {
                            notification_id,
                            title: "Thanh toán đã được xác nhận".to_string(),
                            notification_type: "settlement_confirmed".to_string(),
                        },
                    )
                    .await;
            }
        }
    }

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Settlement confirmed. Debt has been cleared.".to_string(),
    }))
}

pub async fn settle_guest_debt(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(debt_id): Path<Uuid>,
) -> Result<Json<ApiResponse<SettleResponse>>, AppError> {
    require_feature_enabled(&state, "debts").await?;

    let repo = DebtRepository::new(state.pool.clone());

    let session_id = require_guest_debt_settler(&state.pool, &auth_user, debt_id).await?;
    let debt = repo.settle_guest_debt_as_session_manager(debt_id).await?;

    AuditLogBuilder::new(AuditAction::GuestSettlement, AuditEntityType::Debt)
        .user(auth_user.user_id, None)
        .entity_id(debt.id)
        .metadata(serde_json::json!({
            "session_id": session_id,
            "amount": debt.amount.to_string(),
            "debtor_id": debt.debtor_id,
            "creditor_id": debt.creditor_id
        }))
        .log(&state.pool)
        .await
        .ok();

    if let Ok(true) = auto_archive_if_settled(&state.pool, session_id).await {
        state
            .ws_manager
            .broadcast_to_session(
                session_id,
                WsEvent::SessionStatusChanged {
                    session_id,
                    status: "ARCHIVED".to_string(),
                },
            )
            .await;
    }

    state
        .ws_manager
        .broadcast_to_session(
            debt.session_id,
            WsEvent::DebtUpdated {
                session_id: debt.session_id,
                debt_id: debt.id,
            },
        )
        .await;

    Ok(ok(SettleResponse {
        debt_id: debt.id,
        status: debt.status,
        message: "Guest debt has been settled.".to_string(),
    }))
}

async fn auto_archive_if_settled(pool: &sqlx::PgPool, session_id: Uuid) -> Result<bool, AppError> {
    #[derive(sqlx::FromRow)]
    struct DebtCountRow {
        total: i64,
        unsettled: i64,
    }

    let counts: DebtCountRow = sqlx::query_as(
        r#"
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status != 'settled') as unsettled
        FROM debts
        WHERE session_id = $1
        "#,
    )
    .bind(session_id)
    .fetch_one(pool)
    .await?;

    if counts.total > 0 && counts.unsettled == 0 {
        let repo = SessionRepository::new(pool.clone());
        let _ = repo.set_archived(session_id, true).await?;
        return Ok(true);
    }

    Ok(false)
}
