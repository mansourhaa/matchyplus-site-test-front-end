'use client';

import { formatMonth } from '@/features/admin-analytics/types';
import type { AdminAnalytics } from '@/features/admin-analytics/types';
import { PLAN_COLOR, PLAN_LABEL, STATUS_COLOR } from '@/features/admin-users/labels';
import type { AdminManagedUser, AdminStats } from '@/features/admin-users/types';
import { CreditCard, type LucideIcon, TrendingDown, TrendingUp, Users, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  const color = up ? '#61BCA6' : '#E74C3C';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ fontSize: '12px', fontWeight: 700, background: up ? '#E8F7F3' : '#FFF0F0', color }}
      title="Variation par rapport au mois précédent"
    >
      <Icon size={12} />
      {Math.abs(value)}%
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  trend?: number | null;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{
        background: 'white',
        border: '1px solid #F0F0F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: bg }}
        >
          <Icon size={20} color={color} />
        </div>
        {trend !== null && trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div>
        <p style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>{value}</p>
        <p style={{ fontSize: '13px', color: '#888' }}>{label}</p>
      </div>
    </div>
  );
}

export function AdminDashboardSection({
  stats,
  analytics,
  users,
  onSelectUser,
  onSeeAll,
}: {
  stats: AdminStats | null;
  analytics: AdminAnalytics | null;
  users: AdminManagedUser[];
  onSelectUser: (user: AdminManagedUser) => void;
  onSeeAll: () => void;
}) {
  const total = stats?.totalUsers ?? 0;
  const paying = (stats?.premiumUsers ?? 0) + (stats?.premiumPlusUsers ?? 0);
  const conversion = total > 0 ? Math.round((paying / total) * 100) : 0;

  const subscriptionData = [
    { name: PLAN_LABEL.FREE, value: stats?.freeUsers ?? 0, color: PLAN_COLOR.FREE },
    { name: PLAN_LABEL.PREMIUM, value: stats?.premiumUsers ?? 0, color: PLAN_COLOR.PREMIUM },
    {
      name: PLAN_LABEL.PREMIUM_PLUS,
      value: stats?.premiumPlusUsers ?? 0,
      color: PLAN_COLOR.PREMIUM_PLUS,
    },
  ];

  const timeline = (analytics?.platformTimeline ?? []).map((row) => ({
    ...row,
    label: formatMonth(row.month),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Utilisateurs total"
          value={total.toLocaleString('fr-FR')}
          icon={Users}
          color="#2F76BB"
          bg="#E8F0FA"
          trend={analytics?.trends?.users}
        />
        <StatCard
          label="Matches ce mois"
          value={(analytics?.matchesThisMonth ?? 0).toLocaleString('fr-FR')}
          icon={Zap}
          color="#61BCA6"
          bg="#E8F7F3"
          trend={analytics?.trends?.matches}
        />
        <StatCard
          label="Revenus estimés (DT)"
          value={(analytics?.estimatedMonthlyRevenue ?? 0).toFixed(2)}
          icon={CreditCard}
          color="#F5A623"
          bg="#FFF8EB"
          trend={analytics?.trends?.revenue}
        />
        <StatCard
          label="Taux conversion"
          value={`${conversion}%`}
          icon={TrendingUp}
          color="#9B59B6"
          bg="#F3E8FA"
          trend={analytics?.trends?.conversion}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="rounded-2xl p-5 lg:col-span-2"
          style={{ background: 'white', border: '1px solid #F0F0F0' }}
        >
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>
            Évolution de la plateforme
          </p>
          <p style={{ fontSize: '11px', color: '#AAA', marginBottom: '16px' }}>
            Utilisateurs cumulés et revenus estimés (prix du forfait × abonnés), par mois
            d&apos;inscription.
          </p>
          {timeline.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#AAA' }}>Aucune donnée d&apos;évolution.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #F0F0F0',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    name === 'Revenus (DT)' ? `${Number(value).toFixed(2)} DT` : Number(value),
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Utilisateurs"
                  stroke="#2F76BB"
                  strokeWidth={2}
                  fill="#2F76BB"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenus (DT)"
                  stroke="#61BCA6"
                  strokeWidth={2}
                  fill="#61BCA6"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: 'white', border: '1px solid #F0F0F0' }}
        >
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '12px' }}>
            Répartition forfaits
          </p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={subscriptionData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                dataKey="value"
                paddingAngle={3}
                stroke="white"
                strokeWidth={2}
              >
                {subscriptionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                formatter={(value, name) => [Number(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {subscriptionData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>{entry.name}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: entry.color }}>
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #F0F0F0' }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>Derniers inscrits</p>
            <LiveBadge />
          </div>
          <button
            type="button"
            onClick={onSeeAll}
            style={{ fontSize: '13px', color: '#2F76BB', fontWeight: 600 }}
          >
            Voir tout →
          </button>
        </div>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#AAA' }}>Aucun utilisateur pour le moment.</p>
          ) : (
            users.slice(0, 5).map((user) => (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#F5F7FA]"
                onClick={() => onSelectUser(user)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSelectUser(user);
                }}
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-9 w-9 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
                  >
                    <span className="text-white" style={{ fontSize: '13px', fontWeight: 800 }}>
                      {user.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}>{user.name}</p>
                  <p className="truncate" style={{ fontSize: '11px', color: '#888' }}>
                    {[user.job, user.city].filter(Boolean).join(' · ') || user.email}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: PLAN_COLOR[user.plan] + '20',
                    color: PLAN_COLOR[user.plan],
                  }}
                >
                  {PLAN_LABEL[user.plan]}
                </span>
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLOR[user.status] }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
