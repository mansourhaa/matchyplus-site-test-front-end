import authReducer from '@/features/auth/store/auth-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicProfileView } from './public-profile-view';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

function buildStore(viewerId: string | null) {
  return configureStore({
    reducer: { profile: profileReducer, auth: authReducer, matching: matchingReducer },
    preloadedState: {
      auth: {
        status: viewerId ? ('authenticated' as const) : ('unknown' as const),
        loading: false,
        error: null,
        sessionChecked: true,
        sessionGeneration: 0,
        user: viewerId
          ? {
              id: viewerId,
              email: null,
              phone: null,
              name: 'Viewer',
              auth_provider: 'phone',
              email_verified: false,
              onboarding_completed: true,
            }
          : null,
      },
    },
  });
}

const publicProfile = {
  id: 'user-2',
  name: 'Jane Doe',
  job: 'Électricien',
  bio: 'Quelques mots sur moi.',
  image: null,
  video: null,
  city: 'Tunis',
  interests: ['Bricolage', 'Jardinage'],
  languages: ['fr'],
  contact_modes: ['whatsapp'],
  offer_service: false,
  service_type: null,
  price: null,
  profile_type: 'INDIVIDUAL' as const,
  rating: 4.5,
  reviews: 3,
};

describe('PublicProfileView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders the profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: publicProfile });
    const store = buildStore('viewer-1');

    render(
      <Provider store={store}>
        <I18nProvider>
          <PublicProfileView userId="user-2" />
        </I18nProvider>
      </Provider>,
    );

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/profiles/user-2');
    expect(screen.getByText('Électricien')).toBeInTheDocument();
    expect(screen.getByText('Tunis')).toBeInTheDocument();
    expect(screen.getByText('Quelques mots sur moi.')).toBeInTheDocument();
    expect(screen.getByText('Bricolage')).toBeInTheDocument();
    expect(screen.getByText('4.5 (3 avis)', { exact: false })).toBeInTheDocument();
  });

  it('shows a not-found message when the profile is blocked or missing', async () => {
    vi.mocked(api.get).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'blocked' } },
    });
    const store = buildStore('viewer-1');

    render(
      <Provider store={store}>
        <I18nProvider>
          <PublicProfileView userId="user-2" />
        </I18nProvider>
      </Provider>,
    );

    expect(
      await screen.findByText('Ce profil est introuvable ou inaccessible.'),
    ).toBeInTheDocument();
  });

  it('lets the profile owner know they were viewed, when the viewer is someone else', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: publicProfile });
    vi.mocked(api.post).mockResolvedValue({ data: { notified: true } });
    const store = buildStore('viewer-1');

    render(
      <Provider store={store}>
        <I18nProvider>
          <PublicProfileView userId="user-2" />
        </I18nProvider>
      </Provider>,
    );

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/profiles/user-2/view'));
  });

  it('does not send a view notification when viewing your own profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...publicProfile, id: 'viewer-1' } });
    const store = buildStore('viewer-1');

    render(
      <Provider store={store}>
        <I18nProvider>
          <PublicProfileView userId="viewer-1" />
        </I18nProvider>
      </Provider>,
    );

    await screen.findByText('Jane Doe');
    expect(api.post).not.toHaveBeenCalled();
  });
});
