use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::sessions::{ParticipantBalance, WhoPaysNextResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

pub(super) async fn who_pays_next(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<Json<ApiResponse<WhoPaysNextResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    #[derive(sqlx::FromRow)]
    struct BalanceRow {
        participant_id: Uuid,
        name: String,
        total_paid: Decimal,
        total_owed: Decimal,
    }

    let rows: Vec<BalanceRow> = sqlx::query_as(
        r#"
        SELECT
            sp.id as participant_id,
            COALESCE(u.full_name, sp.guest_name, 'Unknown') as name,
            COALESCE(SUM(bp.amount_paid), 0) as total_paid,
            COALESCE(SUM(bs.amount_owed), 0) as total_owed
        FROM session_participants sp
        LEFT JOIN users u ON sp.user_id = u.id
        LEFT JOIN bill_payers bp ON bp.participant_id = sp.id
        LEFT JOIN bill_splits bs ON bs.participant_id = sp.id
        WHERE sp.session_id = $1
          AND sp.is_active = true
        GROUP BY sp.id, u.full_name, sp.guest_name
        "#,
    )
    .bind(session_id)
    .fetch_all(&state.pool)
    .await?;

    let mut balances: Vec<ParticipantBalance> = rows
        .into_iter()
        .map(|row| ParticipantBalance {
            participant_id: row.participant_id,
            name: row.name,
            total_paid: row.total_paid,
            total_owed: row.total_owed,
            balance: row.total_paid - row.total_owed,
        })
        .collect();

    balances.sort_by_key(|a| a.balance);
    let suggested = balances.first().cloned();

    Ok(ok(WhoPaysNextResponse {
        suggested,
        balances,
    }))
}
