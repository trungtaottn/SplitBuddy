use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub data: T,
    pub meta: ResponseMeta,
}

#[derive(Serialize)]
pub struct ResponseMeta {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<PaginationMeta>,
}

#[derive(Serialize)]
pub struct PaginationMeta {
    pub page: u32,
    pub limit: u32,
    pub total: u64,
    pub total_pages: u32,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn new(data: T) -> Self {
        Self {
            data,
            meta: ResponseMeta {
                timestamp: chrono::Utc::now(),
                pagination: None,
            },
        }
    }

    #[allow(dead_code)]
    pub fn with_pagination(data: T, pagination: PaginationMeta) -> Self {
        Self {
            data,
            meta: ResponseMeta {
                timestamp: chrono::Utc::now(),
                pagination: Some(pagination),
            },
        }
    }
}

#[allow(dead_code)]
pub struct CreatedResponse<T: Serialize>(pub T);

impl<T: Serialize> IntoResponse for CreatedResponse<T> {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::CREATED, Json(ApiResponse::new(self.0))).into_response()
    }
}

pub fn ok<T: Serialize>(data: T) -> Json<ApiResponse<T>> {
    Json(ApiResponse::new(data))
}

pub fn created<T: Serialize>(data: T) -> (StatusCode, Json<ApiResponse<T>>) {
    (StatusCode::CREATED, Json(ApiResponse::new(data)))
}
