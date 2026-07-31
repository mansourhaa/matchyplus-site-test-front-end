import { I18nProvider } from '@/features/i18n/i18n-provider';
import matchingReducer from '@/features/matching/store/matching-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicProfileView } from './public-profile-view';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
    },
  };
});

function buildStore() {
  return configureStore({ reducer: { profile: profileReducer, matching: matchingReducer } });
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
    const store = buildStore();

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
    const store = buildStore();

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
});
