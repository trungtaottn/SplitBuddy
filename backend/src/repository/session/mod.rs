//! Session sub-module repositories
//!
//! This module provides specialized repositories for session-related operations.
//! Each repository wraps SessionRepository and provides a focused API for its domain.
//!
//! ## Migration Strategy (Incremental Refactoring)
//!
//! Phase 1: Create wrapper structs that delegate to SessionRepository
//! Phase 2: Gradually move implementation from SessionRepository to the wrappers
//! Phase 3: Clean up SessionRepository to only contain session CRUD operations
//!
//! ## Repositories
//!
//! - `ParticipantRepository` - Participant CRUD operations
//! - `SessionBillRepository` - Bill CRUD and split calculations
//! - `SessionDebtRepository` - Debt queries and recalculation

#![allow(dead_code)]
mod participant_repo;
mod session_bill_repo;
mod session_debt_repo;

pub use session_bill_repo::SessionBillRepository;
pub use session_debt_repo::SessionDebtRepository;
