//! WebSocket handler for real-time updates
//!
//! This module provides WebSocket functionality for pushing real-time updates
//! to connected clients about session events, debt settlements, and notifications.

use axum::{routing::get, Router};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::api::ws_redis;
use crate::api::ws_socket::ws_handler;
use crate::api::ws_types::{ConnectedUser, PresenceUser, SessionPresence};
use crate::api::AppState;
use chrono::Utc;

pub use crate::api::ws_types::WsEvent;

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
                ws_redis::subscribe_global(
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
                ws_redis::subscribe_user(client_user, tx_user, connections_user).await;
            });
        }

        Self {
            tx,
            connections,
            session_presence: Arc::new(RwLock::new(HashMap::new())),
            redis_client,
        }
    }

    /// Broadcast an event to all users subscribed to a session
    pub async fn broadcast_to_session(&self, session_id: Uuid, event: WsEvent) {
        // Option 1: If Redis is available, publish to Redis (and let subscriber handle local broadcast)
        // Benefit: Consistency. Disadvantage: Round-trip latency for local user causing the event.
        // Optimization: Publish to Redis, BUT also broadcast locally IF we can ignore the echo.
        // Easiest robust path: Just publish to Redis. Redis localhost latency is microsecond scale.

        if let Some(client) = &self.redis_client {
            if let Err(e) = ws_redis::publish_session(client, session_id, event.clone()).await {
                tracing::error!("Failed to publish to Redis: {:?}", e);
                self.broadcast_local(session_id, event).await;
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
            if let Err(e) = ws_redis::publish_user(client, target_user_id, event.clone()).await {
                tracing::error!("Failed to publish user event to Redis: {:?}", e);
            }
        }
    }

    pub async fn reject_session_subscription(&self, user_id: Uuid, session_id: Uuid) {
        self.send_to_user(
            user_id,
            WsEvent::SubscriptionRejected {
                session_id,
                message: "Session access required".to_string(),
            },
        )
        .await;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn subscribe_to_session_adds_subscription_and_presence() {
        let manager = WsManager::new(None);
        let user_id = Uuid::new_v4();
        let session_id = Uuid::new_v4();

        manager.register_user(user_id, "Ada".to_string()).await;
        manager.subscribe_to_session(user_id, session_id).await;

        let connections = manager.connections.read().await;
        let subscriptions = connections
            .get(&user_id)
            .map(|user| user.session_subscriptions.clone());
        assert_eq!(subscriptions, Some(vec![session_id]));
        drop(connections);

        let presence = manager.session_presence.read().await;
        assert!(presence
            .get(&session_id)
            .is_some_and(|session_presence| session_presence.users.contains_key(&user_id)));
    }

    #[tokio::test]
    async fn rejected_subscription_does_not_add_subscription_or_presence() {
        let manager = WsManager::new(None);
        let user_id = Uuid::new_v4();
        let session_id = Uuid::new_v4();
        let mut rx = manager.tx.subscribe();

        manager.register_user(user_id, "Ada".to_string()).await;
        manager
            .reject_session_subscription(user_id, session_id)
            .await;

        let received = tokio::time::timeout(Duration::from_secs(1), rx.recv()).await;
        assert!(received.is_ok());
        let recv_result = match received {
            Ok(value) => value,
            Err(_) => return,
        };
        assert!(recv_result.is_ok());
        let (target_user_id, event) = match recv_result {
            Ok(value) => value,
            Err(_) => return,
        };

        assert_eq!(target_user_id, user_id);
        assert!(matches!(
            event,
            WsEvent::SubscriptionRejected {
                session_id: rejected_session_id,
                ..
            } if rejected_session_id == session_id
        ));

        let connections = manager.connections.read().await;
        let subscriptions = connections
            .get(&user_id)
            .map(|user| user.session_subscriptions.clone());
        assert_eq!(subscriptions, Some(Vec::new()));
        drop(connections);

        let presence = manager.session_presence.read().await;
        assert!(!presence.contains_key(&session_id));
    }
}
