#![allow(dead_code)]
use rust_decimal::Decimal;
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
    pub fn calculate_equal_split(total_amount: Decimal, participant_count: usize) -> Vec<Decimal> {
        if participant_count == 0 {
            return vec![];
        }

        let count = Decimal::from(participant_count);
        let base_amount = total_amount / count;
        let remainder = total_amount - (base_amount * count);

        let mut splits = vec![base_amount; participant_count];

        let remainder_cents = (remainder * Decimal::from(100)).to_string();
        if let Ok(cents) = remainder_cents.parse::<i32>() {
            for i in 0..cents.unsigned_abs() as usize {
                if i < splits.len() {
                    splits[i] += Decimal::new(1, 2);
                }
            }
        }

        splits
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
}
