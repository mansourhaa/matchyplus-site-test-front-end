import { I18nProvider } from '@/features/i18n/i18n-provider';
import messagingReducer from '@/features/messaging/store/messaging-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    api: { get: vi.fn() },
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

function renderMatches() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/swipe/matches') return Promise.resolve({ data: { matches: [matchRow] } });
    if (url === '/swipe/pending') return Promise.resolve({ data: { pending: [] } });
    if (url === '/conversations') return Promise.resolve({ data: { conversations: [] } });
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
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens the matched profile when the avatar is clicked and no conversation exists', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/swipe/matches')
        return Promise.resolve({ data: { matches: [{ ...matchRow, conversation_id: null }] } });
      if (url === '/swipe/pending') return Promise.resolve({ data: { pending: [] } });
      if (url === '/conversations') return Promise.resolve({ data: { conversations: [] } });
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
    const store = configureStore({
      reducer: { matching: matchingReducer, messaging: messagingReducer },
    });
    render(
      <Provider store={store}>
        <I18nProvider>
          <MatchesView />
        </I18nProvider>
      </Provider>,
    );

    fireEvent.click(await screen.findByLabelText('Voir le profil de Jane Doe'));

    expect(pushMock).toHaveBeenCalledWith('/profile/user-2');
  });

  it('opens the chat when the match is clicked with an existing conversation', async () => {
    renderMatches();

    fireEvent.click(await screen.findByText('Jane'));

    expect(pushMock).toHaveBeenCalledWith('/chat/conv-1');
  });
});
