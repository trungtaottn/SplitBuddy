use rust_decimal::Decimal;
use std::collections::HashMap;
use std::str::FromStr;
use uuid::Uuid;

use crate::api::sessions::ImportRowError;

use super::shared::{header_index, split_list};
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
    let idx_cost = header_index(&headers, "Cost");
    let idx_currency = header_index(&headers, "Currency");
    let idx_paid_by = header_index(&headers, "Paid by");

    for (name, idx) in [
        ("Description", idx_description),
        ("Cost", idx_cost),
        ("Paid by", idx_paid_by),
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

    let known_headers = [
        "date",
        "description",
        "category",
        "cost",
        "currency",
        "paid by",
        "notes",
    ];
    let participant_headers = headers
        .iter()
        .filter(|h| {
            !known_headers
                .iter()
                .any(|k| h.trim().eq_ignore_ascii_case(k))
        })
        .map(|h| h.trim().to_string())
        .collect::<Vec<_>>();

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
        let amount = match Decimal::from_str(get(idx_cost).replace(',', "").trim()) {
            Ok(val) if val > Decimal::ZERO && !description.is_empty() => val,
            _ => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: if description.is_empty() {
                        "Description".to_string()
                    } else {
                        "Cost".to_string()
                    },
                    message: if description.is_empty() {
                        "Description is required".to_string()
                    } else {
                        "Invalid cost".to_string()
                    },
                });
                continue;
            }
        };

        let payers = split_list(get(idx_paid_by));
        if payers.len() != 1 {
            errors.push(ImportRowError {
                row: row_num,
                field: "Paid by".to_string(),
                message: "Only single payer is supported".to_string(),
            });
            continue;
        }

        let payer_id = match participant_map.get(&payers[0].to_lowercase()) {
            Some(id) => *id,
            None => {
                errors.push(ImportRowError {
                    row: row_num,
                    field: "Paid by".to_string(),
                    message: format!("Unknown payer: {}", payers[0]),
                });
                continue;
            }
        };

        let (participant_ids, participant_amounts) = parse_participants(
            row_num,
            &headers,
            &record,
            &participant_headers,
            participant_map,
            &mut errors,
        );

        if participant_ids.is_empty() {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participants".to_string(),
                message: "No participant amounts found".to_string(),
            });
            continue;
        }

        if participant_amounts.iter().cloned().sum::<Decimal>() != amount {
            errors.push(ImportRowError {
                row: row_num,
                field: "Participants".to_string(),
                message: "Sum of participant amounts must equal Cost".to_string(),
            });
            continue;
        }

        rows.push(ParsedImportRow {
            row: row_num,
            description,
            amount,
            amount_original: amount,
            currency_code: if get(idx_currency).is_empty() {
                base_currency.to_string()
            } else {
                get(idx_currency).to_uppercase()
            },
            split_strategy: "CUSTOM".to_string(),
            payer_ids: vec![payer_id],
            payer_amounts: vec![amount],
            participant_ids,
            participant_amounts,
        });
    }

    (rows, errors)
}

fn parse_participants(
    row: usize,
    headers: &csv::StringRecord,
    record: &csv::StringRecord,
    participant_headers: &[String],
    participant_map: &HashMap<String, Uuid>,
    errors: &mut Vec<ImportRowError>,
) -> (Vec<Uuid>, Vec<Decimal>) {
    let mut ids = Vec::new();
    let mut amounts = Vec::new();

    for header in participant_headers {
        let Some(idx) = header_index(headers, header) else {
            continue;
        };
        let value = record.get(idx).unwrap_or("").trim();
        if value.is_empty() {
            continue;
        }
        let amount = match Decimal::from_str(value.replace(',', "").trim()) {
            Ok(value) if value > Decimal::ZERO => value,
            _ => {
                errors.push(ImportRowError {
                    row,
                    field: header.clone(),
                    message: "Invalid participant amount".to_string(),
                });
                continue;
            }
        };

        match participant_map.get(&header.to_lowercase()) {
            Some(id) => {
                ids.push(*id);
                amounts.push(amount);
            }
            None => errors.push(ImportRowError {
                row,
                field: header.clone(),
                message: format!("Unknown participant: {}", header),
            }),
        }
    }

    (ids, amounts)
}
