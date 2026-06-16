use axum::{extract::State, Json};

use crate::api::feature_flags::require_feature_enabled;
use crate::api::notifications_dto::{
    MessageResponse, PushSubscriptionRequest, PushSubscriptionResponse, TestPushRequest,
    UnsubscribePushRequest,
};
use crate::api::response::{ok, ApiResponse};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub async fn subscribe_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<PushSubscriptionRequest>,
) -> Result<Json<ApiResponse<PushSubscriptionResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    sqlx::query(
        r#"
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, endpoint)
        DO UPDATE SET
            p256dh_key = EXCLUDED.p256dh_key,
            auth_key = EXCLUDED.auth_key,
            updated_at = NOW()
        "#,
    )
    .bind(auth_user.user_id)
    .bind(&payload.endpoint)
    .bind(&payload.keys.p256dh)
    .bind(&payload.keys.auth)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO notification_preferences (user_id, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
        "#,
    )
    .bind(auth_user.user_id)
    .execute(&state.pool)
    .await?;

    Ok(ok(PushSubscriptionResponse {
        message: "Push subscription registered successfully".to_string(),
    }))
}

pub async fn unsubscribe_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UnsubscribePushRequest>,
) -> Result<Json<ApiResponse<PushSubscriptionResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    sqlx::query(
        r#"
        DELETE FROM push_subscriptions
        WHERE user_id = $1 AND endpoint = $2
        "#,
    )
    .bind(auth_user.user_id)
    .bind(&payload.endpoint)
    .execute(&state.pool)
    .await?;

    Ok(ok(PushSubscriptionResponse {
        message: "Push subscription removed successfully".to_string(),
    }))
}

pub async fn send_test_push(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<TestPushRequest>,
) -> Result<Json<ApiResponse<MessageResponse>>, AppError> {
    require_feature_enabled(&state, "notifications").await?;

    let count = state
        .push_service
        .send_notification(
            auth_user.user_id,
            &payload.title,
            &payload.body,
            Some("/"),
            None,
        )
        .await?;

    Ok(ok(MessageResponse {
        message: format!("Sent push notification to {} devices", count),
    }))
}
