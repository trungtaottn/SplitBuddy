use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::error::AppError;

pub async fn lock_session_debt_mutation(
    tx: &mut Transaction<'_, Postgres>,
    session_id: Uuid,
) -> Result<(), AppError> {
    let bytes = session_id.as_bytes();
    let key = i64::from_be_bytes([
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
    ]);

    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(key)
        .execute(&mut **tx)
        .await?;

    Ok(())
}
