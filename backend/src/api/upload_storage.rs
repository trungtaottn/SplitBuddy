use axum::extract::Multipart;
use std::path::Path as StdPath;
use tokio::fs;
use uuid::Uuid;

use crate::error::AppError;

pub(super) struct UploadSpec {
    pub kind: &'static str,
    pub directory: &'static str,
    accepted_fields: &'static [&'static str],
    max_bytes: usize,
    max_size_label: &'static str,
}

pub(super) const AVATAR_UPLOAD: UploadSpec = UploadSpec {
    kind: "avatars",
    directory: "uploads/avatars",
    accepted_fields: &["file", "avatar"],
    max_bytes: 5 * 1024 * 1024,
    max_size_label: "5MB",
};

pub(super) const RECEIPT_UPLOAD: UploadSpec = UploadSpec {
    kind: "receipts",
    directory: "uploads/receipts",
    accepted_fields: &["file", "receipt"],
    max_bytes: 10 * 1024 * 1024,
    max_size_label: "10MB",
};

pub(super) const BANK_QR_UPLOAD: UploadSpec = UploadSpec {
    kind: "bank_qr",
    directory: "uploads/bank_qr",
    accepted_fields: &["file", "qr", "bank_qr"],
    max_bytes: 5 * 1024 * 1024,
    max_size_label: "5MB",
};

pub(super) async fn save_image_upload(
    user_id: Uuid,
    mut multipart: Multipart,
    spec: &UploadSpec,
) -> Result<String, AppError> {
    let upload_dir = StdPath::new(spec.directory);
    fs::create_dir_all(upload_dir).await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to create upload directory: {}", e))
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to read multipart field: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();

        if spec.accepted_fields.contains(&name.as_str()) {
            let data = field.bytes().await.map_err(|e| {
                AppError::Internal(anyhow::anyhow!("Failed to read file data: {}", e))
            })?;

            if data.len() > spec.max_bytes {
                return Err(AppError::Validation {
                    field: "file".to_string(),
                    message: format!("File size must be less than {}", spec.max_size_label),
                });
            }

            let ext = validate_image_magic_bytes(&data).ok_or_else(|| AppError::Validation {
                field: "file".to_string(),
                message: "Invalid image file. Only JPEG, PNG, GIF, and WebP are supported."
                    .to_string(),
            })?;

            let filename = format!("{}_{}.{}", user_id, Uuid::new_v4(), ext);
            let filepath = upload_dir.join(&filename);

            fs::write(&filepath, &data)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to save file: {}", e)))?;

            return Ok(format!("/uploads/{}/{}", spec.kind, filename));
        }
    }

    Err(AppError::Validation {
        field: "file".to_string(),
        message: "No file provided".to_string(),
    })
}

pub(super) async fn delete_owned_upload(
    user_id: Uuid,
    role: &str,
    kind: &str,
    filename: &str,
) -> Result<(), AppError> {
    let spec = upload_spec_for_kind(kind)?;
    let owner_id = owner_id_from_filename(filename)?;

    if role != "admin" && user_id != owner_id {
        return Err(AppError::Forbidden {
            message: "Cannot delete another user's upload".to_string(),
        });
    }

    let path = StdPath::new(spec.directory).join(filename);
    fs::remove_file(&path).await.map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => AppError::NotFound("Upload not found".to_string()),
        _ => AppError::Internal(anyhow::anyhow!("Failed to delete upload: {}", e)),
    })
}

fn upload_spec_for_kind(kind: &str) -> Result<&'static UploadSpec, AppError> {
    match kind {
        "avatars" => Ok(&AVATAR_UPLOAD),
        "receipts" => Ok(&RECEIPT_UPLOAD),
        "bank_qr" => Ok(&BANK_QR_UPLOAD),
        _ => Err(AppError::NotFound("Upload kind not found".to_string())),
    }
}

fn validate_image_magic_bytes(data: &[u8]) -> Option<&'static str> {
    if data.len() < 8 {
        return None;
    }

    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("jpg");
    }

    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Some("png");
    }

    if data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
        return Some("gif");
    }

    if data.len() >= 12 && data.starts_with(&[0x52, 0x49, 0x46, 0x46]) && &data[8..12] == b"WEBP" {
        return Some("webp");
    }

    None
}

fn owner_id_from_filename(filename: &str) -> Result<Uuid, AppError> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err(AppError::Validation {
            field: "filename".to_string(),
            message: "Invalid upload filename".to_string(),
        });
    }

    let (owner, rest) = filename
        .split_once('_')
        .ok_or_else(|| AppError::Validation {
            field: "filename".to_string(),
            message: "Invalid upload filename".to_string(),
        })?;

    if rest.is_empty() || !rest.contains('.') {
        return Err(AppError::Validation {
            field: "filename".to_string(),
            message: "Invalid upload filename".to_string(),
        });
    }

    Uuid::parse_str(owner).map_err(|_| AppError::Validation {
        field: "filename".to_string(),
        message: "Invalid upload filename".to_string(),
    })
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn owner_id_from_filename_accepts_generated_name() {
        let owner = Uuid::new_v4();
        let filename = format!("{}_{}.png", owner, Uuid::new_v4());
        match owner_id_from_filename(&filename) {
            Ok(parsed_owner) => assert_eq!(parsed_owner, owner),
            Err(err) => unreachable!("valid generated filename rejected: {err}"),
        }
    }
    #[test]
    fn owner_id_from_filename_rejects_path_traversal() {
        assert!(owner_id_from_filename("../bad.png").is_err());
        assert!(owner_id_from_filename("avatars/bad.png").is_err());
    }
    #[test]
    fn validate_image_magic_bytes_detects_png() {
        assert_eq!(
            validate_image_magic_bytes(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            Some("png")
        );
    }
}
