use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::feature_flags::require_feature_enabled;
use crate::api::response::{ok, ApiResponse};
use crate::api::sessions::{
    ImportCsvRequest, ImportPreviewResponse, ImportPreviewRow, ImportResultResponse, PayerInput,
    SplitDetailInput,
};
use crate::api::AppState;
use crate::audit::{AuditAction, AuditEntityType, AuditLogBuilder};
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::repository::session_repo::SessionRepository;

use super::authz::require_active_session_participant;
use super::import_export_csv::{build_csv_response, csv_escape};
use super::import_export_parser::parse_import_csv;

pub(super) async fn export_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let _session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let bills = repo.find_bills_with_details(session_id).await?;

    let mut csv_data = String::from(
        "Date,Description,Amount,Amount Original,Currency,Split Strategy,Payers,Payer Amounts,Participants,Participant Amounts\n",
    );

    for bill in bills {
        let payer_names = bill
            .payers
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let payer_amounts = bill
            .payers
            .iter()
            .map(|p| p.amount_paid.to_string())
            .collect::<Vec<_>>()
            .join(" | ");
        let participant_names = bill
            .participants
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let participant_amounts = bill
            .participants
            .iter()
            .map(|p| p.amount_owed.to_string())
            .collect::<Vec<_>>()
            .join(" | ");

        let row = [
            csv_escape(&bill.created_at.format("%Y-%m-%d").to_string()),
            csv_escape(&bill.description),
            csv_escape(&bill.amount.to_string()),
            csv_escape(&bill.amount_original.to_string()),
            csv_escape(&bill.currency_code),
            csv_escape(&bill.split_strategy),
            csv_escape(&payer_names),
            csv_escape(&payer_amounts),
            csv_escape(&participant_names),
            csv_escape(&participant_amounts),
        ]
        .join(",");

        csv_data.push_str(&row);
        csv_data.push('\n');
    }

    build_csv_response(csv_data, format!("session_{}.csv", session_id))
}

pub(super) async fn export_session_v2(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let _session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let bills = repo.find_bills_with_details(session_id).await?;

    let mut csv_data = String::from(
        "Date,Description,Amount,Amount Original,Currency,Split Strategy,Payers,Payer Amounts,Split Details\n",
    );

    for bill in bills {
        let payer_names = bill
            .payers
            .iter()
            .map(|p| p.name.clone())
            .collect::<Vec<_>>()
            .join(" | ");
        let payer_amounts = bill
            .payers
            .iter()
            .map(|p| p.amount_paid.to_string())
            .collect::<Vec<_>>()
            .join(" | ");
        let split_details = bill
            .participants
            .iter()
            .map(|p| format!("{}={}", p.name, p.amount_owed))
            .collect::<Vec<_>>()
            .join(" | ");

        let row = [
            csv_escape(&bill.created_at.format("%Y-%m-%d").to_string()),
            csv_escape(&bill.description),
            csv_escape(&bill.amount.to_string()),
            csv_escape(&bill.amount_original.to_string()),
            csv_escape(&bill.currency_code),
            csv_escape(&bill.split_strategy),
            csv_escape(&payer_names),
            csv_escape(&payer_amounts),
            csv_escape(&split_details),
        ]
        .join(",");

        csv_data.push_str(&row);
        csv_data.push('\n');
    }

    build_csv_response(csv_data, format!("session_{}_v2.csv", session_id))
}

pub(super) async fn import_session_preview(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<ImportCsvRequest>,
) -> Result<Json<ApiResponse<ImportPreviewResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    repo.verify_participant(session_id, auth_user.user_id)
        .await?;

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let (participant_map, id_to_name, duplicates) =
        build_participant_map(&state.pool, session_id).await?;
    if !duplicates.is_empty() {
        return Err(AppError::Validation {
            field: "participants".to_string(),
            message: format!(
                "Duplicate participant names found: {}",
                duplicates.join(", ")
            ),
        });
    }

    let (rows, errors) = parse_import_csv(&payload.csv, &session.base_currency, &participant_map);
    let preview_rows = rows
        .iter()
        .map(|row| ImportPreviewRow {
            row: row.row,
            description: row.description.clone(),
            amount: row.amount,
            currency_code: row.currency_code.clone(),
            split_strategy: row.split_strategy.clone(),
            payers: row
                .payer_ids
                .iter()
                .filter_map(|id| id_to_name.get(id).cloned())
                .collect(),
            participants: row
                .participant_ids
                .iter()
                .filter_map(|id| id_to_name.get(id).cloned())
                .collect(),
        })
        .collect::<Vec<_>>();

    Ok(ok(ImportPreviewResponse {
        total_rows: rows.len() + errors.len(),
        valid_rows: rows.len(),
        errors,
        rows: preview_rows,
    }))
}

pub(super) async fn import_session(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
    Json(payload): Json<ImportCsvRequest>,
) -> Result<Json<ApiResponse<ImportResultResponse>>, AppError> {
    require_feature_enabled(&state, "sessions").await?;

    let repo = SessionRepository::new(state.pool.clone());
    require_active_session_participant(&state.pool, &auth_user, session_id).await?;

    let session = repo
        .find_by_id_with_details(session_id, auth_user.user_id)
        .await?
        .ok_or(AppError::SessionNotFound { session_id })?;

    let (participant_map, _id_to_name, duplicates) =
        build_participant_map(&state.pool, session_id).await?;
    if !duplicates.is_empty() {
        return Err(AppError::Validation {
            field: "participants".to_string(),
            message: format!(
                "Duplicate participant names found: {}",
                duplicates.join(", ")
            ),
        });
    }

    let (rows, errors) = parse_import_csv(&payload.csv, &session.base_currency, &participant_map);

    if !errors.is_empty() {
        return Ok(ok(ImportResultResponse {
            created_count: 0,
            errors,
        }));
    }

    let mut created_count = 0;
    for row in rows {
        let mut payers = Vec::new();
        for (idx, participant_id) in row.payer_ids.iter().enumerate() {
            let amount = row.payer_amounts.get(idx).cloned().unwrap_or(Decimal::ZERO);
            payers.push(PayerInput {
                participant_id: *participant_id,
                amount,
            });
        }

        let split_details = row
            .participant_ids
            .iter()
            .enumerate()
            .map(|(idx, participant_id)| SplitDetailInput {
                participant_id: *participant_id,
                amount: row
                    .participant_amounts
                    .get(idx)
                    .cloned()
                    .unwrap_or(Decimal::ZERO),
            })
            .collect::<Vec<_>>();

        let split_strategy = if split_details.is_empty() {
            row.split_strategy.clone()
        } else {
            "CUSTOM".to_string()
        };

        let exchange_rate =
            if row.amount_original > Decimal::ZERO && row.currency_code != session.base_currency {
                row.amount / row.amount_original
            } else {
                Decimal::ONE
            };

        repo.create_bill(
            session_id,
            &row.description,
            row.amount,
            row.amount_original,
            &row.currency_code,
            exchange_rate,
            "import_csv",
            chrono::Utc::now(),
            &split_strategy,
            auth_user.user_id,
            &payers,
            if split_details.is_empty() {
                None
            } else {
                Some(split_details.as_slice())
            },
            None,
        )
        .await?;

        created_count += 1;
    }

    AuditLogBuilder::new(
        AuditAction::Custom("session_import_csv".to_string()),
        AuditEntityType::Session,
    )
    .user(auth_user.user_id, None)
    .entity_id(session_id)
    .metadata(serde_json::json!({
        "created_count": created_count,
        "total_rows": created_count,
    }))
    .log(&state.pool)
    .await
    .ok();

    Ok(ok(ImportResultResponse {
        created_count,
        errors: Vec::new(),
    }))
}

async fn build_participant_map(
    pool: &sqlx::PgPool,
    session_id: Uuid,
) -> Result<(HashMap<String, Uuid>, HashMap<Uuid, String>, Vec<String>), AppError> {
    #[derive(sqlx::FromRow)]
    struct ParticipantRow {
        id: Uuid,
        name: String,
    }

    let rows: Vec<ParticipantRow> = sqlx::query_as(
        r#"
        SELECT sp.id, COALESCE(u.full_name, sp.guest_name, 'Unknown') as name
        FROM session_participants sp
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sp.session_id = $1
        "#,
    )
    .bind(session_id)
    .fetch_all(pool)
    .await?;

    let mut map = HashMap::new();
    let mut id_to_name = HashMap::new();
    let mut duplicates = Vec::new();
    for row in rows {
        let key = row.name.to_lowercase();
        if let std::collections::hash_map::Entry::Vacant(entry) = map.entry(key) {
            entry.insert(row.id);
            id_to_name.insert(row.id, row.name);
        } else {
            duplicates.push(row.name);
        }
    }

    Ok((map, id_to_name, duplicates))
}
