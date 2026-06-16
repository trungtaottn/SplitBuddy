//! Session sub-module repositories
//!
//! This module provides focused repositories for session-related operations.
//!
//! ## Repositories
//!
//! - `ParticipantRepository` - Participant CRUD operations
//! - `SessionBillRepository` - Bill CRUD and split calculations
//! - `SessionDebtRepository` - Debt queries and recalculation

#![allow(dead_code)]
#[cfg(test)]
mod facade_compile_tests;
mod participant_repo;
mod session_bill_repo;
mod session_debt_repo;
mod session_read_repo;
mod session_write_repo;

pub use participant_repo::ParticipantRepository;
pub use session_bill_repo::{BillPayerInput, BillSplitInput, SessionBillRepository};
pub use session_debt_repo::SessionDebtRepository;
pub use session_read_repo::SessionReadRepository;
pub use session_write_repo::SessionWriteRepository;
