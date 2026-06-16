use uuid::Uuid;

use crate::api::ws::WsEvent;
use crate::api::AppState;

pub async fn publish_bill_updated(state: &AppState, session_id: Uuid, bill_id: Uuid) {
    state.cache.invalidate_session(session_id).await;

    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillUpdated {
                session_id,
                bill_id,
            },
        )
        .await;

    publish_debts_recalculated(state, session_id).await;
}

pub async fn publish_bill_deleted(state: &AppState, session_id: Uuid, bill_id: Uuid) {
    state.cache.invalidate_session(session_id).await;

    state
        .ws_manager
        .broadcast_to_session(
            session_id,
            WsEvent::BillDeleted {
                session_id,
                bill_id,
            },
        )
        .await;

    publish_debts_recalculated(state, session_id).await;
}

async fn publish_debts_recalculated(state: &AppState, session_id: Uuid) {
    state
        .ws_manager
        .broadcast_to_session(session_id, WsEvent::DebtsRecalculated { session_id })
        .await;
}
