import { I18nProvider } from '@/features/i18n/i18n-provider';
import { LOCALE_STORAGE_KEY } from '@/features/i18n/messages';
import type { FeedProfile } from '@/features/matching/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LiveScorePanel } from './live-ai-score';

const baseProfile: FeedProfile = {
  id: 'cand-1',
  name: 'Youssef Khelifi',
  image: null,
  bio: 'UX Designer',
  job: 'UX Design',
  category: 'Design',
  city: 'Tunis',
  interests: ['Design', 'Figma'],
  goals: ['recruter'],
  activity_sector: 'Technologie',
  service_type: 'Design',
  distance_km: 99.6,
  match_score: 75,
  match_group: 1,
  match_type_label: 'Forte complémentarité',
  confidence: 'high',
  rating: 4.5,
  liked_me: false,
  compatibility: [
    { dimension: 'skills', score: 85, weight: 0.28, contribution: 24 },
    { dimension: 'proximity', score: 65, weight: 0.22, contribution: 14 },
    { dimension: 'goals', score: 70, weight: 0.18, contribution: 13 },
    { dimension: 'availability', score: 80, weight: 0.12, contribution: 10 },
    { dimension: 'languages', score: 90, weight: 0.10, contribution: 9 },
    { dimension: 'quality', score: 95, weight: 0.10, contribution: 10 },
  ],
};

describe('LiveScorePanel (MATCH-002)', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the 6 user-facing matching dimensions without exposing background params or percentages', () => {
    render(
      <I18nProvider>
        <LiveScorePanel profile={baseProfile} />
      </I18nProvider>,
    );

    // Expand details
    const detailButton = screen.getByRole('button', { name: /détail|details/i });
    fireEvent.click(detailButton);

    // Verify the 6 user-facing criteria are present without percentage labels
    expect(screen.getByText('Compétences & intérêts')).toBeInTheDocument();
    expect(screen.getByText('Proximité géographique')).toBeInTheDocument();
    expect(screen.getByText('Alignement des objectifs', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Disponibilité partagée')).toBeInTheDocument();
    expect(screen.getByText('Langues communes')).toBeInTheDocument();
    expect(screen.getByText('Qualité du profil')).toBeInTheDocument();

    // Verify background criteria are NOT exposed in details
    expect(screen.queryByText(/Secteur d'activité/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Complémentarité des rôles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Budget \/ Tarifs/i)).not.toBeInTheDocument();

    // Verify raw percentages are removed from the dimension rows
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
    expect(screen.queryByText('65%')).not.toBeInTheDocument();
    expect(screen.queryByText('70%')).not.toBeInTheDocument();
    expect(screen.queryByText('80%')).not.toBeInTheDocument();
    expect(screen.queryByText('90%')).not.toBeInTheDocument();
    expect(screen.queryByText('95%')).not.toBeInTheDocument();
  });

  it('safely handles missing GPS coordinates without rendering NaN or broken distances', () => {
    const profileWithoutGps: FeedProfile = {
      ...baseProfile,
      distance_km: null,
    };

    const { container } = render(
      <I18nProvider>
        <LiveScorePanel profile={profileWithoutGps} />
      </I18nProvider>,
    );

    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('NaN km');
  });

  it('safely handles NaN distance_km without crashing or displaying NaN km', () => {
    const profileWithNanGps: FeedProfile = {
      ...baseProfile,
      distance_km: Number.NaN,
    };

    const { container } = render(
      <I18nProvider>
        <LiveScorePanel profile={profileWithNanGps} />
      </I18nProvider>,
    );

    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('NaN km');
  });
});
