use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::api::ws_types::{ConnectedUser, WsEvent, WsTransport};

const GLOBAL_CHANNEL: &str = "ws_global_events";
const USER_CHANNEL: &str = "ws_user_events";

pub async fn subscribe_global(
    client: redis::Client,
    tx: broadcast::Sender<(Uuid, WsEvent)>,
    connections: Arc<RwLock<HashMap<Uuid, ConnectedUser>>>,
) {
    #[allow(deprecated)]
    let conn = match client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            tracing::error!("Failed to connect to Redis for Pub/Sub: {}", e);
            return;
        }
    };

    let mut pubsub = conn.into_pubsub();
    if let Err(e) = pubsub.subscribe(GLOBAL_CHANNEL).await {
        tracing::error!("Failed to subscribe to Redis channel: {}", e);
        return;
    }

    tracing::info!("✅ Subscribed to Redis 'ws_global_events' channel");

    let mut stream = pubsub.on_message();
    while let Some(msg) = stream.next().await {
        let payload: String = match msg.get_payload::<String>() {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("Failed to get payload from Redis msg: {}", e);
                continue;
            }
        };

        match serde_json::from_str::<WsTransport>(&payload) {
            Ok(transport) => {
                let connections_guard = connections.read().await;
                for (user_id, user) in connections_guard.iter() {
                    if user.session_subscriptions.contains(&transport.session_id) {
                        let _ = tx.send((*user_id, transport.event.clone()));
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to deserialize WS Redis transport: {}", e);
            }
        }
    }
}

pub async fn subscribe_user(
    client: redis::Client,
    tx: broadcast::Sender<(Uuid, WsEvent)>,
    connections: Arc<RwLock<HashMap<Uuid, ConnectedUser>>>,
) {
    #[allow(deprecated)]
    let conn = match client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            tracing::error!("Failed to connect to Redis for User Pub/Sub: {}", e);
            return;
        }
    };

    let mut pubsub = conn.into_pubsub();
    if let Err(e) = pubsub.subscribe(USER_CHANNEL).await {
        tracing::error!("Failed to subscribe to Redis user channel: {}", e);
        return;
    }

    tracing::info!("✅ Subscribed to Redis 'ws_user_events' channel");

    let mut stream = pubsub.on_message();
    while let Some(msg) = stream.next().await {
        let payload: String = match msg.get_payload::<String>() {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("Failed to get payload from Redis msg: {}", e);
                continue;
            }
        };

        match serde_json::from_str::<UserTransport>(&payload) {
            Ok(transport) => {
                let connections_guard = connections.read().await;
                if connections_guard.contains_key(&transport.target_user_id) {
                    let _ = tx.send((transport.target_user_id, transport.event));
                }
            }
            Err(e) => {
                tracing::warn!("Failed to deserialize WS Redis User transport: {}", e);
            }
        }
    }
}

pub async fn publish_session(
    client: &redis::Client,
    session_id: Uuid,
    event: WsEvent,
) -> Result<(), String> {
    let transport = WsTransport { session_id, event };
    let payload = serde_json::to_string(&transport)
        .map_err(|err| format!("serialize session event: {}", err))?;

    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|err| format!("connect Redis: {}", err))?;

    redis::AsyncCommands::publish::<_, _, ()>(&mut conn, GLOBAL_CHANNEL, payload)
        .await
        .map_err(|err| format!("publish session event: {}", err))
}

pub async fn publish_user(
    client: &redis::Client,
    target_user_id: Uuid,
    event: WsEvent,
) -> Result<(), String> {
    let transport = UserTransport {
        target_user_id,
        event,
    };
    let payload = serde_json::to_string(&transport)
        .map_err(|err| format!("serialize user event: {}", err))?;

    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|err| format!("connect Redis: {}", err))?;

    redis::AsyncCommands::publish::<_, _, ()>(&mut conn, USER_CHANNEL, payload)
        .await
        .map_err(|err| format!("publish user event: {}", err))
}

#[derive(Serialize, Deserialize)]
struct UserTransport {
    target_user_id: Uuid,
    event: WsEvent,
}
