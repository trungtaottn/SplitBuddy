use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde_json::Value;
use sqlx::PgPool;

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct ResolvedRate {
    pub rate: Decimal,
    pub source: String,
    pub timestamp: DateTime<Utc>,
    #[allow(dead_code)]
    pub rate_date: NaiveDate,
}

pub fn normalize_currency(code: &str) -> Result<String, AppError> {
    let trimmed = code.trim().to_uppercase();
    if trimmed.len() != 3 {
        return Err(AppError::Validation {
            field: "currency_code".to_string(),
            message: "currency_code must be a 3-letter ISO code".to_string(),
        });
    }
    Ok(trimmed)
}

pub async fn resolve_exchange_rate(
    pool: &PgPool,
    client: &reqwest::Client,
    from_currency: &str,
    to_currency: &str,
    override_rate: Option<Decimal>,
) -> Result<ResolvedRate, AppError> {
    let from = normalize_currency(from_currency)?;
    let to = normalize_currency(to_currency)?;
    let now = Utc::now();
    let rate_date = now.date_naive();

    if from == to {
        return Ok(ResolvedRate {
            rate: Decimal::ONE,
            source: "base".to_string(),
            timestamp: now,
            rate_date,
        });
    }

    if let Some(rate) = override_rate {
        if rate <= Decimal::ZERO {
            return Err(AppError::Validation {
                field: "exchange_rate".to_string(),
                message: "exchange_rate must be greater than 0".to_string(),
            });
        }

        return Ok(ResolvedRate {
            rate,
            source: "manual".to_string(),
            timestamp: now,
            rate_date,
        });
    }

    if let Some(cached) = get_cached_rate(pool, &from, &to, rate_date).await? {
        return Ok(cached);
    }

    let rate = fetch_rate_from_provider(client, &from, &to).await?;
    store_rate(pool, &from, &to, rate, rate_date, "exchangerate.host").await?;

    Ok(ResolvedRate {
        rate,
        source: "exchangerate.host".to_string(),
        timestamp: now,
        rate_date,
    })
}

async fn get_cached_rate(
    pool: &PgPool,
    from: &str,
    to: &str,
    rate_date: NaiveDate,
) -> Result<Option<ResolvedRate>, AppError> {
    #[derive(sqlx::FromRow)]
    struct RateRow {
        rate: Decimal,
        rate_source: String,
        created_at: DateTime<Utc>,
    }

    let row = sqlx::query_as!(
        RateRow,
        r#"
        SELECT rate, rate_source, created_at
        FROM exchange_rates
        WHERE base_currency = $1
          AND quote_currency = $2
          AND rate_date = $3
          AND rate_source = 'exchangerate.host'
        LIMIT 1
        "#,
        from,
        to,
        rate_date
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| ResolvedRate {
        rate: r.rate,
        source: r.rate_source,
        timestamp: r.created_at,
        rate_date,
    }))
}

async fn fetch_rate_from_provider(
    client: &reqwest::Client,
    from: &str,
    to: &str,
) -> Result<Decimal, AppError> {
    let url = format!(
        "https://api.exchangerate.host/convert?from={}&to={}",
        from, to
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("FX request failed: {}", e)))?;

    let json: Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("FX response parse failed: {}", e)))?;

    let rate = json["info"]["rate"]
        .as_f64()
        .or_else(|| json["result"].as_f64())
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("FX response missing rate")))?;

    Decimal::from_f64_retain(rate)
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("FX response contained invalid rate")))
}

async fn store_rate(
    pool: &PgPool,
    from: &str,
    to: &str,
    rate: Decimal,
    rate_date: NaiveDate,
    source: &str,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"
        INSERT INTO exchange_rates (base_currency, quote_currency, rate, rate_date, rate_source)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        "#,
        from,
        to,
        rate,
        rate_date,
        source
    )
    .execute(pool)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_currency_trims_and_uppercases() {
        let code = normalize_currency(" vnd ").unwrap();
        assert_eq!(code, "VND");
    }

    #[test]
    fn test_normalize_currency_invalid_length() {
        let err = normalize_currency("usd1").err().unwrap();
        match err {
            AppError::Validation { field, .. } => {
                assert_eq!(field, "currency_code");
            }
            _ => panic!("Expected validation error"),
        }
    }
}
