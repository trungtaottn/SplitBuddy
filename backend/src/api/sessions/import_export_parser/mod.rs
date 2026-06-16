use rust_decimal::Decimal;
use std::collections::HashMap;
use uuid::Uuid;

use crate::api::sessions::ImportRowError;

mod shared;
mod splitbuddy_v1;
mod splitbuddy_v2;
mod splitwise;

pub(super) struct ParsedImportRow {
    pub row: usize,
    pub description: String,
    pub amount: Decimal,
    pub amount_original: Decimal,
    pub currency_code: String,
    pub split_strategy: String,
    pub payer_ids: Vec<Uuid>,
    pub payer_amounts: Vec<Decimal>,
    pub participant_ids: Vec<Uuid>,
    pub participant_amounts: Vec<Decimal>,
}

pub(super) fn parse_import_csv(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            return (
                Vec::new(),
                vec![ImportRowError {
                    row: 0,
                    field: "csv".to_string(),
                    message: format!("Failed to read headers: {}", err),
                }],
            );
        }
    };

    let header_set = headers
        .iter()
        .map(|h| h.trim().to_lowercase())
        .collect::<Vec<_>>();

    let is_splitbuddy = header_set
        .iter()
        .any(|h| h == "payer amounts" || h == "participant amounts" || h == "split details");
    let is_splitwise = header_set.iter().any(|h| h == "paid by" || h == "cost");

    if is_splitbuddy {
        if header_set.iter().any(|h| h == "split details") {
            splitbuddy_v2::parse(csv_text, base_currency, participant_map)
        } else {
            splitbuddy_v1::parse(csv_text, base_currency, participant_map)
        }
    } else if is_splitwise {
        splitwise::parse(csv_text, base_currency, participant_map)
    } else {
        (
            Vec::new(),
            vec![ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: "Unknown CSV format. Please upload SplitBuddy v1/v2 or Splitwise CSV."
                    .to_string(),
            }],
        )
    }
}
