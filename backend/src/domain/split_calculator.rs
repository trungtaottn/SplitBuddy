#![allow(dead_code)]
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::{Decimal, RoundingStrategy};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ParticipantBalance {
    pub participant_id: Uuid,
    pub balance: Decimal,
}

#[derive(Debug, Clone)]
pub struct DebtEntry {
    pub debtor_id: Uuid,
    pub creditor_id: Uuid,
    pub amount: Decimal,
}

pub struct SplitCalculator;

impl SplitCalculator {
    pub fn calculate_equal_split_with_scale(
        total_amount: Decimal,
        participant_count: usize,
        scale: u32,
    ) -> Vec<Decimal> {
        if participant_count == 0 {
            return vec![];
        }

        let scale_factor = Decimal::from_i128_with_scale(10_i128.pow(scale), 0);
        let total_minor = (total_amount * scale_factor)
            .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
            .to_i128()
            .unwrap_or(0);

        let count = participant_count as i128;
        let base = total_minor / count;
        let remainder = (total_minor % count).unsigned_abs() as usize;
        let sign = if total_minor < 0 { -1 } else { 1 };

        let mut splits = Vec::with_capacity(participant_count);
        for i in 0..participant_count {
            let extra = if i < remainder { sign } else { 0 };
            let minor_amount = base + extra;
            splits.push(Decimal::from_i128_with_scale(minor_amount, scale));
        }

        splits
    }

    pub fn calculate_equal_split(total_amount: Decimal, participant_count: usize) -> Vec<Decimal> {
        Self::calculate_equal_split_with_scale(total_amount, participant_count, 2)
    }

    pub fn calculate_weighted_split_with_scale(
        total_amount: Decimal,
        weights: &[Decimal],
        scale: u32,
    ) -> Vec<Decimal> {
        if weights.is_empty() {
            return vec![];
        }

        let scale_factor = Decimal::from_i128_with_scale(10_i128.pow(scale), 0);
        let total_minor = (total_amount * scale_factor)
            .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
            .to_i128()
            .unwrap_or(0);

        let weight_minors: Vec<i128> = weights
            .iter()
            .map(|w| {
                (w * scale_factor)
                    .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
                    .to_i128()
                    .unwrap_or(0)
            })
            .collect();

        let total_weight: i128 = weight_minors.iter().sum();
        if total_weight == 0 {
            return vec![Decimal::ZERO; weights.len()];
        }

        let mut bases: Vec<i128> = Vec::with_capacity(weights.len());
        let mut remainders: Vec<(usize, i128)> = Vec::with_capacity(weights.len());
        for (idx, weight_minor) in weight_minors.iter().enumerate() {
            let numerator = total_minor * *weight_minor;
            let base = numerator / total_weight;
            let remainder = (numerator % total_weight).abs();
            bases.push(base);
            remainders.push((idx, remainder));
        }

        let mut allocated: i128 = bases.iter().sum();
        let mut leftover = total_minor - allocated;

        remainders.sort_by(|a, b| b.1.cmp(&a.1));

        let step = if leftover < 0 { -1 } else { 1 };
        let mut i = 0usize;
        while leftover != 0 && i < remainders.len() {
            let idx = remainders[i].0;
            bases[idx] += step;
            allocated += step;
            leftover = total_minor - allocated;
            i += 1;
            if i == remainders.len() && leftover != 0 {
                i = 0;
            }
        }

        bases
            .into_iter()
            .map(|minor| Decimal::from_i128_with_scale(minor, scale))
            .collect()
    }

    pub fn calculate_net_balances(
        payers: &[(Uuid, Decimal)],
        splits: &[(Uuid, Decimal)],
    ) -> Vec<ParticipantBalance> {
        let mut balances: HashMap<Uuid, Decimal> = HashMap::new();

        for (participant_id, amount_paid) in payers {
            *balances.entry(*participant_id).or_insert(Decimal::ZERO) += amount_paid;
        }

        for (participant_id, amount_owed) in splits {
            *balances.entry(*participant_id).or_insert(Decimal::ZERO) -= amount_owed;
        }

        balances
            .into_iter()
            .map(|(participant_id, balance)| ParticipantBalance {
                participant_id,
                balance,
            })
            .collect()
    }

    pub fn simplify_debts(balances: Vec<ParticipantBalance>) -> Vec<DebtEntry> {
        let mut creditors: Vec<_> = balances
            .iter()
            .filter(|b| b.balance > Decimal::ZERO)
            .cloned()
            .collect();

        let mut debtors: Vec<_> = balances
            .iter()
            .filter(|b| b.balance < Decimal::ZERO)
            .map(|b| ParticipantBalance {
                participant_id: b.participant_id,
                balance: b.balance.abs(),
            })
            .collect();

        creditors.sort_by(|a, b| b.balance.cmp(&a.balance));
        debtors.sort_by(|a, b| b.balance.cmp(&a.balance));

        let mut debts = Vec::new();

        let mut creditor_idx = 0;
        let mut debtor_idx = 0;

        while creditor_idx < creditors.len() && debtor_idx < debtors.len() {
            let creditor = &mut creditors[creditor_idx];
            let debtor = &mut debtors[debtor_idx];

            let transfer_amount = creditor.balance.min(debtor.balance);

            if transfer_amount > Decimal::ZERO {
                debts.push(DebtEntry {
                    debtor_id: debtor.participant_id,
                    creditor_id: creditor.participant_id,
                    amount: transfer_amount,
                });

                creditor.balance -= transfer_amount;
                debtor.balance -= transfer_amount;
            }

            if creditor.balance == Decimal::ZERO {
                creditor_idx += 1;
            }
            if debtor.balance == Decimal::ZERO {
                debtor_idx += 1;
            }
        }

        debts
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_equal_split() {
        let total = Decimal::new(300000, 0);
        let splits = SplitCalculator::calculate_equal_split(total, 3);

        assert_eq!(splits.len(), 3);
        let sum: Decimal = splits.iter().sum();
        assert_eq!(sum, total);
    }

    #[test]
    fn test_equal_split_with_remainder() {
        let total = Decimal::new(100, 0);
        let splits = SplitCalculator::calculate_equal_split(total, 3);

        assert_eq!(splits.len(), 3);
        let sum: Decimal = splits.iter().sum();
        assert_eq!(sum, total);
    }

    #[test]
    fn test_equal_split_rounding_distribution() {
        let total = Decimal::new(100, 0);
        let splits = SplitCalculator::calculate_equal_split(total, 3);

        let min = splits.iter().min().unwrap();
        let max = splits.iter().max().unwrap();
        let diff = *max - *min;

        assert_eq!(diff, Decimal::new(1, 2));
    }

    #[test]
    fn test_weighted_split_distribution() {
        let total = Decimal::new(100, 0);
        let weights = vec![Decimal::new(1, 0), Decimal::new(2, 0), Decimal::new(1, 0)];
        let splits = SplitCalculator::calculate_weighted_split_with_scale(total, &weights, 2);

        assert_eq!(splits.len(), 3);
        let sum: Decimal = splits.iter().sum();
        assert_eq!(sum, total);
        assert!(splits[1] > splits[0]);
    }

    #[test]
    fn test_weighted_split_zero_total_weight() {
        let total = Decimal::new(100, 0);
        let weights = vec![Decimal::ZERO, Decimal::ZERO, Decimal::ZERO];
        let splits = SplitCalculator::calculate_weighted_split_with_scale(total, &weights, 2);

        assert_eq!(splits.len(), 3);
        assert!(splits.iter().all(|s| *s == Decimal::ZERO));
    }

    #[test]
    fn test_weighted_split_with_fractional_weights() {
        let total = Decimal::new(100, 0);
        let weights = vec![Decimal::new(15, 1), Decimal::new(25, 1)]; // 1.5 and 2.5
        let splits = SplitCalculator::calculate_weighted_split_with_scale(total, &weights, 2);

        assert_eq!(splits.len(), 2);
        let sum: Decimal = splits.iter().sum();
        assert_eq!(sum, total);
        assert!(splits[1] > splits[0]);
    }

    #[test]
    fn test_net_balances() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let user_c = Uuid::new_v4();

        let payers = vec![(user_a, Decimal::new(300000, 0))];

        let splits = vec![
            (user_a, Decimal::new(100000, 0)),
            (user_b, Decimal::new(100000, 0)),
            (user_c, Decimal::new(100000, 0)),
        ];

        let balances = SplitCalculator::calculate_net_balances(&payers, &splits);

        let a_balance = balances
            .iter()
            .find(|b| b.participant_id == user_a)
            .unwrap();
        let b_balance = balances
            .iter()
            .find(|b| b.participant_id == user_b)
            .unwrap();
        let c_balance = balances
            .iter()
            .find(|b| b.participant_id == user_c)
            .unwrap();

        assert_eq!(a_balance.balance, Decimal::new(200000, 0));
        assert_eq!(b_balance.balance, Decimal::new(-100000, 0));
        assert_eq!(c_balance.balance, Decimal::new(-100000, 0));
    }

    #[test]
    fn test_simplify_debts() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();
        let user_c = Uuid::new_v4();

        let balances = vec![
            ParticipantBalance {
                participant_id: user_a,
                balance: Decimal::new(200000, 0),
            },
            ParticipantBalance {
                participant_id: user_b,
                balance: Decimal::new(-100000, 0),
            },
            ParticipantBalance {
                participant_id: user_c,
                balance: Decimal::new(-100000, 0),
            },
        ];

        let debts = SplitCalculator::simplify_debts(balances);

        assert_eq!(debts.len(), 2);
        let total_debt: Decimal = debts.iter().map(|d| d.amount).sum();
        assert_eq!(total_debt, Decimal::new(200000, 0));
    }

    #[test]
    fn test_simplify_debts_all_zero() {
        let user_a = Uuid::new_v4();
        let user_b = Uuid::new_v4();

        let balances = vec![
            ParticipantBalance {
                participant_id: user_a,
                balance: Decimal::ZERO,
            },
            ParticipantBalance {
                participant_id: user_b,
                balance: Decimal::ZERO,
            },
        ];

        let debts = SplitCalculator::simplify_debts(balances);
        assert!(debts.is_empty());
    }

    #[test]
    fn test_simplify_debts_one_creditor_two_debtors() {
        let creditor = Uuid::new_v4();
        let debtor_a = Uuid::new_v4();
        let debtor_b = Uuid::new_v4();

        let balances = vec![
            ParticipantBalance {
                participant_id: creditor,
                balance: Decimal::new(10, 0),
            },
            ParticipantBalance {
                participant_id: debtor_a,
                balance: Decimal::new(-5, 0),
            },
            ParticipantBalance {
                participant_id: debtor_b,
                balance: Decimal::new(-5, 0),
            },
        ];

        let debts = SplitCalculator::simplify_debts(balances);
        assert_eq!(debts.len(), 2);
        let total_debt: Decimal = debts.iter().map(|d| d.amount).sum();
        assert_eq!(total_debt, Decimal::new(10, 0));
        assert!(debts.iter().all(|d| d.creditor_id == creditor));
    }
}
