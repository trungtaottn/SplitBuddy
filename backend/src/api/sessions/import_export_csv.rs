use axum::http::header;
use axum::response::Response;

use crate::error::AppError;

pub(super) fn build_csv_response(
    csv_data: String,
    filename: String,
) -> Result<Response<String>, AppError> {
    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(csv_data)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to build response: {}", e)))
}

pub(super) fn csv_escape(value: &str) -> String {
    let needs_quotes = value.contains(',') || value.contains('\n') || value.contains('"');
    if needs_quotes {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::csv_escape;

    #[test]
    fn csv_escape_quotes_commas_quotes_and_newlines() {
        assert_eq!(csv_escape("plain"), "plain");
        assert_eq!(csv_escape("a,b"), "\"a,b\"");
        assert_eq!(csv_escape("a\"b"), "\"a\"\"b\"");
        assert_eq!(csv_escape("a\nb"), "\"a\nb\"");
    }
}
