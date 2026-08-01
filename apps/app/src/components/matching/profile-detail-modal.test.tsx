import { I18nProvider } from '@/features/i18n/i18n-provider';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ProfileDetailData, ProfileDetailModal } from './profile-detail-modal';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});

function buildStore() {
  return configureStore({ reducer: { profile: profileReducer } });
}

const profile: ProfileDetailData = {
  id: 'user-2',
  name: 'Jane Doe',
  image: null,
  bio: null,
  job: 'Électricien',
  city: null,
  interests: [],
  service_type: null,
  rating: 0,
};

function renderModal(
  store: ReturnType<typeof buildStore>,
  overrides: Partial<ProfileDetailData> = {},
) {
  return render(
    <Provider store={store}>
      <I18nProvider>
        <ProfileDetailModal profile={{ ...profile, ...overrides }} onClose={() => {}} />
      </I18nProvider>
    </Provider>,
  );
}

describe('ProfileDetailModal — rating', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the rating picker for a matched profile', () => {
    renderModal(buildStore(), { matched: true });

    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
    expect(screen.getByText('Choisissez une note')).toBeInTheDocument();
  });

  it('does not show the rating picker for a profile that is not matched', () => {
    renderModal(buildStore(), { matched: false });

    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('submits the selected star rating and shows the saved confirmation', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { rating: 4, reviews: 1 } });

    renderModal(buildStore(), { matched: true });

    fireEvent.click(screen.getByLabelText('4 étoiles'));
    expect(screen.getByText('4/5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/profiles/user-2/rating', { rating: 4 }),
    );
    expect(await screen.findByText('Votre avis a été bien enregistré')).toBeInTheDocument();
    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('shows a dedicated message when the profile was already rated in a previous session', async () => {
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'already_rated' } },
    });

    renderModal(buildStore(), { matched: true });

    fireEvent.click(screen.getByLabelText('1 étoile'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));

    expect(await screen.findByText('Vous avez déjà noté ce profil.')).toBeInTheDocument();
    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('shows the already-rated state immediately when the server says the viewer already rated', () => {
    renderModal(buildStore(), { matched: true, viewer_has_rated: true });

    expect(screen.getByText('Vous avez déjà noté ce profil.')).toBeInTheDocument();
    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('does not apply a slow rating response to a different profile shown after switching', async () => {
    let resolvePost!: (value: { data: { rating: number; reviews: number } }) => void;
    vi.mocked(api.post).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    const store = buildStore();
    const { rerender } = render(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal profile={{ ...profile, matched: true }} onClose={() => {}} />
        </I18nProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByLabelText('3 étoiles'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/profiles/user-2/rating', { rating: 3 }),
    );

    // Switch to a different (also matched) profile before the in-flight request resolves.
    rerender(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal
            profile={{ ...profile, id: 'user-3', name: 'John Doe', matched: true }}
            onClose={() => {}}
          />
        </I18nProvider>
      </Provider>,
    );
    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();

    resolvePost({ data: { rating: 3, reviews: 1 } });
    await Promise.resolve();
    await Promise.resolve();

    // The now-displayed profile (user-3) must still show its own fresh picker, not the
    // previous profile's "saved" outcome landing late.
    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
    expect(screen.queryByText('Votre avis a été bien enregistré')).not.toBeInTheDocument();
  });

  it('resets the rating selection when the modal is reused for a different profile', () => {
    const store = buildStore();
    const { rerender } = render(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal profile={{ ...profile, matched: true }} onClose={() => {}} />
        </I18nProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByLabelText('5 étoiles'));
    expect(screen.getByText('5/5')).toBeInTheDocument();

    rerender(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal
            profile={{ ...profile, id: 'user-3', name: 'John Doe', matched: true }}
            onClose={() => {}}
          />
        </I18nProvider>
      </Provider>,
    );

    expect(screen.getByText('Choisissez une note')).toBeInTheDocument();
  });
});

describe('ProfileDetailModal — profile info card', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the profile info card fields when present', () => {
    renderModal(buildStore(), {
      activity_sector: 'Informatique',
      profile_type: 'PROVIDER',
      looking_for: 'Recruter des développeurs',
      offer_service: true,
    });

    expect(screen.getByText('Informations du profil')).toBeInTheDocument();
    expect(screen.getByText('Informatique')).toBeInTheDocument();
    expect(screen.getByText('Employeur')).toBeInTheDocument();
    expect(screen.getByText('Recruter des développeurs')).toBeInTheDocument();
    expect(screen.getByText('Offre un service')).toBeInTheDocument();
  });

  it('hides the profile info card when none of its fields are present', () => {
    renderModal(buildStore());

    expect(screen.queryByText('Informations du profil')).not.toBeInTheDocument();
  });
});

describe('ProfileDetailModal — report account', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits a report with the selected reason and shows a success message', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { reportId: 'report-1', status: 'PENDING', message: 'ok' },
    });

    renderModal(buildStore());

    fireEvent.click(screen.getByRole('button', { name: /Signaler ce compte/ }));
    fireEvent.click(screen.getByText('Harcèlement'));
    fireEvent.click(screen.getByRole('button', { name: 'Signaler ce compte' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reports/profiles/user-2', {
        reason: 'Harcèlement',
      }),
    );
    expect(await screen.findByText('Compte signalé avec succès.')).toBeInTheDocument();
  });

  it('requires a written reason when "Autre" is selected', async () => {
    renderModal(buildStore());

    fireEvent.click(screen.getByRole('button', { name: /Signaler ce compte/ }));
    fireEvent.click(screen.getByText('Autre'));
    fireEvent.click(screen.getByRole('button', { name: 'Signaler ce compte' }));

    expect(
      await screen.findByText('Merci de préciser la raison du signalement.'),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
