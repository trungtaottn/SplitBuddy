use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct WsTransport {
    pub session_id: Uuid,
    pub event: WsEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsEvent {
    BillUpdated {
        session_id: Uuid,
        bill_id: Uuid,
    },
    BillDeleted {
        session_id: Uuid,
        bill_id: Uuid,
    },
    DebtUpdated {
        session_id: Uuid,
        debt_id: Uuid,
    },
    DebtsRecalculated {
        session_id: Uuid,
    },
    SessionStatusChanged {
        session_id: Uuid,
        status: String,
    },
    SessionUpdated {
        session_id: Uuid,
    },
    ParticipantChanged {
        session_id: Uuid,
        action: String,
    },
    GameEvent {
        session_id: Uuid,
        event_type: String,
    },
    AchievementUnlocked {
        user_id: Uuid,
        achievement_id: Uuid,
    },
    NotificationReceived {
        notification_id: Uuid,
        title: String,
        notification_type: String,
    },
    PresenceJoined {
        session_id: Uuid,
        user_id: Uuid,
        user_name: String,
    },
    PresenceLeft {
        session_id: Uuid,
        user_id: Uuid,
    },
    PresenceList {
        session_id: Uuid,
        users: Vec<PresenceUser>,
    },
    Connected {
        user_id: Uuid,
    },
    UserActivity {
        session_id: Uuid,
        user_id: Uuid,
        user_name: String,
        action: String,
    },
    Error {
        message: String,
    },
    SubscriptionRejected {
        session_id: Uuid,
        message: String,
    },
    Ping,
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceUser {
    pub user_id: Uuid,
    pub user_name: String,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub ticket: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    Subscribe { session_id: Uuid },
    Unsubscribe { session_id: Uuid },
    Ping,
    Activity { session_id: Uuid, action: String },
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ConnectedUser {
    pub user_name: String,
    pub session_subscriptions: Vec<Uuid>,
    pub connected_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Default)]
pub struct SessionPresence {
    pub users: HashMap<Uuid, PresenceUser>,
}
