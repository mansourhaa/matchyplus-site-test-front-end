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
    { dimension: 'sector', score: 85, weight: 0.3, contribution: 26 },
    { dimension: 'roles', score: 92, weight: 0.2, contribution: 18 },
    { dimension: 'goals', score: 70, weight: 0.15, contribution: 11 },
    { dimension: 'proximity', score: 65, weight: 0.15, contribution: 10 },
    { dimension: 'availability', score: 80, weight: 0.1, contribution: 8 },
    { dimension: 'quality', score: 95, weight: 0.05, contribution: 5 },
    { dimension: 'budget', score: 75, weight: 0.05, contribution: 4 },
  ],
};

describe('LiveScorePanel (MATCH-002)', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders all 7 matching dimensions when details section is expanded', () => {
    render(
      <I18nProvider>
        <LiveScorePanel profile={baseProfile} />
      </I18nProvider>,
    );

    // Expand details
    const detailButton = screen.getByRole('button', { name: /détail|details/i });
    fireEvent.click(detailButton);

    // Verify all 7 criteria are present with their respective percentage weights
    expect(screen.getByText(/Secteur d'activité \(30%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Complémentarité des rôles \(20%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Objectifs communs \(15%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Proximité géographique \(15%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Disponibilité \(10%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Qualité du profil \(5%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget \/ Tarifs \(5%\)/i)).toBeInTheDocument();

    // Verify dimension score values mapped from profile.compatibility
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
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
