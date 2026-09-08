import authReducer from '@/features/auth/store/auth-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ProfileDetailData, ProfileDetailModal } from './profile-detail-modal';

beforeEach(() => {
  // These tests assert French copy (product default for Tunisian QA).
  window.localStorage.setItem('matchy_locale', 'fr');
});

afterEach(() => {
  window.localStorage.removeItem('matchy_locale');
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});

// `viewerId` seeds the auth slice ProfileDetailModal reads to decide whether to fire the
// profile-view notification (see the notify-tests below) — null (the default) keeps every
// other describe block's tests unaffected, since the notify effect no-ops without a user.
function buildStore(viewerId: string | null = null) {
  return configureStore({
    reducer: { profile: profileReducer, auth: authReducer },
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
              verified: false,
              onboarding_completed: true,
            }
          : null,
      },
    },
  });
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
  source?: import('./profile-detail-modal').ProfileDetailSource,
) {
  return render(
    <Provider store={store}>
      <I18nProvider>
        <ProfileDetailModal
          profile={{ ...profile, ...overrides }}
          source={source}
          onClose={() => {}}
        />
      </I18nProvider>
    </Provider>,
  );
}

describe('ProfileDetailModal — rating', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows the rating picker for a matched profile when source allows rating', () => {
    renderModal(buildStore(), { matched: true });

    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
    expect(screen.getByText('Choisissez une note')).toBeInTheDocument();
  });

  it('does not show the rating picker when source is discovery even if matched', () => {
    renderModal(buildStore(), { matched: true }, 'discovery');

    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('does not show the rating picker when source is search even if matched', () => {
    renderModal(buildStore(), { matched: true }, 'search');

    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('does not show the rating picker when source is favorites even if matched', () => {
    renderModal(buildStore(), { matched: true }, 'favorites');

    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
  });

  it('shows the rating picker when source is matches for a matched profile', () => {
    renderModal(buildStore(), { matched: true }, 'matches');

    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
  });

  it('shows the rating picker when source is chat for a matched profile', () => {
    renderModal(buildStore(), { matched: true }, 'chat');

    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
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

  it('shows the persistent already-rated message once the saved-confirmation banner auto-hides', async () => {
    vi.useFakeTimers();
    vi.mocked(api.post).mockResolvedValue({ data: { rating: 4, reviews: 1 } });

    renderModal(buildStore(), { matched: true });

    fireEvent.click(screen.getByLabelText('4 étoiles'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Votre avis a été bien enregistré')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.queryByText('Votre avis a été bien enregistré')).not.toBeInTheDocument();
    expect(screen.getByText('Vous avez déjà noté ce profil.')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not let a banner timer from a previous profile fire against the profile shown now', async () => {
    vi.useFakeTimers();
    vi.mocked(api.post).mockResolvedValue({ data: { rating: 4, reviews: 1 } });
    const store = buildStore();
    const { rerender } = render(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal profile={{ ...profile, matched: true }} onClose={() => {}} />
        </I18nProvider>
      </Provider>,
    );

    fireEvent.click(screen.getByLabelText('4 étoiles'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Votre avis a été bien enregistré')).toBeInTheDocument();

    // Switch to a different profile before the 2200ms banner timer fires.
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

    // The cancelled timer from user-2 must not fire and disturb user-3's fresh picker.
    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();
    expect(screen.queryByText('Votre avis a été bien enregistré')).not.toBeInTheDocument();
    expect(screen.queryByText('Vous avez déjà noté ce profil.')).not.toBeInTheDocument();

    vi.useRealTimers();
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

  it('syncs the already-rated state when viewer_has_rated flips to true for the same profile (e.g. a background refresh)', () => {
    const store = buildStore();
    const { rerender } = render(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal
            profile={{ ...profile, matched: true, viewer_has_rated: false }}
            onClose={() => {}}
          />
        </I18nProvider>
      </Provider>,
    );
    expect(screen.getByText('Noter ce profil')).toBeInTheDocument();

    rerender(
      <Provider store={store}>
        <I18nProvider>
          <ProfileDetailModal
            profile={{ ...profile, matched: true, viewer_has_rated: true }}
            onClose={() => {}}
          />
        </I18nProvider>
      </Provider>,
    );

    expect(screen.getByText('Vous avez déjà noté ce profil.')).toBeInTheDocument();
    expect(screen.queryByText('Noter ce profil')).not.toBeInTheDocument();
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

describe('ProfileDetailModal — hero photo framing', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Regression: a fixed h-64 (256px) band cropped portrait photos far more
  // aggressively than legacy's viewport-relative h-[42vh]/h-[50vh] hero, cutting off
  // the top of the subject's head. object-cover itself is unchanged (legacy doesn't
  // bias the crop either) -- the container just needs to be tall enough that the crop
  // stays close to the photo's natural portrait aspect ratio.
  it('gives the hero photo a viewport-relative height instead of a fixed short band', () => {
    const { container } = renderModal(buildStore(), { image: 'https://example.com/photo.jpg' });

    const heroImage = container.querySelector('img');
    expect(heroImage).not.toBeNull();
    const heroContainer = heroImage?.parentElement;
    expect(heroContainer).toHaveClass('h-[42vh]', 'md:h-[50vh]');
    expect(heroContainer).not.toHaveClass('h-64');
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

    fireEvent.click(screen.getByText('Signaler le profil'));
    fireEvent.click(screen.getByText('Harcèlement ou comportement abusif'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reports/profiles/user-2', {
        reason: 'HARASSMENT',
        details: undefined,
      }),
    );
    expect(await screen.findByText('Signalement envoyé')).toBeInTheDocument();
  });

  it('submits a report with other reason details', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { reportId: 'report-2', status: 'PENDING', message: 'ok' },
    });

    renderModal(buildStore());

    fireEvent.click(screen.getByText('Signaler le profil'));
    fireEvent.click(screen.getByText('Autre motif'));
    fireEvent.change(screen.getByPlaceholderText(/Fournissez des détails/), {
      target: { value: 'Comportement suspect' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reports/profiles/user-2', {
        reason: 'OTHER',
        details: 'Comportement suspect',
      }),
    );
    expect(await screen.findByText('Signalement envoyé')).toBeInTheDocument();
  });
});

describe('ProfileDetailModal — profile view notification', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('notifies the profile owner when someone else views it, whether opened from discovery or /profile/[id]', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { notified: true } });
    const store = buildStore('viewer-1');

    renderModal(store);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/profiles/user-2/view'));
  });

  it('does not notify when the signed-in viewer is the profile owner', async () => {
    const store = buildStore('user-2');

    renderModal(store, { id: 'user-2' });

    await screen.findByText('Jane Doe');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('notifies only once per view even under React StrictMode double-invoked effects', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { notified: true } });
    const store = buildStore('viewer-1');

    render(
      <StrictMode>
        <Provider store={store}>
          <I18nProvider>
            <ProfileDetailModal profile={profile} onClose={() => {}} />
          </I18nProvider>
        </Provider>
      </StrictMode>,
    );

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/profiles/user-2/view'));
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileDetailModal — auto-enrichment', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto-enriches profile with full server details when opened with partial data', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: 'user-2',
        name: 'Jane Doe',
        job: 'Électricien',
        bio: 'Expert électricien certifié avec 10 ans de pratique.',
        image: null,
        video: null,
        city: 'Tunis',
        interests: ['Électricité', 'Rénovation'],
        languages: ['Français', 'Arabe'],
        contact_modes: ['video', 'call'],
        availability_days: ['Lundi', 'Mardi'],
        availability_hours: ['09:00 - 18:00'],
        offer_service: true,
        service_type: 'Électricien',
        price: '120 DT',
        profile_type: 'PROVIDER',
        experience: '5',
        activity_sector: 'Bâtiment',
        looking_for: 'Cherche des chantiers',
        selected_goals: [],
        rating: 4.8,
        reviews: 9,
        matched: false,
        viewer_has_rated: false,
      },
    });

    renderModal(buildStore(), { id: 'user-2' }, 'discovery');

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/profiles/user-2'));

    expect(
      await screen.findByText('Expert électricien certifié avec 10 ans de pratique.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cherche des chantiers')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('Arabe')).toBeInTheDocument();
    expect(screen.getByText('5 exp.')).toBeInTheDocument();
  });
});
