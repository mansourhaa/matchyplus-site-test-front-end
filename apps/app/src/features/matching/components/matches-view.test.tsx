import { I18nProvider } from '@/features/i18n/i18n-provider';
import messagingReducer from '@/features/messaging/store/messaging-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import matchingReducer from '../store/matching-slice';
import { MatchesView } from './matches-view';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

const matchRow = {
  match_id: 'match-1',
  matched_at: '2026-01-01T00:00:00.000Z',
  matched_user_id: 'user-2',
  conversation_id: 'conv-1',
  profile: {
    id: 'user-2',
    name: 'Jane Doe',
    image: null,
    bio: null,
    job: 'Électricien',
    category: null,
    city: null,
    interests: [],
    activity_sector: null,
    service_type: null,
    rating: 0,
  },
};

const conversationRow = {
  conversation_id: 'conv-1',
  match_id: 'match-1',
  has_active_match: true,
  peer: {
    id: 'user-2',
    name: 'Jane Doe',
    image: null,
    bio: null,
    job: 'Électricien',
    category: null,
    city: null,
  },
  last_message: null,
  unread_count: 0,
  i_blocked: false,
  blocked_me: false,
  can_send: true,
  updated_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

const pendingRow = {
  swipe_id: 'swipe-1',
  created_at: '2026-01-01T00:00:00.000Z',
  profile: {
    id: 'user-3',
    name: 'Karim B.',
    image: null,
    bio: null,
    job: 'Développeur Freelance',
    category: null,
    city: null,
    interests: [],
    activity_sector: null,
    service_type: null,
    rating: 4.8,
  },
};

function renderMatches() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/swipe/matches') return Promise.resolve({ data: { matches: [matchRow] } });
    if (url === '/swipe/pending') return Promise.resolve({ data: { pending: [pendingRow] } });
    if (url === '/conversations')
      return Promise.resolve({ data: { conversations: [conversationRow] } });
    return Promise.reject(new Error(`unexpected request: ${url}`));
  });
  const store = configureStore({
    reducer: { matching: matchingReducer, messaging: messagingReducer },
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MatchesView />
      </I18nProvider>
    </Provider>,
  );
}

describe('MatchesView', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the top Mes Matchs section with avatar and NOUVEAU badge', async () => {
    renderMatches();

    expect(await screen.findByText('Mes matchs')).toBeInTheDocument();
    expect(await screen.findByText('NOUVEAU')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText('Voir le profil de Jane Doe'));
    expect(pushMock).toHaveBeenCalledWith('/chat/conv-1');
  });

  it('renders the middle Conversations section with snippet and role', async () => {
    renderMatches();

    expect(await screen.findByText('Conversations')).toBeInTheDocument();
    expect(await screen.findByText('Démarrer la conversation...')).toBeInTheDocument();
    expect(screen.getByText('Électricien')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Jane D.'));
    expect(pushMock).toHaveBeenCalledWith('/chat/conv-1');
  });

  it('renders the bottom En attente section with orange badge and description', async () => {
    renderMatches();

    expect(await screen.findByText('En attente')).toBeInTheDocument();
    expect(await screen.findByText('Karim B.')).toBeInTheDocument();
    expect(screen.getByText('Développeur Freelance')).toBeInTheDocument();
    expect(
      screen.getByText("Ces profils n'ont pas encore répondu à votre demande."),
    ).toBeInTheDocument();
  });
});
