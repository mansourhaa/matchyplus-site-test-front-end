'use client';

import { AdminTransactionsSection } from '@/components/admin/admin-transactions-section';
import type { AdminAnalytics } from '@/features/admin-analytics/types';
import type { AdminPlan } from '@/features/admin-plans/types';
import type { AdminTransaction } from '@/features/admin-transactions/types';
import type { AdminStats } from '@/features/admin-users/types';
import { Crown } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function AdminSubscriptionsSection({
  stats,
  plans,
  analytics,
  transactions,
}: {
  stats: AdminStats | null;
  plans: AdminPlan[];
  analytics: AdminAnalytics | null;
  transactions: AdminTransaction[];
}) {
  const total = Math.max(1, stats?.totalUsers ?? 0);

  const countFor = (id: AdminPlan['id']) => {
    if (id === 'FREE') return stats?.freeUsers ?? 0;
    if (id === 'PREMIUM') return stats?.premiumUsers ?? 0;
    return stats?.premiumPlusUsers ?? 0;
  };

  const breakdown = plans.map((plan) => {
    const count = countFor(plan.id);
    return {
      id: plan.id,
      label: `Comptes ${plan.name}`,
      count,
      color: plan.color,
      pct: Math.round((count / total) * 100),
    };
  });

  // Users and dinars are different units, so they get separate treatment rather than
  // sharing one axis: the counts live in the cards above, the chart plots revenue only.
  const revenueData = (analytics?.revenueByPlan ?? []).map((row) => {
    const plan = plans.find((entry) => entry.name === row.plan);
    return { ...row, color: plan?.color ?? '#2F76BB' };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {breakdown.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl p-5"
            style={{ background: 'white', border: '1px solid #F0F0F0' }}
          >
            <Crown size={20} color={entry.color} />
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginTop: '8px' }}>
              {entry.count.toLocaleString('fr-FR')}
            </p>
            <p style={{ fontSize: '13px', color: '#888' }}>{entry.label}</p>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: '#F0F0F0' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${entry.pct}%`,
                  background: entry.color,
                  transition: 'width 0.5s',
                }}
              />
            </div>
            <p style={{ fontSize: '11px', color: entry.color, fontWeight: 600, marginTop: '4px' }}>
              {entry.pct}%
            </p>
          </div>
        ))}
      </div>

      <AdminTransactionsSection title="Transactions live" transactions={transactions} />

      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #F0F0F0' }}>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>
            Revenus mensuels estimés par forfait
          </p>
          <p style={{ fontSize: '13px', color: '#888' }}>
            Total :{' '}
            <strong style={{ color: '#1A1A2E' }}>
              {(analytics?.estimatedMonthlyRevenue ?? 0).toFixed(2)} DT
            </strong>
          </p>
        </div>
        <p style={{ fontSize: '11px', color: '#AAA', marginBottom: '14px' }}>
          Estimation : prix du forfait × nombre d&apos;abonnés. Aucun paiement réel n&apos;est
          encore enregistré.
        </p>

        {revenueData.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#AAA' }}>Aucun forfait payant actif.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis
                dataKey="plan"
                tick={{ fontSize: 12, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                width={44}
                unit=" DT"
              />
              <Tooltip
                cursor={{ fill: '#F5F7FA' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #F0F0F0',
                  fontSize: '12px',
                }}
                formatter={(value, _name, entry) => {
                  const subscribers = Number(entry?.payload?.users ?? 0);
                  return [
                    `${Number(value).toFixed(2)} DT · ${subscribers} abonné${subscribers > 1 ? 's' : ''}`,
                    'Revenu mensuel',
                  ];
                }}
              />
              <Bar dataKey="monthlyRevenue" name="Revenu mensuel (DT)" radius={[4, 4, 0, 0]}>
                {revenueData.map((row) => (
                  <Cell key={row.plan} fill={row.color} />
                ))}
                <LabelList
                  dataKey="monthlyRevenue"
                  position="top"
                  formatter={(value) => `${Number(value).toFixed(2)} DT`}
                  style={{ fontSize: 11, fill: '#555', fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
