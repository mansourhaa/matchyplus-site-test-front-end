export interface AdminAnalytics {
  signupsTimeline: Array<{ month: string; users: number }>;
  platformTimeline: Array<{ month: string; users: number; revenue: number }>;
  trends: {
    users: number;
    revenue: number;
    matches: number;
    conversion: number;
  } | null;
  categoryDistribution: Array<{ name: string; value: number }>;
  matchesByCategory: Array<{ name: string; value: number }>;
  topCities: Array<{ city: string; users: number }>;
  revenueByPlan: Array<{ plan: string; users: number; monthlyRevenue: number }>;
  totalMatches: number;
  matchesThisMonth: number;
  estimatedMonthlyRevenue: number;
}

export interface AdminAnalyticsState {
  analytics: AdminAnalytics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Matchy+ brand hues, in fixed order. Assigned by entity, never cycled and never by rank.
 * They clear CVD and normal-vision separation but sit under 3:1 against a light surface,
 * so every chart using them also carries a legend or direct labels — never colour alone.
 */
export const CHART_COLORS = [
  '#2F76BB',
  '#61BCA6',
  '#F5A623',
  '#9B59B6',
  '#E74C3C',
  '#95A5A6',
] as const;

/** Stable colour per category name, so filtering never repaints the survivors. */
export function colorForIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** "2026-07" -> "juil. 2026" */
export function formatMonth(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}
