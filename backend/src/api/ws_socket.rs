use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use chrono::Utc;
use futures::{SinkExt, StreamExt};
use uuid::Uuid;

use crate::api::sessions::authz::require_session_participant_or_admin;
use crate::api::ws::{WsEvent, WsManager};
use crate::api::ws_types::{ClientMessage, WsQuery};
use crate::api::AppState;
use crate::middleware::auth::AuthUser;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> impl IntoResponse {
    let ticket_id = match Uuid::parse_str(&query.ticket) {
        Ok(id) => id,
        Err(_) => {
            return ws.on_upgrade(|mut socket| async move {
                let error = WsEvent::Error {
                    message: "Invalid ticket format".to_string(),
                };
                let msg = serde_json::to_string(&error).unwrap_or_default();
                let _ = socket.send(Message::Text(msg)).await;
                let _ = socket.close().await;
            });
        }
    };

    match state.cache.consume_ws_ticket(ticket_id).await {
        Some(ticket) => {
            if ticket.expires_at < Utc::now() {
                return ws.on_upgrade(|mut socket| async move {
                    let error = WsEvent::Error {
                        message: "Ticket expired".to_string(),
                    };
                    let msg = serde_json::to_string(&error).unwrap_or_default();
                    let _ = socket.send(Message::Text(msg)).await;
                    let _ = socket.close().await;
                });
            }

            let user_id = ticket.user_id;
            let user_name = ticket.user_name.clone();
            let user_role = ticket.role.clone();
            ws.on_upgrade(move |socket| handle_socket(socket, state, user_id, user_name, user_role))
        }
        None => ws.on_upgrade(|mut socket| async move {
            let error = WsEvent::Error {
                message: "Invalid or already used ticket".to_string(),
            };
            let msg = serde_json::to_string(&error).unwrap_or_default();
            let _ = socket.send(Message::Text(msg)).await;
            let _ = socket.close().await;
        }),
    }
}

async fn handle_socket(
    socket: WebSocket,
    state: AppState,
    user_id: Uuid,
    user_name: String,
    user_role: String,
) {
    let (mut sender, mut receiver) = socket.split();

    state
        .ws_manager
        .register_user(user_id, user_name.clone())
        .await;

    let connected_event = WsEvent::Connected { user_id };
    if let Ok(msg) = serde_json::to_string(&connected_event) {
        let _ = sender.send(Message::Text(msg)).await;
    }

    let mut rx = state.ws_manager.tx.subscribe();

    let ws_manager = state.ws_manager.clone();
    let user_id_clone = user_id;

    let mut send_task = tokio::spawn(async move {
        while let Ok((target_user_id, event)) = rx.recv().await {
            if target_user_id == user_id_clone {
                if let Ok(msg) = serde_json::to_string(&event) {
                    if sender.send(Message::Text(msg)).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    let ws_manager_recv = ws_manager.clone();
    let user_name_recv = user_name.clone();
    let pool_recv = state.pool.clone();
    let auth_user_recv = AuthUser {
        user_id,
        role: user_role,
    };
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(event) = serde_json::from_str::<ClientMessage>(&text) {
                        let user_name = user_name_recv.clone();
                        match event {
                            ClientMessage::Subscribe { session_id } => {
                                if authorize_ws_session_access(
                                    &pool_recv,
                                    &ws_manager_recv,
                                    &auth_user_recv,
                                    session_id,
                                )
                                .await
                                {
                                    ws_manager_recv
                                        .subscribe_to_session(user_id, session_id)
                                        .await;
                                }
                            }
                            ClientMessage::Unsubscribe { session_id } => {
                                ws_manager_recv
                                    .unsubscribe_from_session(user_id, session_id)
                                    .await;
                            }
                            ClientMessage::Ping => {}
                            ClientMessage::Activity { session_id, action } => {
                                if authorize_ws_session_access(
                                    &pool_recv,
                                    &ws_manager_recv,
                                    &auth_user_recv,
                                    session_id,
                                )
                                .await
                                {
                                    ws_manager_recv
                                        .broadcast_to_session(
                                            session_id,
                                            WsEvent::UserActivity {
                                                session_id,
                                                user_id,
                                                user_name: user_name.clone(),
                                                action,
                                            },
                                        )
                                        .await;
                                }
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => {
            recv_task.abort();
        }
        _ = &mut recv_task => {
            send_task.abort();
        }
    }

    state.ws_manager.unregister_user(user_id).await;
}

async fn authorize_ws_session_access(
    pool: &sqlx::PgPool,
    ws_manager: &WsManager,
    auth_user: &AuthUser,
    session_id: Uuid,
) -> bool {
    match require_session_participant_or_admin(pool, auth_user, session_id).await {
        Ok(()) => true,
        Err(err) => {
            tracing::warn!(
                "Rejected WebSocket session access for user {} session {}: {}",
                auth_user.user_id,
                session_id,
                err
            );
            ws_manager
                .reject_session_subscription(auth_user.user_id, session_id)
                .await;
            false
        }
    }
}
