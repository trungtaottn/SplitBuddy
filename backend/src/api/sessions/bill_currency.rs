use rust_decimal::{Decimal, RoundingStrategy};

use super::{PayerInput, SplitDetailInput};

fn round_amount(amount: Decimal) -> Decimal {
    amount.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero)
}

pub(super) fn convert_amount(amount: Decimal, rate: Decimal) -> Decimal {
    round_amount(amount * rate)
}

pub(super) fn convert_payers(
    payers: &[PayerInput],
    rate: Decimal,
    total_original: Decimal,
    total_converted: Decimal,
) -> Vec<PayerInput> {
    let mut converted: Vec<PayerInput> = payers
        .iter()
        .map(|payer| PayerInput {
            participant_id: payer.participant_id,
            amount: convert_amount(payer.amount, rate),
        })
        .collect();

    if converted.is_empty() {
        return converted;
    }

    let sum_original: Decimal = payers.iter().map(|p| p.amount).sum();
    if sum_original != total_original {
        return converted;
    }

    let sum_converted: Decimal = converted.iter().map(|p| p.amount).sum();
    let remainder = total_converted - sum_converted;
    if remainder == Decimal::ZERO {
        return converted;
    }

    if let Some((target_idx, _)) = payers
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.amount.cmp(&b.amount))
    {
        converted[target_idx].amount = round_amount(converted[target_idx].amount + remainder);
    }

    converted
}

pub(super) fn convert_split_details(
    details: &[SplitDetailInput],
    rate: Decimal,
    total_original: Decimal,
    total_converted: Decimal,
) -> Vec<SplitDetailInput> {
    let mut converted: Vec<SplitDetailInput> = details
        .iter()
        .map(|detail| SplitDetailInput {
            participant_id: detail.participant_id,
            amount: convert_amount(detail.amount, rate),
        })
        .collect();

    if converted.is_empty() {
        return converted;
    }

    let sum_original: Decimal = details.iter().map(|d| d.amount).sum();
    if sum_original != total_original {
        return converted;
    }

    let sum_converted: Decimal = converted.iter().map(|d| d.amount).sum();
    let remainder = total_converted - sum_converted;
    if remainder == Decimal::ZERO {
        return converted;
    }

    if let Some((target_idx, _)) = details
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.amount.cmp(&b.amount))
    {
        converted[target_idx].amount = round_amount(converted[target_idx].amount + remainder);
    }

    converted
}
