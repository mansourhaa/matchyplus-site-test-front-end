import authReducer from '@/features/auth/store/auth-slice';
import type { AuthState, AuthUser } from '@/features/auth/types';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HistoryPage from './page';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  };
});

const baseUser: AuthUser = {
  id: 'user-1',
  email: 'test@matchy.tn',
  phone: '+21612345678',
  name: 'John Doe',
  auth_provider: 'phone',
  email_verified: true,
  verified: true,
  onboarding_completed: true,
};

const mockHistoryResponse = {
  items: [
    {
      id: 'swipe-1',
      direction: 'RIGHT',
      swiped_at: '2026-08-20T10:00:00.000Z',
      is_matched: true,
      conversation_id: 'conv-123',
      target: {
        id: 'target-1',
        name: 'Sarah Connor',
        image: 'https://example.com/sarah.jpg',
        bio: 'Tech Lead at Matchy',
        job: 'Software Engineer',
        category: 'IT',
        city: 'Tunis',
        interests: ['AI', 'React'],
        goals: ['Mentorship'],
        activity_sector: 'Technology',
        service_type: 'Full Stack',
        rating: 4.9,
      },
    },
    {
      id: 'swipe-2',
      direction: 'LEFT',
      swiped_at: '2026-08-19T14:30:00.000Z',
      is_matched: false,
      conversation_id: null,
      target: {
        id: 'target-2',
        name: 'Alexandre Dumas',
        image: null,
        bio: 'Writer',
        job: 'Author',
        category: 'Literature',
        city: 'Sousse',
        interests: ['Books'],
        goals: [],
        activity_sector: 'Arts',
        service_type: 'Writing',
        rating: 4.5,
      },
    },
  ],
  total: 2,
  has_more: false,
  stats: {
    total_swipes: 2,
    likes: 1,
    passes: 1,
    matches: 1,
    match_rate: 50,
  },
};

function renderHistoryPage(user: AuthUser = baseUser) {
  const authState: AuthState = {
    status: 'authenticated',
    loading: false,
    error: null,
    sessionChecked: true,
    sessionGeneration: 0,
    user,
  };
  const store = configureStore({
    reducer: { auth: authReducer, matching: matchingReducer },
    preloadedState: { auth: authState },
  });
  return render(
    <Provider store={store}>
      <I18nProvider>
        <HistoryPage />
      </I18nProvider>
    </Provider>,
  );
}

describe('HistoryPage', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    vi.mocked(api.get).mockResolvedValue({ data: mockHistoryResponse });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('renders the activity history title, stats, and activity items', async () => {
    renderHistoryPage();

    await waitFor(() => {
      expect(screen.getByText('Tout')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Alexandre Dumas')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/swipe/history', {
      params: { direction: 'all' },
    });
  });

  it('filters items by category tab', async () => {
    renderHistoryPage();

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Alexandre Dumas')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Matchs/ }));

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('Alexandre Dumas')).not.toBeInTheDocument();
  });

  it('opens profile detail modal when clicking a history item', async () => {
    renderHistoryPage();

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sarah Connor'));
    expect(await screen.findByText('Tech Lead at Matchy')).toBeInTheDocument();
  });

  it('renders empty state when no activity is found', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        items: [],
        total: 0,
        has_more: false,
        stats: { total_swipes: 0, likes: 0, passes: 0, matches: 0, match_rate: 0 },
      },
    });

    renderHistoryPage();

    await waitFor(() => {
      expect(screen.getByText('Aucune activité trouvée')).toBeInTheDocument();
    });
  });
});
