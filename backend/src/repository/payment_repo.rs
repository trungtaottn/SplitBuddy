use crate::error::AppError;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PaymentTransaction {
    pub id: Uuid,
    pub payer_id: Uuid,
    pub payee_id: Uuid,
    pub amount: Decimal,
    pub currency: String,
    pub status: String, // pending, completed, rejected, verified
    pub method: String, // cash, bank_transfer, vietqr
    pub proof_image_url: Option<String>,
    pub reference_code: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentDto {
    pub payer_id: Uuid,
    pub payee_id: Uuid,
    pub amount: Decimal,
    pub currency: Option<String>,
    pub method: Option<String>,
    pub proof_image_url: Option<String>,
    pub reference_code: Option<String>,
    pub notes: Option<String>,
}

pub struct PaymentRepository {
    pool: PgPool,
}

impl PaymentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_transaction(
        &self,
        dto: CreatePaymentDto,
    ) -> Result<PaymentTransaction, AppError> {
        let transaction = sqlx::query_as::<_, PaymentTransaction>(
            r#"
            INSERT INTO payment_transactions (
                payer_id, payee_id, amount, currency, method, 
                proof_image_url, reference_code, notes, status
            )
            VALUES ($1, $2, $3, COALESCE($4, 'VND'), COALESCE($5, 'cash'), $6, $7, $8, 'pending')
            RETURNING *
            "#,
        )
        .bind(dto.payer_id)
        .bind(dto.payee_id)
        .bind(dto.amount)
        .bind(dto.currency)
        .bind(dto.method)
        .bind(dto.proof_image_url)
        .bind(dto.reference_code)
        .bind(dto.notes)
        .fetch_one(&self.pool)
        .await?;

        Ok(transaction)
    }

    pub async fn get_transaction(&self, id: Uuid) -> Result<Option<PaymentTransaction>, AppError> {
        let transaction = sqlx::query_as::<_, PaymentTransaction>(
            "SELECT * FROM payment_transactions WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(transaction)
    }

    #[allow(dead_code)]
    pub async fn update_status(
        &self,
        id: Uuid,
        status: &str,
    ) -> Result<PaymentTransaction, AppError> {
        let transaction = sqlx::query_as::<_, PaymentTransaction>(
            r#"
            UPDATE payment_transactions 
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(status)
        .fetch_one(&self.pool)
        .await?;

        Ok(transaction)
    }

    pub async fn get_user_transactions(
        &self,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<PaymentTransaction>, AppError> {
        let transactions = sqlx::query_as::<_, PaymentTransaction>(
            r#"
            SELECT * FROM payment_transactions 
            WHERE payer_id = $1 OR payee_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(transactions)
    }
}
