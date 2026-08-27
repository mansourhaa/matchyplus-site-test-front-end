/**
 * No backend exists yet for real transactions (wallet top-ups, subscription payments, boost
 * purchases, point conversions) — there is no Transaction/Payment model anywhere in the
 * schema. This type describes the shape a future real endpoint would return; until then,
 * callers always pass an empty list and the UI shows its proper empty state instead of
 * fabricated rows.
 */
export type AdminTransactionType = 'credit' | 'debit' | 'bonus';

export interface AdminTransaction {
  id: string;
  type: AdminTransactionType;
  label: string;
  userName: string;
  date: string;
  amount: number;
  unit: 'DT' | 'pts';
}
