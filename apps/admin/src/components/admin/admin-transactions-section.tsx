'use client';

import type { AdminTransaction, AdminTransactionType } from '@/features/admin-transactions/types';
import { ArrowDownLeft, ArrowUpRight, Gift, Receipt } from 'lucide-react';

const TYPE_ICON: Record<AdminTransactionType, typeof ArrowDownLeft> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
  bonus: Gift,
};

const TYPE_COLOR: Record<AdminTransactionType, string> = {
  credit: '#61BCA6',
  debit: '#E74C3C',
  bonus: '#F5A623',
};

const TYPE_BG: Record<AdminTransactionType, string> = {
  credit: '#E8F7F3',
  debit: '#FFF0F0',
  bonus: '#FFF8EB',
};

function LiveBadge() {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{ background: '#E8F7F3', fontSize: '10px', fontWeight: 700, color: '#61BCA6' }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      LIVE
    </span>
  );
}

export function AdminTransactionsSection({
  title,
  transactions,
  limit,
  isLive = false,
  onSeeAll,
}: {
  title: string;
  transactions: AdminTransaction[];
  /** Preview mode (dashboard card) when set; the full list (subscriptions page) otherwise. */
  limit?: number;
  isLive?: boolean;
  onSeeAll?: () => void;
}) {
  const visible = limit ? transactions.slice(0, limit) : transactions;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #F0F0F0' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{title}</p>
          {isLive && transactions.length > 0 && <LiveBadge />}
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            style={{ fontSize: '13px', color: '#2F76BB', fontWeight: 600 }}
          >
            Voir tout →
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: '#F5F7FA' }}
          >
            <Receipt size={20} color="#AAA" />
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>
            Aucune transaction pour le moment
          </p>
          <p style={{ fontSize: '12px', color: '#AAA', maxWidth: '320px' }}>
            Les rechargements, abonnements et autres mouvements apparaîtront ici dès qu&apos;une
            transaction sera enregistrée.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((transaction) => {
            const Icon = TYPE_ICON[transaction.type];
            const isCredit = transaction.type === 'credit';
            const isBonus = transaction.type === 'bonus';
            const amountColor = isBonus ? '#F5A623' : isCredit ? '#61BCA6' : '#E74C3C';
            const sign = isBonus || isCredit ? '+' : '-';

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: '#F5F7FA' }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: TYPE_BG[transaction.type] }}
                >
                  <Icon size={16} color={TYPE_COLOR[transaction.type]} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate"
                    style={{ fontSize: '13px', fontWeight: 600, color: '#353535' }}
                  >
                    {transaction.label}
                  </p>
                  <p style={{ fontSize: '11px', color: '#AAA' }}>
                    {transaction.userName} · {transaction.date}
                  </p>
                </div>
                <span
                  className="shrink-0"
                  style={{ fontSize: '13px', fontWeight: 700, color: amountColor }}
                >
                  {sign}
                  {transaction.amount} {transaction.unit}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
