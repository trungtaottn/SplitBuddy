use chrono::Utc;
use rust_decimal::Decimal;
use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

use crate::api::sessions::{PayerInput, SplitDetailInput};
use crate::domain::session::SessionStatus;
use crate::repository::session::{
    ParticipantRepository, SessionBillRepository, SessionDebtRepository, SessionReadRepository,
    SessionWriteRepository,
};
use crate::repository::session_repo::SessionRepository;

fn lazy_pool() -> PgPool {
    PgPoolOptions::new()
        .connect_lazy("postgres://splitbuddy:splitbuddy@localhost/splitbuddy_test")
        .expect("test database URL should parse")
}

#[tokio::test]
async fn split_session_repositories_construct_from_pool() {
    let pool = lazy_pool();

    let _ = SessionRepository::new(pool.clone());
    let _ = SessionReadRepository::new(pool.clone());
    let _ = SessionWriteRepository::new(pool.clone());
    let _ = ParticipantRepository::new(pool.clone());
    let _ = SessionBillRepository::new(pool.clone());
    let _ = SessionDebtRepository::new(pool);
}

#[tokio::test]
async fn session_repository_facade_preserves_public_async_surface() {
    let pool = lazy_pool();
    let repo = SessionRepository::new(pool);

    let user_id = Uuid::new_v4();
    let session_id = Uuid::new_v4();
    let participant_id = Uuid::new_v4();
    let bill_id = Uuid::new_v4();
    let amount = Decimal::new(100_000, 0);
    let payer_inputs = vec![PayerInput {
        participant_id,
        amount,
    }];
    let split_inputs = vec![SplitDetailInput {
        participant_id,
        amount,
    }];
    let guest_names = vec!["Guest".to_string()];
    let participant_ids = vec![user_id];

    drop(repo.find_by_user(user_id, false));
    drop(repo.find_by_user_paginated(user_id, None, None, None, None, false, 1, 20));
    drop(repo.get_session_participants_basic(session_id));
    drop(repo.get_user_debt_in_session(session_id, user_id));
    drop(repo.get_session_settled_amount(session_id));
    drop(repo.batch_get_participants(&[session_id]));
    drop(repo.batch_get_user_debts(&[session_id], user_id));
    drop(repo.batch_get_settled_amounts(&[session_id]));
    drop(repo.create("Session", Some("Taproom"), user_id));
    drop(repo.create_with_participants(
        "Session",
        Some("Taproom"),
        Some(Utc::now().date_naive()),
        user_id,
        None,
        Some(&participant_ids),
        Some(&guest_names),
        Some("VND"),
        Some("Asia/Ho_Chi_Minh"),
    ));
    drop(repo.find_by_id_with_details(session_id, user_id));
    drop(repo.verify_owner(session_id, user_id));
    drop(repo.verify_participant(session_id, user_id));
    drop(repo.get_session_base_currency(session_id));
    drop(repo.update_status(session_id, SessionStatus::Closed));
    drop(repo.update_minimize_debts(session_id, true));
    drop(repo.set_archived(session_id, false));
    drop(repo.add_participant(session_id, Some(user_id), None));
    drop(repo.update_participant(
        participant_id,
        Some("Guest".to_string()),
        Some(1),
        Some(true),
    ));
    drop(repo.delete_participant(participant_id));
    drop(repo.delete(session_id));
    drop(repo.find_bills_by_session(session_id));
    drop(repo.create_bill(
        session_id,
        "Bill",
        amount,
        amount,
        "VND",
        Decimal::ONE,
        "manual",
        Utc::now(),
        "equal",
        user_id,
        &payer_inputs,
        Some(&split_inputs),
        None,
    ));
    drop(repo.update_bill(
        bill_id,
        session_id,
        Some("Updated bill"),
        Some(amount),
        Some(amount),
        Some("VND"),
        Some(Decimal::ONE),
        Some("manual"),
        Some(Utc::now()),
        Some("equal"),
        Some(&payer_inputs),
        Some(&split_inputs),
        None,
        None,
    ));
    drop(repo.delete_bill(bill_id, session_id));
    drop(repo.find_bills_with_details(session_id));
}
