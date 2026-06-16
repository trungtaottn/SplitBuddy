use axum::{
    extract::{Multipart, Path as AxumPath},
    routing::{delete, post},
    Json, Router,
};
use serde::Serialize;

use crate::api::response::{ok, ApiResponse};
use crate::api::upload_storage::{
    delete_owned_upload, save_image_upload, AVATAR_UPLOAD, BANK_QR_UPLOAD, RECEIPT_UPLOAD,
};
use crate::api::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/avatar", post(upload_avatar))
        .route("/receipt", post(upload_receipt))
        .route("/bank-qr", post(upload_bank_qr))
        .route("/:kind/:filename", delete(delete_upload))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
}

async fn upload_avatar(
    auth_user: AuthUser,
    multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    upload_response(save_image_upload(auth_user.user_id, multipart, &AVATAR_UPLOAD).await?)
}

async fn upload_receipt(
    auth_user: AuthUser,
    multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    upload_response(save_image_upload(auth_user.user_id, multipart, &RECEIPT_UPLOAD).await?)
}

async fn upload_bank_qr(
    auth_user: AuthUser,
    multipart: Multipart,
) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    upload_response(save_image_upload(auth_user.user_id, multipart, &BANK_QR_UPLOAD).await?)
}

async fn delete_upload(
    auth_user: AuthUser,
    AxumPath((kind, filename)): AxumPath<(String, String)>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    delete_owned_upload(auth_user.user_id, &auth_user.role, &kind, &filename).await?;
    Ok(ok(()))
}

fn upload_response(url: String) -> Result<Json<ApiResponse<UploadResponse>>, AppError> {
    Ok(ok(UploadResponse { url }))
}
