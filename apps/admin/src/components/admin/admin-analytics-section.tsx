'use client';

import type { AdminAnalytics } from '@/features/admin-analytics/types';
import { colorForIndex, formatMonth } from '@/features/admin-analytics/types';
import { Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CARD = { background: 'white', border: '1px solid #F0F0F0' };
const TOOLTIP = {
  borderRadius: '12px',
  border: '1px solid #F0F0F0',
  fontSize: '12px',
} as const;

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={CARD}>
      <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{title}</p>
      {hint && <p style={{ fontSize: '11px', color: '#AAA', marginTop: '2px' }}>{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p style={{ fontSize: '13px', color: '#AAA' }}>{label}</p>;
}

export function AdminAnalyticsSection({ analytics }: { analytics: AdminAnalytics | null }) {
  const categories = analytics?.categoryDistribution ?? [];
  const matches = analytics?.matchesByCategory ?? [];
  const cities = analytics?.topCities ?? [];
  const signups = (analytics?.signupsTimeline ?? []).map((row) => ({
    ...row,
    label: formatMonth(row.month),
  }));

  // Colour follows the category entity, so a category keeps its hue across both charts.
  const categoryColor = new Map(
    categories.map((entry, index) => [entry.name, colorForIndex(index)]),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl p-5" style={CARD}>
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: '#E8F0FA' }}
          >
            <Zap size={20} color="#2F76BB" />
          </div>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>
            {(analytics?.totalMatches ?? 0).toLocaleString('fr-FR')}
          </p>
          <p style={{ fontSize: '13px', color: '#888' }}>Matches cumulés</p>
        </div>

        <div className="rounded-2xl p-5" style={CARD}>
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: '#E8F7F3' }}
          >
            <Zap size={20} color="#61BCA6" />
          </div>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>
            {categories.length.toLocaleString('fr-FR')}
          </p>
          <p style={{ fontSize: '13px', color: '#888' }}>Catégories actives</p>
        </div>
      </div>

      <Panel title="Inscriptions par mois" hint="Basé sur la date d'inscription des membres">
        {signups.length === 0 ? (
          <Empty label="Aucune inscription enregistrée." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={signups} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
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
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(value) => [Number(value), 'Inscriptions']}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Inscriptions"
                stroke="#2F76BB"
                strokeWidth={2}
                fill="#2F76BB"
                fillOpacity={0.12}
                dot={{ r: 4, fill: '#2F76BB', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Matches par catégorie"
          hint="Somme des matches des membres de chaque catégorie"
        >
          {matches.length === 0 ? (
            <Empty label="Aucune donnée de matches par catégorie." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, matches.length * 42)}>
              <BarChart
                data={matches}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#555' }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: '#F5F7FA' }}
                  contentStyle={TOOLTIP}
                  formatter={(value) => [Number(value), 'Matches']}
                />
                <Bar dataKey="value" name="Matches" radius={[0, 4, 4, 0]} barSize={16}>
                  {matches.map((entry) => (
                    <Cell key={entry.name} fill={categoryColor.get(entry.name) ?? '#2F76BB'} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 11, fill: '#555', fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Répartition des catégories" hint="Nombre de membres par catégorie">
          {categories.length === 0 ? (
            <Empty label="Aucune catégorie renseignée." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="white"
                    strokeWidth={2}
                  >
                    {categories.map((entry) => (
                      <Cell key={entry.name} fill={categoryColor.get(entry.name) ?? '#2F76BB'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP}
                    formatter={(value, name) => [
                      `${Number(value)} membre${Number(value) > 1 ? 's' : ''}`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#666' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Villes les plus actives" hint="Nombre de membres par ville">
        {cities.length === 0 ? (
          <Empty label="Aucune ville renseignée." />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cities.map((entry) => (
              <div key={entry.city} className="rounded-xl p-3" style={{ background: '#F5F7FA' }}>
                <p style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{entry.city}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A2E' }}>{entry.users}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
