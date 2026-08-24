import { I18nProvider } from '@/features/i18n/i18n-provider';
import type { FeedProfile } from '@/features/matching/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AIRightSidebarNoProfileEmpty, LiveScorePanel } from './live-ai-score';

const mockProfile: FeedProfile = {
  id: 'user-1',
  name: 'Alexandre Dupont',
  image: null,
  bio: 'Passionné de design et de technologie',
  job: 'Développeur Full-stack',
  category: 'Tech',
  city: 'Paris',
  interests: [],
  goals: ['Networking'],
  activity_sector: 'Informatique',
  service_type: 'Freelance',
  rating: 4.9,
  distance_km: 1.9,
  match_score: 54,
  match_group: 3,
  match_type_label: 'Suggestion',
  confidence: 'low',
  compatibility: [
    { dimension: 'interests', score: 0, weight: 0.2, contribution: 0 },
    { dimension: 'geo', score: 88, weight: 0.2, contribution: 18 },
    { dimension: 'goals', score: 38, weight: 0.2, contribution: 8 },
    { dimension: 'availability', score: 50, weight: 0.2, contribution: 10 },
    { dimension: 'languages', score: 60, weight: 0.1, contribution: 6 },
    { dimension: 'quality', score: 75, weight: 0.1, contribution: 8 },
  ],
  liked_me: false,
};

describe('LiveScorePanel', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'en');
  });

  it('renders the header title, partial match confidence and score ring percentage', () => {
    render(
      <I18nProvider>
        <LiveScorePanel profile={mockProfile} />
      </I18nProvider>,
    );

    expect(screen.getByText('AI MATCHING SCORE')).toBeInTheDocument();
    expect(screen.getByText('Partial match')).toBeInTheDocument();
  });

  it('renders the highlights: distance, rating/reviews/availability and goal alignment', () => {
    render(
      <I18nProvider>
        <LiveScorePanel profile={mockProfile} />
      </I18nProvider>,
    );

    expect(screen.getByText(/1.9 km away — very close/i)).toBeInTheDocument();
    expect(screen.getByText(/Rating 4.9\/5 · 62 reviews · Available/i)).toBeInTheDocument();
    expect(screen.getByText(/Low goal alignment/i)).toBeInTheDocument();
  });

  it('renders the 6 detailed breakdown dimensions and allows collapsing', () => {
    render(
      <I18nProvider>
        <LiveScorePanel profile={mockProfile} />
      </I18nProvider>,
    );

    expect(screen.getByText('Skills & interests')).toBeInTheDocument();
    expect(screen.getByText('Geographic proximity')).toBeInTheDocument();
    expect(screen.getByText('Goal alignment')).toBeInTheDocument();
    expect(screen.getByText('Shared availability')).toBeInTheDocument();
    expect(screen.getByText('Common languages')).toBeInTheDocument();
    expect(screen.getByText('Profile quality')).toBeInTheDocument();

    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Toggle collapse
    const detailsButton = screen.getByText('DETAILS');
    fireEvent.click(detailsButton);
  });
});

describe('AIRightSidebarNoProfileEmpty', () => {
  it('renders in English', () => {
    window.localStorage.setItem('matchy_locale', 'en');
    render(
      <I18nProvider>
        <AIRightSidebarNoProfileEmpty />
      </I18nProvider>,
    );

    expect(screen.getByText('AI Match Insights')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Browse profiles to see real-time compatibility scores and personalized AI suggestions.',
      ),
    ).toBeInTheDocument();
  });

  it('renders in French', () => {
    window.localStorage.setItem('matchy_locale', 'fr');
    render(
      <I18nProvider>
        <AIRightSidebarNoProfileEmpty />
      </I18nProvider>,
    );

    expect(screen.getByText('Analyse IA Matchy')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Parcourez les profils pour afficher les scores de compatibilité IA et les suggestions personnalisées.',
      ),
    ).toBeInTheDocument();
  });

  it('renders in Arabic with RTL direction', () => {
    window.localStorage.setItem('matchy_locale', 'ar');
    const { container } = render(
      <I18nProvider>
        <AIRightSidebarNoProfileEmpty />
      </I18nProvider>,
    );

    expect(screen.getByText('تحليلات التوافق بالذكاء الاصطناعي')).toBeInTheDocument();
    expect(
      screen.getByText(
        'تصفح الملفات الشخصية لعرض نقاط التوافق في الوقت الفعلي واقتراحات الذكاء الاصطناعي المخصصة لك.',
      ),
    ).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
