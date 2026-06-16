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

        remainders.sort_by_key(|b| std::cmp::Reverse(b.1));

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

        creditors.sort_by(|a, b| {
            b.balance
                .cmp(&a.balance)
                .then_with(|| a.participant_id.cmp(&b.participant_id))
        });
        debtors.sort_by(|a, b| {
            b.balance
                .cmp(&a.balance)
                .then_with(|| a.participant_id.cmp(&b.participant_id))
        });

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

    pub fn apply_settled_transfers_to_balances(
        balances: Vec<ParticipantBalance>,
        settled_debts: &[DebtEntry],
    ) -> Vec<ParticipantBalance> {
        let mut balance_map: HashMap<Uuid, Decimal> = balances
            .into_iter()
            .map(|balance| (balance.participant_id, balance.balance))
            .collect();

        for debt in settled_debts {
            *balance_map.entry(debt.debtor_id).or_insert(Decimal::ZERO) += debt.amount;
            *balance_map.entry(debt.creditor_id).or_insert(Decimal::ZERO) -= debt.amount;
        }

        balance_map
            .into_iter()
            .map(|(participant_id, balance)| ParticipantBalance {
                participant_id,
                balance,
            })
            .collect()
    }

    pub fn reduce_debts_by_settled_transfers(
        debts: Vec<DebtEntry>,
        settled_debts: &[DebtEntry],
    ) -> Vec<DebtEntry> {
        let mut pair_amounts: HashMap<(Uuid, Uuid), Decimal> = HashMap::new();
        let pair_key = |left: Uuid, right: Uuid| {
            if left <= right {
                (left, right)
            } else {
                (right, left)
            }
        };

        for debt in debts {
            let key = pair_key(debt.debtor_id, debt.creditor_id);
            let amount = pair_amounts.entry(key).or_insert(Decimal::ZERO);
            if debt.debtor_id == key.0 {
                *amount += debt.amount;
            } else {
                *amount -= debt.amount;
            }
        }

        for settled in settled_debts {
            let key = pair_key(settled.debtor_id, settled.creditor_id);
            let amount = pair_amounts.entry(key).or_insert(Decimal::ZERO);
            if settled.debtor_id == key.0 {
                *amount -= settled.amount;
            } else {
                *amount += settled.amount;
            }
        }

        let mut reduced_debts: Vec<_> = pair_amounts
            .into_iter()
            .filter_map(|((left, right), amount)| {
                if amount > Decimal::ZERO {
                    Some(DebtEntry {
                        debtor_id: left,
                        creditor_id: right,
                        amount,
                    })
                } else if amount < Decimal::ZERO {
                    Some(DebtEntry {
                        debtor_id: right,
                        creditor_id: left,
                        amount: amount.abs(),
                    })
                } else {
                    None
                }
            })
            .collect();

        reduced_debts.sort_by(|a, b| {
            b.amount
                .cmp(&a.amount)
                .then_with(|| a.debtor_id.cmp(&b.debtor_id))
                .then_with(|| a.creditor_id.cmp(&b.creditor_id))
        });

        reduced_debts
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
    fn test_net_balances_sums_duplicate_rows_without_multiplication() {
        let payer = Uuid::new_v4();
        let debtor = Uuid::new_v4();

        let payers = vec![
            (payer, Decimal::new(6000, 0)),
            (payer, Decimal::new(4000, 0)),
        ];
        let splits = vec![
            (payer, Decimal::new(2500, 0)),
            (payer, Decimal::new(2500, 0)),
            (debtor, Decimal::new(5000, 0)),
        ];

        let balances = SplitCalculator::calculate_net_balances(&payers, &splits);

        let payer_balance = balances.iter().find(|b| b.participant_id == payer).unwrap();
        let debtor_balance = balances
            .iter()
            .find(|b| b.participant_id == debtor)
            .unwrap();

        assert_eq!(payer_balance.balance, Decimal::new(5000, 0));
        assert_eq!(debtor_balance.balance, Decimal::new(-5000, 0));
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

    #[test]
    fn test_simplify_debts_preserves_net_totals() {
        let creditor_a = Uuid::new_v4();
        let creditor_b = Uuid::new_v4();
        let debtor_a = Uuid::new_v4();
        let debtor_b = Uuid::new_v4();

        let debts = SplitCalculator::simplify_debts(vec![
            ParticipantBalance {
                participant_id: creditor_a,
                balance: Decimal::new(7500, 0),
            },
            ParticipantBalance {
                participant_id: creditor_b,
                balance: Decimal::new(2500, 0),
            },
            ParticipantBalance {
                participant_id: debtor_a,
                balance: Decimal::new(-3000, 0),
            },
            ParticipantBalance {
                participant_id: debtor_b,
                balance: Decimal::new(-7000, 0),
            },
        ]);

        let total_debt: Decimal = debts.iter().map(|d| d.amount).sum();
        let debtor_a_total: Decimal = debts
            .iter()
            .filter(|d| d.debtor_id == debtor_a)
            .map(|d| d.amount)
            .sum();
        let debtor_b_total: Decimal = debts
            .iter()
            .filter(|d| d.debtor_id == debtor_b)
            .map(|d| d.amount)
            .sum();
        let creditor_a_total: Decimal = debts
            .iter()
            .filter(|d| d.creditor_id == creditor_a)
            .map(|d| d.amount)
            .sum();
        let creditor_b_total: Decimal = debts
            .iter()
            .filter(|d| d.creditor_id == creditor_b)
            .map(|d| d.amount)
            .sum();

        assert_eq!(total_debt, Decimal::new(10000, 0));
        assert_eq!(debtor_a_total, Decimal::new(3000, 0));
        assert_eq!(debtor_b_total, Decimal::new(7000, 0));
        assert_eq!(creditor_a_total, Decimal::new(7500, 0));
        assert_eq!(creditor_b_total, Decimal::new(2500, 0));
        assert!(debts.len() <= 3);
    }

    #[test]
    fn test_simplify_debts_is_deterministic_for_tied_balances() {
        let creditor_a = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
        let creditor_b = Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap();
        let debtor_a = Uuid::parse_str("00000000-0000-0000-0000-000000000003").unwrap();
        let debtor_b = Uuid::parse_str("00000000-0000-0000-0000-000000000004").unwrap();

        let debts = SplitCalculator::simplify_debts(vec![
            ParticipantBalance {
                participant_id: debtor_b,
                balance: Decimal::new(-5, 0),
            },
            ParticipantBalance {
                participant_id: creditor_b,
                balance: Decimal::new(5, 0),
            },
            ParticipantBalance {
                participant_id: debtor_a,
                balance: Decimal::new(-5, 0),
            },
            ParticipantBalance {
                participant_id: creditor_a,
                balance: Decimal::new(5, 0),
            },
        ]);

        assert_eq!(debts.len(), 2);
        assert_eq!(debts[0].debtor_id, debtor_a);
        assert_eq!(debts[0].creditor_id, creditor_a);
        assert_eq!(debts[1].debtor_id, debtor_b);
        assert_eq!(debts[1].creditor_id, creditor_b);
    }

    #[test]
    fn test_apply_settled_transfers_to_balances_removes_paid_amount() {
        let creditor = Uuid::new_v4();
        let debtor = Uuid::new_v4();

        let balances = SplitCalculator::apply_settled_transfers_to_balances(
            vec![
                ParticipantBalance {
                    participant_id: creditor,
                    balance: Decimal::new(100, 0),
                },
                ParticipantBalance {
                    participant_id: debtor,
                    balance: Decimal::new(-100, 0),
                },
            ],
            &[DebtEntry {
                debtor_id: debtor,
                creditor_id: creditor,
                amount: Decimal::new(40, 0),
            }],
        );

        let debts = SplitCalculator::simplify_debts(balances);

        assert_eq!(debts.len(), 1);
        assert_eq!(debts[0].debtor_id, debtor);
        assert_eq!(debts[0].creditor_id, creditor);
        assert_eq!(debts[0].amount, Decimal::new(60, 0));
    }

    #[test]
    fn test_reduce_debts_by_settled_transfers_drops_exactly_settled_debt() {
        let creditor = Uuid::new_v4();
        let debtor = Uuid::new_v4();

        let debts = SplitCalculator::reduce_debts_by_settled_transfers(
            vec![DebtEntry {
                debtor_id: debtor,
                creditor_id: creditor,
                amount: Decimal::new(50, 0),
            }],
            &[DebtEntry {
                debtor_id: debtor,
                creditor_id: creditor,
                amount: Decimal::new(50, 0),
            }],
        );

        assert!(debts.is_empty());
    }

    #[test]
    fn test_reduce_debts_by_settled_transfers_emits_reverse_residual() {
        let creditor = Uuid::parse_str("00000000-0000-0000-0000-000000000011").unwrap();
        let debtor = Uuid::parse_str("00000000-0000-0000-0000-000000000012").unwrap();

        let debts = SplitCalculator::reduce_debts_by_settled_transfers(
            vec![DebtEntry {
                debtor_id: debtor,
                creditor_id: creditor,
                amount: Decimal::new(50, 0),
            }],
            &[DebtEntry {
                debtor_id: debtor,
                creditor_id: creditor,
                amount: Decimal::new(80, 0),
            }],
        );

        assert_eq!(debts.len(), 1);
        assert_eq!(debts[0].debtor_id, creditor);
        assert_eq!(debts[0].creditor_id, debtor);
        assert_eq!(debts[0].amount, Decimal::new(30, 0));
    }

    #[test]
    fn test_reduce_debts_by_settled_transfers_merges_opposite_pair() {
        let user_a = Uuid::parse_str("00000000-0000-0000-0000-000000000021").unwrap();
        let user_b = Uuid::parse_str("00000000-0000-0000-0000-000000000022").unwrap();

        let debts = SplitCalculator::reduce_debts_by_settled_transfers(
            vec![
                DebtEntry {
                    debtor_id: user_a,
                    creditor_id: user_b,
                    amount: Decimal::new(100, 0),
                },
                DebtEntry {
                    debtor_id: user_b,
                    creditor_id: user_a,
                    amount: Decimal::new(40, 0),
                },
            ],
            &[DebtEntry {
                debtor_id: user_a,
                creditor_id: user_b,
                amount: Decimal::new(10, 0),
            }],
        );

        assert_eq!(debts.len(), 1);
        assert_eq!(debts[0].debtor_id, user_a);
        assert_eq!(debts[0].creditor_id, user_b);
        assert_eq!(debts[0].amount, Decimal::new(50, 0));
    }

    #[test]
    fn test_reduce_debts_by_settled_transfers_is_deterministic() {
        let user_a = Uuid::parse_str("00000000-0000-0000-0000-000000000031").unwrap();
        let user_b = Uuid::parse_str("00000000-0000-0000-0000-000000000032").unwrap();
        let user_c = Uuid::parse_str("00000000-0000-0000-0000-000000000033").unwrap();
        let user_d = Uuid::parse_str("00000000-0000-0000-0000-000000000034").unwrap();

        let debts = SplitCalculator::reduce_debts_by_settled_transfers(
            vec![
                DebtEntry {
                    debtor_id: user_c,
                    creditor_id: user_d,
                    amount: Decimal::new(20, 0),
                },
                DebtEntry {
                    debtor_id: user_b,
                    creditor_id: user_c,
                    amount: Decimal::new(30, 0),
                },
                DebtEntry {
                    debtor_id: user_a,
                    creditor_id: user_b,
                    amount: Decimal::new(50, 0),
                },
            ],
            &[],
        );

        assert_eq!(debts.len(), 3);
        assert_eq!(debts[0].debtor_id, user_a);
        assert_eq!(debts[0].creditor_id, user_b);
        assert_eq!(debts[0].amount, Decimal::new(50, 0));
        assert_eq!(debts[1].debtor_id, user_b);
        assert_eq!(debts[1].creditor_id, user_c);
        assert_eq!(debts[1].amount, Decimal::new(30, 0));
        assert_eq!(debts[2].debtor_id, user_c);
        assert_eq!(debts[2].creditor_id, user_d);
        assert_eq!(debts[2].amount, Decimal::new(20, 0));
    }
}
