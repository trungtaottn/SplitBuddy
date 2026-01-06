//! WebSocket handler for real-time updates
//!
//! This module provides WebSocket functionality for pushing real-time updates
//! to connected clients about session events, debt settlements, and notifications.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State, Query,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::api::AppState;
use crate::middleware::auth::verify_token;

/// WebSocket event types for real-time updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsEvent {
    /// A bill was added or updated in a session
    BillUpdated { session_id: Uuid, bill_id: Uuid },
    /// A debt was settled or settlement was requested
    DebtUpdated { session_id: Uuid, debt_id: Uuid },
    /// Session status changed (closed/reopened)
    SessionStatusChanged { session_id: Uuid, status: String },
    /// A participant joined or left a session
    ParticipantChanged { session_id: Uuid, action: String },
    /// Game event (spin, truth/dare, etc.)
    GameEvent { session_id: Uuid, event_type: String },
    /// User achievement unlocked
    AchievementUnlocked { user_id: Uuid, achievement_id: Uuid },
    /// New notification received
    NotificationReceived { notification_id: Uuid, title: String, notification_type: String },
    /// Connection established confirmation
    Connected { user_id: Uuid },
    /// Error message
    Error { message: String },
    /// Ping/pong for keepalive
    Ping,
    Pong,
}

/// Query parameters for WebSocket connection
#[derive(Debug, Deserialize)]
pub struct WsQuery {
    /// JWT token for authentication
    pub token: String,
}

/// Connected user info
#[derive(Debug, Clone)]
pub struct ConnectedUser {
    pub user_id: Uuid,
    pub session_subscriptions: Vec<Uuid>,
}

/// WebSocket connection manager
#[derive(Clone)]
pub struct WsManager {
    /// Broadcast channel for sending events to all connected clients
    pub tx: broadcast::Sender<(Uuid, WsEvent)>,
    /// Track connected users by their user_id
    pub connections: Arc<RwLock<HashMap<Uuid, ConnectedUser>>>,
}

impl WsManager {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        Self {
            tx,
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Broadcast an event to a specific user
    pub async fn send_to_user(&self, user_id: Uuid, event: WsEvent) {
        let _ = self.tx.send((user_id, event));
    }

    /// Broadcast an event to all users subscribed to a session
    pub async fn broadcast_to_session(&self, session_id: Uuid, event: WsEvent) {
        let connections = self.connections.read().await;
        for (user_id, user) in connections.iter() {
            if user.session_subscriptions.contains(&session_id) {
                let _ = self.tx.send((*user_id, event.clone()));
            }
        }
    }

    /// Register a user connection
    pub async fn register_user(&self, user_id: Uuid) {
        let mut connections = self.connections.write().await;
        connections.insert(user_id, ConnectedUser {
            user_id,
            session_subscriptions: Vec::new(),
        });
        tracing::debug!("User {} connected via WebSocket", user_id);
    }

    /// Unregister a user connection
    pub async fn unregister_user(&self, user_id: Uuid) {
        let mut connections = self.connections.write().await;
        connections.remove(&user_id);
        tracing::debug!("User {} disconnected from WebSocket", user_id);
    }

    /// Subscribe a user to session updates
    pub async fn subscribe_to_session(&self, user_id: Uuid, session_id: Uuid) {
        let mut connections = self.connections.write().await;
        if let Some(user) = connections.get_mut(&user_id) {
            if !user.session_subscriptions.contains(&session_id) {
                user.session_subscriptions.push(session_id);
                tracing::debug!("User {} subscribed to session {}", user_id, session_id);
            }
        }
    }

    /// Unsubscribe a user from session updates
    pub async fn unsubscribe_from_session(&self, user_id: Uuid, session_id: Uuid) {
        let mut connections = self.connections.write().await;
        if let Some(user) = connections.get_mut(&user_id) {
            user.session_subscriptions.retain(|&id| id != session_id);
        }
    }

    /// Broadcast shutdown event to all connected clients
    pub async fn broadcast_shutdown(&self) {
        let connections = self.connections.read().await;
        let shutdown_event = WsEvent::Error {
            message: "Server is shutting down".to_string(),
        };
        
        for user_id in connections.keys() {
            let _ = self.tx.send((*user_id, shutdown_event.clone()));
        }
        
        tracing::info!("📢 Broadcast shutdown to {} connected clients", connections.len());
    }
}

impl Default for WsManager {
    fn default() -> Self {
        Self::new()
    }
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(ws_handler))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> impl IntoResponse {
    // Verify JWT token
    match verify_token(&state.config, &query.token) {
        Ok(claims) => {
            ws.on_upgrade(move |socket| handle_socket(socket, state, claims.sub))
        }
        Err(_) => {
            // Return error response - WebSocket upgrade will fail
            ws.on_upgrade(|mut socket| async move {
                let error = WsEvent::Error {
                    message: "Invalid or expired token".to_string(),
                };
                let msg = serde_json::to_string(&error).unwrap_or_default();
                let _ = socket.send(Message::Text(msg)).await;
                let _ = socket.close().await;
            })
        }
    }
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: Uuid) {
    let (mut sender, mut receiver) = socket.split();
    
    // Register user
    state.ws_manager.register_user(user_id).await;
    
    // Send connected confirmation
    let connected_event = WsEvent::Connected { user_id };
    if let Ok(msg) = serde_json::to_string(&connected_event) {
        let _ = sender.send(Message::Text(msg)).await;
    }
    
    // Subscribe to broadcast channel
    let mut rx = state.ws_manager.tx.subscribe();
    
    // Clone for the receive task
    let ws_manager = state.ws_manager.clone();
    let user_id_clone = user_id;
    
    // Task to forward broadcast messages to this user's WebSocket
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
    
    // Task to handle incoming messages from the client
    let ws_manager_recv = ws_manager.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Handle client messages (e.g., subscribe to sessions)
                    if let Ok(event) = serde_json::from_str::<ClientMessage>(&text) {
                        match event {
                            ClientMessage::Subscribe { session_id } => {
                                ws_manager_recv.subscribe_to_session(user_id, session_id).await;
                            }
                            ClientMessage::Unsubscribe { session_id } => {
                                ws_manager_recv.unsubscribe_from_session(user_id, session_id).await;
                            }
                            ClientMessage::Ping => {
                                // Ping handled, will send pong below
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });
    
    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => {
            recv_task.abort();
        }
        _ = &mut recv_task => {
            send_task.abort();
        }
    }
    
    // Cleanup
    state.ws_manager.unregister_user(user_id).await;
}

/// Messages that clients can send to the WebSocket server
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    /// Subscribe to updates for a specific session
    Subscribe { session_id: Uuid },
    /// Unsubscribe from session updates
    Unsubscribe { session_id: Uuid },
    /// Ping for keepalive
    Ping,
}
