use rust_decimal::Decimal;
use std::str::FromStr;

pub(super) fn split_list(value: &str) -> Vec<String> {
    value
        .split(['|', '&', ';'])
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

pub(super) fn parse_decimal_list(value: &str) -> Vec<Decimal> {
    value
        .split(['|', '&', ';'])
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|s| Decimal::from_str(s).ok())
        .collect()
}

pub(super) fn parse_split_details(value: &str) -> (Vec<String>, Vec<Decimal>) {
    let mut names = Vec::new();
    let mut amounts = Vec::new();

    for entry in value.split(['|', '&', ';']) {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }

        let (name_raw, amount_raw) = trimmed
            .split_once('=')
            .or_else(|| trimmed.split_once(':'))
            .unwrap_or(("", ""));

        let name = name_raw.trim();
        let amount = amount_raw.trim();
        if name.is_empty() || amount.is_empty() {
            continue;
        }

        if let Ok(parsed) = Decimal::from_str(amount) {
            names.push(name.to_string());
            amounts.push(parsed);
        }
    }

    (names, amounts)
}

pub(super) fn header_index(headers: &csv::StringRecord, name: &str) -> Option<usize> {
    headers
        .iter()
        .position(|h| h.trim().eq_ignore_ascii_case(name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_details_accepts_equals_and_colon_separators() {
        let (names, amounts) = parse_split_details("A=10 | B:20; invalid");

        assert_eq!(names, vec!["A", "B"]);
        assert_eq!(amounts, vec![Decimal::new(10, 0), Decimal::new(20, 0)]);
    }
}
