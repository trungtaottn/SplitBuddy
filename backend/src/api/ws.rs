//! WebSocket handler for real-time updates
//!
//! This module provides WebSocket functionality for pushing real-time updates
//! to connected clients about session events, debt settlements, and notifications.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
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
use chrono::Utc;

/// Wrapper for transport over Redis
#[derive(Debug, Serialize, Deserialize)]
pub struct WsTransport {
    pub session_id: Uuid,
    pub event: WsEvent,
}

/// WebSocket event types for real-time updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsEvent {
    /// A bill was added or updated in a session
    BillUpdated {
        session_id: Uuid,
        bill_id: Uuid,
    },
    /// A bill was deleted
    BillDeleted {
        session_id: Uuid,
        bill_id: Uuid,
    },
    /// A debt was settled or settlement was requested
    DebtUpdated {
        session_id: Uuid,
        debt_id: Uuid,
    },
    /// Debts recalculated (after bill changes)
    DebtsRecalculated {
        session_id: Uuid,
    },
    /// Session status changed (closed/reopened)
    SessionStatusChanged {
        session_id: Uuid,
        status: String,
    },
    /// Generic session update (name, settings, etc.)
    SessionUpdated {
        session_id: Uuid,
    },
    /// A participant joined or left a session
    ParticipantChanged {
        session_id: Uuid,
        action: String,
    },
    /// Game event (spin, truth/dare, etc.)
    GameEvent {
        session_id: Uuid,
        event_type: String,
    },
    /// User achievement unlocked
    AchievementUnlocked {
        user_id: Uuid,
        achievement_id: Uuid,
    },
    /// New notification received
    NotificationReceived {
        notification_id: Uuid,
        title: String,
        notification_type: String,
    },
    /// User joined session view (presence)
    PresenceJoined {
        session_id: Uuid,
        user_id: Uuid,
        user_name: String,
    },
    /// User left session view (presence)
    PresenceLeft {
        session_id: Uuid,
        user_id: Uuid,
    },
    /// Current users viewing a session
    PresenceList {
        session_id: Uuid,
        users: Vec<PresenceUser>,
    },
    /// Connection established confirmation
    Connected {
        user_id: Uuid,
    },
    /// Ephemeral user activity (typing, editing, etc.)
    UserActivity {
        session_id: Uuid,
        user_id: Uuid,
        user_name: String,
        action: String,
    },
    /// Error message
    Error {
        message: String,
    },
    /// Ping/pong for keepalive
    Ping,
    Pong,
}

/// User presence info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceUser {
    pub user_id: Uuid,
    pub user_name: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

/// Query parameters for WebSocket connection
#[derive(Debug, Deserialize)]
pub struct WsQuery {
    /// WebSocket ticket (short-lived, single-use) - obtained from /api/auth/ws-ticket
    pub ticket: String,
}

/// Connected user info
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ConnectedUser {
    pub user_name: String,
    pub session_subscriptions: Vec<Uuid>,
    pub connected_at: chrono::DateTime<chrono::Utc>,
}

/// Session presence - who is viewing each session
#[derive(Debug, Clone, Default)]
pub struct SessionPresence {
    pub users: HashMap<Uuid, PresenceUser>,
}

/// WebSocket connection manager
#[derive(Clone)]
pub struct WsManager {
    /// Broadcast channel for sending events to all connected clients
    pub tx: broadcast::Sender<(Uuid, WsEvent)>,
    /// Track connected users by their user_id
    pub connections: Arc<RwLock<HashMap<Uuid, ConnectedUser>>>,
    /// Track presence per session
    pub session_presence: Arc<RwLock<HashMap<Uuid, SessionPresence>>>,
    /// Redis client for Pub/Sub (optional)
    pub redis_client: Option<redis::Client>,
}

impl WsManager {
    pub fn new(redis_url: Option<String>) -> Self {
        let (tx, _) = broadcast::channel(1000);

        // Initialize Redis client if URL provided
        let redis_client = if let Some(url) = redis_url {
            match redis::Client::open(url) {
                Ok(client) => Some(client),
                Err(e) => {
                    tracing::error!("Failed to create Redis client for WebSocket: {}", e);
                    None
                }
            }
        } else {
            None
        };

        // Create connections Arc BEFORE spawning the task
        let connections = Arc::new(RwLock::new(HashMap::new()));

        // If Redis is available, spawn a subscriber task
        if let Some(client) = &redis_client {
            let tx_clone = tx.clone();
            let client_clone = client.clone();
            let connections_clone = connections.clone();

            // Spawn tasks
            tokio::spawn(async move {
                Self::subscribe_redis_global(
                    client_clone.clone(),
                    tx_clone.clone(),
                    connections_clone.clone(),
                )
                .await;
            });
            let client_user = client.clone();
            let tx_user = tx.clone();
            let connections_user = connections.clone();
            tokio::spawn(async move {
                Self::subscribe_redis_user(client_user, tx_user, connections_user).await;
            });
        }

        Self {
            tx,
            connections,
            session_presence: Arc::new(RwLock::new(HashMap::new())),
            redis_client,
        }
    }

    /// Background task to subscribe to Redis GLOBAL events
    async fn subscribe_redis_global(
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
        if let Err(e) = pubsub.subscribe("ws_global_events").await {
            tracing::error!("Failed to subscribe to Redis channel: {}", e);
            return;
        }

        tracing::info!("✅ Subscribed to Redis 'ws_global_events' channel");

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            // Deserialize message
            let payload: String = match msg.get_payload::<String>() {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("Failed to get payload from Redis msg: {}", e);
                    continue;
                }
            };

            match serde_json::from_str::<WsTransport>(&payload) {
                Ok(transport) => {
                    // Iterate local connections to find subscribers
                    let connections_guard = connections.read().await;
                    for (user_id, user) in connections_guard.iter() {
                        if user.session_subscriptions.contains(&transport.session_id) {
                            // Send to local client via broadcast channel
                            // Note: We use send() which might fail if no receivers, that's fine
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

    /// Background task to subscribe to Redis USER events
    async fn subscribe_redis_user(
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
        if let Err(e) = pubsub.subscribe("ws_user_events").await {
            tracing::error!("Failed to subscribe to Redis user channel: {}", e);
            return;
        }

        tracing::info!("✅ Subscribed to Redis 'ws_user_events' channel");

        #[derive(Deserialize)]
        struct UserTransport {
            target_user_id: Uuid,
            event: WsEvent,
        }

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
                    // Check if user is connected locally
                    let connections_guard = connections.read().await;
                    if connections_guard.contains_key(&transport.target_user_id) {
                        // Send to local client
                        let _ = tx.send((transport.target_user_id, transport.event));
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to deserialize WS Redis User transport: {}", e);
                }
            }
        }
    }

    /// Broadcast an event to all users subscribed to a session
    pub async fn broadcast_to_session(&self, session_id: Uuid, event: WsEvent) {
        // Option 1: If Redis is available, publish to Redis (and let subscriber handle local broadcast)
        // Benefit: Consistency. Disadvantage: Round-trip latency for local user causing the event.
        // Optimization: Publish to Redis, BUT also broadcast locally IF we can ignore the echo.
        // Easiest robust path: Just publish to Redis. Redis localhost latency is microsecond scale.

        if let Some(client) = &self.redis_client {
            // Publish to Redis
            let transport = WsTransport {
                session_id,
                event: event.clone(),
            };

            if let Ok(payload) = serde_json::to_string(&transport) {
                // Determine connection
                let mut conn = match client.get_multiplexed_async_connection().await {
                    Ok(c) => c,
                    Err(e) => {
                        tracing::error!("Failed to get Redis conn for publish: {}", e);
                        // Fallback to local broadcast
                        self.broadcast_local(session_id, event).await;
                        return;
                    }
                };

                if let Err(e) = redis::AsyncCommands::publish::<_, _, ()>(
                    &mut conn,
                    "ws_global_events",
                    payload,
                )
                .await
                {
                    tracing::error!("Failed to publish to Redis: {}", e);
                    // Fallback to local broadcast
                    self.broadcast_local(session_id, event).await;
                }
            }
        } else {
            // No Redis, local broadcast only
            self.broadcast_local(session_id, event).await;
        }
    }

    /// Send an event to a specific user (handles local or Redis)
    pub async fn send_to_user(&self, target_user_id: Uuid, event: WsEvent) {
        // Check local first (optimization)
        let is_local = { self.connections.read().await.contains_key(&target_user_id) };

        if is_local {
            let _ = self.tx.send((target_user_id, event));
            return;
        }

        // If not local, and Redis available, publish
        if let Some(client) = &self.redis_client {
            #[derive(Serialize)]
            struct UserTransport {
                target_user_id: Uuid,
                event: WsEvent,
            }

            let transport = UserTransport {
                target_user_id,
                event: event.clone(),
            };

            if let Ok(payload) = serde_json::to_string(&transport) {
                let mut conn = match client.get_multiplexed_async_connection().await {
                    Ok(c) => c,
                    Err(e) => {
                        tracing::error!("Failed to get Redis conn: {}", e);
                        return;
                    }
                };
                if let Err(e) =
                    redis::AsyncCommands::publish::<_, _, ()>(&mut conn, "ws_user_events", payload)
                        .await
                {
                    tracing::error!("Failed to publish user event to Redis: {}", e);
                }
            }
        }
    }

    /// Helper for local broadcast only
    async fn broadcast_local(&self, session_id: Uuid, event: WsEvent) {
        let connections = self.connections.read().await;
        for (user_id, user) in connections.iter() {
            if user.session_subscriptions.contains(&session_id) {
                let _ = self.tx.send((*user_id, event.clone()));
            }
        }
    }

    /// Register a user connection
    pub async fn register_user(&self, user_id: Uuid, user_name: String) {
        let mut connections = self.connections.write().await;
        connections.insert(
            user_id,
            ConnectedUser {
                user_name,
                session_subscriptions: Vec::new(),
                connected_at: Utc::now(),
            },
        );
        tracing::debug!("User {} connected via WebSocket", user_id);
    }

    /// Unregister a user connection and clean up presence
    pub async fn unregister_user(&self, user_id: Uuid) {
        // Get the sessions this user was subscribed to
        let sessions_to_notify: Vec<Uuid>;
        {
            let connections = self.connections.read().await;
            sessions_to_notify = connections
                .get(&user_id)
                .map(|u| u.session_subscriptions.clone())
                .unwrap_or_default();
        }

        // Remove from all session presence
        {
            let mut presence = self.session_presence.write().await;
            for session_id in &sessions_to_notify {
                if let Some(session_presence) = presence.get_mut(session_id) {
                    session_presence.users.remove(&user_id);
                }
            }
        }

        // Remove from connections
        {
            let mut connections = self.connections.write().await;
            connections.remove(&user_id);
        }

        // Broadcast presence left to all sessions
        for session_id in sessions_to_notify {
            self.broadcast_to_session(
                session_id,
                WsEvent::PresenceLeft {
                    session_id,
                    user_id,
                },
            )
            .await;
        }

        tracing::debug!("User {} disconnected from WebSocket", user_id);
    }

    /// Subscribe a user to session updates and add to presence
    pub async fn subscribe_to_session(&self, user_id: Uuid, session_id: Uuid) {
        let user_name: String;

        // Add to subscriptions
        {
            let mut connections = self.connections.write().await;
            if let Some(user) = connections.get_mut(&user_id) {
                if !user.session_subscriptions.contains(&session_id) {
                    user.session_subscriptions.push(session_id);
                }
                user_name = user.user_name.clone();
            } else {
                return;
            }
        }

        // Add to session presence
        {
            let mut presence = self.session_presence.write().await;
            let session_presence = presence.entry(session_id).or_default();
            session_presence.users.insert(
                user_id,
                PresenceUser {
                    user_id,
                    user_name: user_name.clone(),
                    joined_at: Utc::now(),
                },
            );
        }

        // Broadcast presence joined
        self.broadcast_to_session(
            session_id,
            WsEvent::PresenceJoined {
                session_id,
                user_id,
                user_name,
            },
        )
        .await;

        tracing::debug!("User {} subscribed to session {}", user_id, session_id);
    }

    /// Unsubscribe a user from session updates and remove from presence
    pub async fn unsubscribe_from_session(&self, user_id: Uuid, session_id: Uuid) {
        // Remove from subscriptions
        {
            let mut connections = self.connections.write().await;
            if let Some(user) = connections.get_mut(&user_id) {
                user.session_subscriptions.retain(|&id| id != session_id);
            }
        }

        // Remove from session presence
        {
            let mut presence = self.session_presence.write().await;
            if let Some(session_presence) = presence.get_mut(&session_id) {
                session_presence.users.remove(&user_id);
            }
        }

        // Broadcast presence left
        self.broadcast_to_session(
            session_id,
            WsEvent::PresenceLeft {
                session_id,
                user_id,
            },
        )
        .await;
    }

    /// Get current presence for a session
    #[allow(dead_code)]
    pub async fn get_session_presence(&self, session_id: Uuid) -> Vec<PresenceUser> {
        let presence = self.session_presence.read().await;
        presence
            .get(&session_id)
            .map(|p| p.users.values().cloned().collect())
            .unwrap_or_default()
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

        tracing::info!(
            "📢 Broadcast shutdown to {} connected clients",
            connections.len()
        );
    }
}

impl Default for WsManager {
    fn default() -> Self {
        Self::new(None)
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
    // Parse ticket UUID
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

    // Consume ticket from cache (single-use, removes it after validation)
    match state.cache.consume_ws_ticket(ticket_id).await {
        Some(ticket) => {
            // Check if ticket is still valid (not expired)
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

            // Ticket is valid - upgrade connection
            let user_id = ticket.user_id;
            let user_name = ticket.user_name.clone();
            ws.on_upgrade(move |socket| handle_socket(socket, state, user_id, user_name))
        }
        None => {
            // Ticket not found or already used
            ws.on_upgrade(|mut socket| async move {
                let error = WsEvent::Error {
                    message: "Invalid or already used ticket".to_string(),
                };
                let msg = serde_json::to_string(&error).unwrap_or_default();
                let _ = socket.send(Message::Text(msg)).await;
                let _ = socket.close().await;
            })
        }
    }
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: Uuid, user_name: String) {
    let (mut sender, mut receiver) = socket.split();

    // Register user
    state
        .ws_manager
        .register_user(user_id, user_name.clone())
        .await;

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
    let user_name_recv = user_name.clone(); // Clone for recv task
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Handle client messages (e.g., subscribe to sessions)
                    if let Ok(event) = serde_json::from_str::<ClientMessage>(&text) {
                        let user_name = user_name_recv.clone();
                        match event {
                            ClientMessage::Subscribe { session_id } => {
                                ws_manager_recv
                                    .subscribe_to_session(user_id, session_id)
                                    .await;
                            }
                            ClientMessage::Unsubscribe { session_id } => {
                                ws_manager_recv
                                    .unsubscribe_from_session(user_id, session_id)
                                    .await;
                            }
                            ClientMessage::Ping => {
                                // Ping handled, will send pong below
                            }
                            ClientMessage::Activity { session_id, action } => {
                                // Broadcast activity to session
                                ws_manager_recv
                                    .broadcast_to_session(
                                        session_id,
                                        WsEvent::UserActivity {
                                            session_id,
                                            user_id,
                                            user_name: user_name.clone(), // We need user_name here. It's available in handle_socket scope!
                                            // Wait, handle_socket has user_name string.
                                            // But wait, user_name was moved into handle_socket -> sender task?
                                            // user_name is available in handle_socket. We need to clone it for recv_task.
                                            action,
                                        },
                                    )
                                    .await;
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
    /// User activity (typing, etc.)
    Activity { session_id: Uuid, action: String },
}
