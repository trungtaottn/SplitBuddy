use crate::error::AppError;
use serde::Serialize;
use sqlx::PgPool;
use std::env;
use uuid::Uuid;
use web_push::{
    ContentEncoding, IsahcWebPushClient, SubscriptionInfo, VapidSignatureBuilder, WebPushClient,
    WebPushMessageBuilder,
};

#[derive(Serialize)]
struct PushPayload {
    title: String,
    body: String,
    url: Option<String>,
    data: Option<serde_json::Value>,
}

#[derive(Debug, sqlx::FromRow)]
struct PushSubscriptionRow {
    endpoint: String,
    p256dh_key: String,
    auth_key: String,
}

pub struct PushService {
    pool: PgPool,
}

impl PushService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Send a push notification to a specific user
    pub async fn send_notification(
        &self,
        user_id: Uuid,
        title: &str,
        body: &str,
        url: Option<&str>,
        data: Option<serde_json::Value>,
    ) -> Result<usize, AppError> {
        let client = IsahcWebPushClient::new().map_err(|e| {
            AppError::Internal(anyhow::anyhow!("Failed to create WebPushClient: {}", e))
        })?;

        // 1. Get subscriptions for user
        let subscriptions: Vec<PushSubscriptionRow> = sqlx::query_as(
            r#"
            SELECT endpoint, p256dh_key, auth_key
            FROM push_subscriptions
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        if subscriptions.is_empty() {
            return Ok(0);
        }

        // 2. Prepare payload
        let payload = serde_json::to_string(&PushPayload {
            title: title.to_string(),
            body: body.to_string(),
            url: url.map(|s| s.to_string()),
            data,
        })
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Payload serialization error: {}", e)))?;

        // 3. Get VAPID keys from env
        let vapid_private_key = env::var("VAPID_PRIVATE_KEY").map_err(|_| {
            AppError::Internal(anyhow::anyhow!("Missing VAPID_PRIVATE_KEY".to_string()))
        })?;
        // Public key is not needed for signing, only for frontend subscription.

        let vapid_subject =
            env::var("VAPID_SUBJECT").unwrap_or_else(|_| "mailto:admin@splitbuddy.com".to_string());

        // 4. Send to all subscriptions
        let mut success_count = 0;

        for sub in subscriptions {
            let subscription_info = SubscriptionInfo {
                endpoint: sub.endpoint.clone(),
                keys: web_push::SubscriptionKeys {
                    p256dh: sub.p256dh_key.clone(),
                    auth: sub.auth_key.clone(),
                },
            };

            let mut builder = WebPushMessageBuilder::new(&subscription_info);

            builder.set_payload(ContentEncoding::Aes128Gcm, payload.as_bytes());
            // Set TTL (Time To Live) - default 12 hours
            builder.set_ttl(12 * 60 * 60);

            // Sign with VAPID
            let mut sig_builder = VapidSignatureBuilder::from_base64(
                &vapid_private_key,
                web_push::URL_SAFE_NO_PAD,
                &subscription_info,
            )
            .expect("Failed to create VAPID signature builder");

            sig_builder.add_claim("sub", vapid_subject.clone());

            let signature = sig_builder
                .build()
                .map_err(|e| AppError::Internal(anyhow::anyhow!("VAPID signing error: {}", e)))?;

            builder.set_vapid_signature(signature);

            match client
                .send(builder.build().expect("Failed to build message"))
                .await
            {
                Ok(_) => {
                    success_count += 1;
                }
                Err(e) => {
                    tracing::warn!(
                        "Failed to send push to subscription {}: {:?}",
                        sub.endpoint,
                        e
                    );
                    // Optionally remove invalid subscription here
                    if format!("{:?}", e).contains("StatusCode: 410")
                        || format!("{:?}", e).contains("StatusCode: 404")
                    {
                        let _ = sqlx::query("DELETE FROM push_subscriptions WHERE endpoint = $1")
                            .bind(&sub.endpoint)
                            .execute(&self.pool)
                            .await;
                    }
                }
            }
        }

        Ok(success_count)
    }
}
