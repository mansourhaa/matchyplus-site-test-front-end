import type { AdminTransaction } from '@/features/admin-transactions/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminTransactionsSection } from './admin-transactions-section';

afterEach(() => {
  cleanup();
});

function buildTransaction(overrides: Partial<AdminTransaction> = {}): AdminTransaction {
  return {
    id: 't1',
    type: 'credit',
    label: 'Recharge de points',
    userName: 'Karim B.',
    date: '24 août 2026',
    amount: 50,
    unit: 'pts',
    ...overrides,
  };
}

describe('AdminTransactionsSection', () => {
  it('shows an explanatory empty state when there are no transactions', () => {
    render(<AdminTransactionsSection title="Transactions récentes" transactions={[]} />);

    expect(screen.getByText('Aucune transaction pour le moment')).toBeInTheDocument();
    expect(
      screen.getByText(/apparaîtront ici dès qu'une transaction sera enregistrée/),
    ).toBeInTheDocument();
  });

  it('renders each transaction with its label, user, date and signed amount', () => {
    render(
      <AdminTransactionsSection
        title="Transactions récentes"
        transactions={[
          buildTransaction({ id: 't1', type: 'credit', amount: 50, unit: 'pts' }),
          buildTransaction({
            id: 't2',
            type: 'debit',
            label: 'Achat de boost',
            amount: 20,
            unit: 'DT',
          }),
        ]}
      />,
    );

    expect(screen.getByText('Recharge de points')).toBeInTheDocument();
    expect(screen.getByText('+50 pts')).toBeInTheDocument();
    expect(screen.getByText('Achat de boost')).toBeInTheDocument();
    expect(screen.getByText('-20 DT')).toBeInTheDocument();
  });

  it('shows a bonus transaction with a positive sign, matching credit', () => {
    render(
      <AdminTransactionsSection
        title="Transactions récentes"
        transactions={[buildTransaction({ type: 'bonus', amount: 10, unit: 'pts' })]}
      />,
    );

    expect(screen.getByText('+10 pts')).toBeInTheDocument();
  });

  it('truncates the list to the preview limit when provided', () => {
    const transactions = Array.from({ length: 6 }, (_, i) =>
      buildTransaction({ id: `t${i}`, label: `Transaction ${i}` }),
    );

    render(
      <AdminTransactionsSection
        title="Transactions récentes"
        transactions={transactions}
        limit={4}
      />,
    );

    expect(screen.getByText('Transaction 0')).toBeInTheDocument();
    expect(screen.getByText('Transaction 3')).toBeInTheDocument();
    expect(screen.queryByText('Transaction 4')).not.toBeInTheDocument();
  });

  it('shows every transaction when no limit is provided', () => {
    const transactions = Array.from({ length: 6 }, (_, i) =>
      buildTransaction({ id: `t${i}`, label: `Transaction ${i}` }),
    );

    render(<AdminTransactionsSection title="Transactions live" transactions={transactions} />);

    expect(screen.getByText('Transaction 5')).toBeInTheDocument();
  });

  it('only shows the "Voir tout" link when onSeeAll is provided', () => {
    const onSeeAll = vi.fn();
    const { rerender } = render(
      <AdminTransactionsSection
        title="Transactions récentes"
        transactions={[buildTransaction()]}
        onSeeAll={onSeeAll}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voir tout →' }));
    expect(onSeeAll).toHaveBeenCalledTimes(1);

    rerender(
      <AdminTransactionsSection
        title="Transactions récentes"
        transactions={[buildTransaction()]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Voir tout →' })).not.toBeInTheDocument();
  });
});
