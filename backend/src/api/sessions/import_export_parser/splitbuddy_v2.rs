use rust_decimal::Decimal;
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

use crate::api::sessions::ImportRowError;

use super::shared::{header_index, parse_decimal_list, parse_split_details, split_list};
use super::ParsedImportRow;

pub(super) fn parse(
    csv_text: &str,
    base_currency: &str,
    participant_map: &HashMap<String, Uuid>,
) -> (Vec<ParsedImportRow>, Vec<ImportRowError>) {
    let mut errors = Vec::new();
    let mut rows = Vec::new();

    let mut rdr = csv::ReaderBuilder::new()
        .trim(csv::Trim::All)
        .from_reader(csv_text.as_bytes());

    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(err) => {
            errors.push(ImportRowError {
                row: 0,
                field: "csv".to_string(),
                message: format!("Failed to read headers: {}", err),
            });
            return (rows, errors);
        }
    };

    let idx_description = header_index(&headers, "Description");
    let idx_amount = header_index(&headers, "Amount");
    let idx_amount_original = header_index(&headers, "Amount Original");
    let idx_currency = header_index(&headers, "Currency");
    let idx_split_strategy = header_index(&headers, "Split Strategy");
    let idx_payers = header_index(&headers, "Payers");
    let idx_payer_amounts = header_index(&headers, "Payer Amounts");
    let idx_split_details = header_index(&headers, "Split Details");

    for (name, idx) in [
        ("Description", idx_description),
        ("Amount", idx_amount),
        ("Split Strategy", idx_split_strategy),
        ("Payers", idx_payers),
        ("Payer Amounts", idx_payer_amounts),
        ("Split Details", idx_split_details),
    ] {
        if idx.is_none() {
            errors.push(ImportRowError {
                row: 0,
                field: "headers".to_string(),
                message: format!("Missing required header: {}", name),
            });
        }
    }

    if !errors.is_empty() {
        return (rows, errors);
    }

    for (i, result) in rdr.records().enumerate() {
        let row_num = i + 2;
        let record = match result {
            Ok(r) => r,
            Err(err) => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "row".to_string(),
                    message: format!("Invalid row: {}", err),
                });
                continue;
            }
        };

        let get = |idx: Option<usize>| idx.and_then(|i| record.get(i)).unwrap_or("").trim();
        let description = get(idx_description).to_string();
        let amount = match Decimal::from_str(get(idx_amount)) {
            Ok(val) if val > Decimal::ZERO && !description.is_empty() => val,
            _ => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: if description.is_empty() {
                        "Description".to_string()
                    } else {
                        "Amount".to_string()
                    },
                    message: if description.is_empty() {
                        "Description is required".to_string()
                    } else {
                        "Invalid amount".to_string()
                    },
                });
                continue;
            }
        };

        let payers = split_list(get(idx_payers));
        let payer_amounts = parse_decimal_list(get(idx_payer_amounts));
        let (participant_names, participant_amounts) = parse_split_details(get(idx_split_details));
        let mut row_errors = Vec::new();

        if payers.is_empty() || payer_amounts.is_empty() || payers.len() != payer_amounts.len() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Payers".to_string(),
                message: "Payers and payer amounts must match".to_string(),
            });
        }
        if participant_names.is_empty() || participant_amounts.is_empty() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Split Details".to_string(),
                message: "Split details must include participant=amount pairs".to_string(),
            });
        }
        if participant_names.len() != participant_amounts.len() {
            row_errors.push(ImportRowError {
                row: row_num,
                field: "Split Details".to_string(),
                message: "Split details entries must match participant and amount".to_string(),
            });
        }

        let payer_ids = map_names(row_num, "Payers", &payers, participant_map, &mut row_errors);
        let participant_ids = map_names(
            row_num,
            "Split Details",
            &participant_names,
            participant_map,
            &mut row_errors,
        );

        if !row_errors.is_empty() {
            errors.extend(row_errors);
            continue;
        }

        rows.push(ParsedImportRow {
            row: row_num,
            description,
            amount,
            amount_original: Decimal::from_str(get(idx_amount_original)).unwrap_or(amount),
            currency_code: if get(idx_currency).is_empty() {
                base_currency.to_string()
            } else {
                get(idx_currency).to_uppercase()
            },
            split_strategy: get(idx_split_strategy).to_uppercase(),
            payer_ids,
            payer_amounts,
            participant_ids,
            participant_amounts,
        });
    }

    (rows, errors)
}

fn map_names(
    row: usize,
    field: &str,
    names: &[String],
    participant_map: &HashMap<String, Uuid>,
    errors: &mut Vec<ImportRowError>,
) -> Vec<Uuid> {
    let mut ids = Vec::with_capacity(names.len());
    for name in names {
        match participant_map.get(&name.to_lowercase()) {
            Some(id) => ids.push(*id),
            None => errors.push(ImportRowError {
                row,
                field: field.to_string(),
                message: format!("Unknown participant: {}", name),
            }),
        }
    }
    ids
}
