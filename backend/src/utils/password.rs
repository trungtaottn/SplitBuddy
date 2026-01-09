//! Password hashing and verification utilities using Argon2
//!
//! This module provides secure password handling functions used throughout
//! the application for user authentication.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

use crate::error::AppError;

/// Hash a password using Argon2 with a random salt
///
/// # Arguments
/// * `password` - The plain text password to hash
///
/// # Returns
/// * `Ok(String)` - The hashed password string
/// * `Err(AppError)` - If hashing fails
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Password hashing failed: {}", e)))
}

/// Verify a password against a stored hash
///
/// # Arguments
/// * `password` - The plain text password to verify
/// * `hash` - The stored password hash to verify against
///
/// # Returns
/// * `Ok(true)` - If the password matches
/// * `Ok(false)` - If the password does not match
/// * `Err(AppError)` - If verification fails due to invalid hash format
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Invalid password hash format: {}", e)))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Async version of hash_password using spawn_blocking
///
/// This prevents CPU-intensive Argon2 hashing from blocking the Tokio runtime.
/// Recommended for use in async HTTP handlers.
pub async fn hash_password_async(password: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Hash task failed: {}", e)))?
}

/// Async version of verify_password using spawn_blocking
///
/// This prevents CPU-intensive Argon2 verification from blocking the Tokio runtime.
/// Recommended for use in async HTTP handlers.
pub async fn verify_password_async(password: String, hash: String) -> Result<bool, AppError> {
    tokio::task::spawn_blocking(move || verify_password(&password, &hash))
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Verify task failed: {}", e)))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let password = "test_password_123";
        let hash = hash_password(password).expect("Hashing should succeed");

        // Verify correct password
        assert!(verify_password(password, &hash).expect("Verification should succeed"));

        // Verify incorrect password
        assert!(!verify_password("wrong_password", &hash).expect("Verification should succeed"));
    }

    #[test]
    fn test_different_passwords_produce_different_hashes() {
        let hash1 = hash_password("password1").expect("Hashing should succeed");
        let hash2 = hash_password("password1").expect("Hashing should succeed");

        // Same password should produce different hashes due to random salt
        assert_ne!(hash1, hash2);
    }
}
