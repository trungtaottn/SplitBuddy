#![allow(dead_code)]
use sqlx::PgPool;

pub struct BillRepository {
    pool: PgPool,
}

impl BillRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}
