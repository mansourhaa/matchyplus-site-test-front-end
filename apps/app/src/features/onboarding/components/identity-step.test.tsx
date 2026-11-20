import authReducer from '@/features/auth/store/auth-slice';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { LocationProvider } from '@/features/location/location-context';
import onboardingReducer, {
  analyzeProfileVideo,
  relabelVideoAnalysis,
} from '@/features/onboarding/store/onboarding-slice';
import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from './identity-step';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

// The real recorder needs a camera; this stand-in hands back a clip like it does.
vi.mock('./video-recorder-modal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./video-recorder-modal')>();
  return {
    ...actual,
    VideoRecorderModal: ({
      onVideoReady,
    }: {
      onVideoReady: (blob: Blob, blobUrl: string, filename: string, audio?: Blob) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onVideoReady(
            new Blob([new Uint8Array([1, 2, 3])], { type: 'video/webm' }),
            'data:',
            'clip.webm',
            new Blob([new Uint8Array([4, 5, 6])], { type: 'audio/webm' }),
          )
        }
      >
        fake-record
      </button>
    ),
  };
});

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});

function firstPlaceholder(text: string) {
  return screen.getAllByPlaceholderText(text)[0];
}

function firstButton(name: string | RegExp) {
  return screen.getAllByRole('button', { name })[0];
}

function pickIndustry(label: string) {
  fireEvent.click(firstButton('Choisir un secteur d’activité'));
  fireEvent.click(firstButton(label));
}

async function findFirstPlaceholder(text: string) {
  const matches = await screen.findAllByPlaceholderText(text);
  return matches[0];
}

const oauthAuthState = {
  status: 'authenticated' as const,
  user: {
    id: 'user-1',
    email: 'jane@example.com',
    phone: null,
    name: null,
    auth_provider: 'google',
    email_verified: true,
    verified: false,
    onboarding_completed: false,
  },
};

const unauthenticatedState = { status: 'unauthenticated' as const, user: null };

const registeredUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: '+21612345678',
  auth_provider: 'phone',
  email_verified: false,
  onboarding_completed: false,
};

// Photo is required for a phone-signup account (the only kind an unauthenticated
// visitor can create), but driving the actual <input type="file"> + FileReader round
// trip isn't needed to exercise the credentials flow below — seeding it via `profile`
// (read once into local state by the component's own useState initializers) is enough,
// same as how the existing OAuth tests avoid it by exempting on auth_provider instead.
const unauthenticatedProfileWithPhoto = {
  id: '',
  name: null,
  auth_provider: 'phone',
  job: null,
  bio: null,
  image: 'data:image/png;base64,fake',
  video: null,
  city: null,
  profile_type: null,
  offer_service: false,
  service_type: null,
  price: null,
  interests: [],
  selected_goals: [],
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: false,
};

function fillIdentityAndCredentials() {
  fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
  fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
  fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
    target: { value: 'Électricien' },
  });
  pickIndustry('Technologie & Digital');
  fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
}

describe('IdentityStep', () => {
  beforeEach(() => {
    // These tests assert French copy (product default for Tunisian QA).
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('blocks submission and shows an error when profession is missing for an Offering (INDIVIDUAL) profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La profession est obligatoire.')).not.toHaveLength(0);
  });

  it('blocks submission and shows an error when the photo is missing for a phone-signup account, even before the profile fetch resolves', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      {
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: null,
          phone: '+21612345678',
          name: null,
          auth_provider: 'phone',
          email_verified: false,
          verified: false,
          onboarding_completed: false,
        },
      },
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La photo de profil est obligatoire.')).not.toHaveLength(0);
  });

  it('does not require a photo for an OAuth account (no phone ever collected)', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      {
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          phone: null,
          name: null,
          auth_provider: 'google',
          email_verified: true,
          verified: false,
          onboarding_completed: false,
        },
      },
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      profileType: 'INDIVIDUAL',
      industry: 'tech_digital',
    });
  });

  // INS-001: Retour navigation is consistently available on Step 1
  it('offers Retour navigation on Step 1', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
      oauthAuthState,
    );

    expect(screen.queryAllByText('Retour').length).toBeGreaterThan(0);
  });

  it('blocks submission and shows an error when profession is missing for a Looking for (PROVIDER) profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Je cherche un prestataire'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La profession est obligatoire.')).not.toHaveLength(0);
  });

  it('submits a Looking for (PROVIDER) profile once its profession is filled', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Je cherche un prestataire'));
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      profileType: 'PROVIDER',
      industry: 'tech_digital',
    });
  });

  it('asks a 20 s voice message and the city, not a video, from someone looking for a provider', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    expect(screen.queryAllByText('Décrivez ce que vous cherchez')).toHaveLength(0);
    fireEvent.click(firstButton('Je cherche un prestataire'));
    expect(screen.getAllByText('Décrivez ce que vous cherchez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enregistrer un message vocal').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Présentez-vous en vidéo')).toHaveLength(0);

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)'), {
      target: { value: 'Sousse' },
    });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Enseignant' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Sousse', job: 'Enseignant', profileType: 'PROVIDER' }),
    );
  });

  it('asks the city from someone offering services too', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)'), {
      target: { value: 'Monastir' },
    });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Monastir', profileType: 'INDIVIDUAL' }),
    );
  });

  it('blocks submission and shows an error when the industry is missing', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('Le secteur d’activité est obligatoire.')).not.toHaveLength(
      0,
    );
  });

  it('shows the industry in both modes and keeps it when switching between them', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
      oauthAuthState,
    );

    pickIndustry('Santé & Bien-être');
    fireEvent.click(firstButton('Je cherche un prestataire'));
    expect(firstButton('Santé & Bien-être')).toBeInTheDocument();
    fireEvent.click(firstButton('Je propose mes services'));
    expect(firstButton('Santé & Bien-être')).toBeInTheDocument();
  });

  it('never shows the internal matching keywords of an industry', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
      oauthAuthState,
    );

    fireEvent.click(firstButton('Choisir un secteur d’activité'));
    expect(firstButton('Services Locaux & Artisanat')).toBeInTheDocument();
    expect(screen.queryAllByText(/plomberie|BTP|hôtellerie/)).toHaveLength(0);
  });

  it('submits prénom, nom, job, and the selected profile type', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      profileType: 'INDIVIDUAL',
      industry: 'tech_digital',
    });
  });

  it('uploads a newly picked photo through the real upload endpoint before saving the rest of the identity fields', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockResolvedValue({ data: { image: '/uploads/photos/new.jpg' } });
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    const file = new File(['abc'], 'selfie.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/me/profile/photo', expect.any(FormData)),
    );
    // Not a base64 data URL riding along in the PATCH — the upload endpoint above is
    // what persists User.image now, matching edit-profile's own pipeline exactly.
    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        profileType: 'INDIVIDUAL',
        industry: 'tech_digital',
      }),
    );
  });

  it('shows an error and does not save the identity fields when the photo upload fails', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockRejectedValue(new Error('upload failed'));
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={onNext}
      />,
      oauthAuthState,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Exemple : plombier, électricien, chauffeur…'), {
      target: { value: 'Électricien' },
    });
    pickIndustry('Technologie & Digital');
    const file = new File(['abc'], 'selfie.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(await screen.findAllByText('Échec de l’envoi de la photo. Réessayez.')).not.toHaveLength(
      0,
    );
    expect(onNext).not.toHaveBeenCalled();
  });

  it('hydrates resumed progress once the profile fetch resolves after mount', () => {
    const resumedProfile = {
      id: 'user-1',
      name: 'Existing Name',
      auth_provider: 'google' as const,
      job: 'Plombier',
      bio: null,
      image: null,
      video: null,
      city: null,
      profile_type: 'INDIVIDUAL' as const,
      offer_service: false,
      service_type: null,
      price: null,
      interests: [],
      selected_goals: [],
      availability_days: [],
      availability_hours: [],
      contact_modes: [],
      languages: [],
      onboardingCompleted: false,
    };

    // The wizard always mounts this step with profile={null} first — fetchOnboardingProfile
    // is async — then re-renders with the real profile once it resolves. Without hydration,
    // the fields below would stay blank forever, since useState only reads its initial
    // value on the very first render.
    const { store, rerender } = renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
      oauthAuthState,
    );

    expect(firstPlaceholder('Votre prénom')).toHaveValue('');

    rerender(
      <I18nProvider>
        <Provider store={store}>
          <IdentityStep
            profile={resumedProfile}
            stepNumber={1}
            totalSteps={3}
            loading={false}
            isAuthenticated={true}
            onNext={vi.fn()}
          />
        </Provider>
      </I18nProvider>,
    );

    expect(firstPlaceholder('Votre prénom')).toHaveValue('Existing');
    expect(firstPlaceholder('Votre nom')).toHaveValue('Name');
    expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue('Plombier');
  });

  it('prefills prénom/nom by splitting the existing name', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={{
          id: 'user-1',
          name: 'Existing Name',
          auth_provider: 'phone',
          job: 'Plombier',
          bio: null,
          image: null,
          video: null,
          city: null,
          profile_type: 'INDIVIDUAL',
          offer_service: false,
          service_type: null,
          price: null,
          interests: [],
          selected_goals: [],
          availability_days: [],
          availability_hours: [],
          contact_modes: [],
          languages: [],
          onboardingCompleted: false,
        }}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
    );

    expect(firstPlaceholder('Votre prénom')).toHaveValue('Existing');
    expect(firstPlaceholder('Votre nom')).toHaveValue('Name');
    expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue('Plombier');
  });

  it('pre-fills only the empty fields from the profile video analysis', async () => {
    const store = configureStore({
      reducer: { auth: authReducer, onboarding: onboardingReducer },
      preloadedState: {
        auth: {
          status: 'authenticated' as const,
          loading: false,
          error: null,
          user: oauthAuthState.user,
          sessionChecked: true,
          sessionGeneration: 0,
        },
      },
    });
    render(
      <I18nProvider>
        <LocationProvider>
          <Provider store={store}>
            <IdentityStep
              profile={null}
              stepNumber={1}
              totalSteps={3}
              loading={false}
              isAuthenticated={true}
              onNext={vi.fn()}
            />
          </Provider>
        </LocationProvider>
      </I18nProvider>,
    );
    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });

    // Same actions the real thunk dispatches once the worker has analysed the video.
    const meta = { requestId: 'r1', arg: { uiLocale: 'fr' } };
    store.dispatch({ type: analyzeProfileVideo.pending.type, meta });
    store.dispatch({
      type: analyzeProfileVideo.fulfilled.type,
      payload: {
        suggestions: { firstName: 'Hela', lastName: 'Ben Salah', job: 'Aide ménagère' },
        source: { values: {}, serviceId: null },
      },
      meta,
    });

    await waitFor(() => {
      expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue(
        'Aide ménagère',
      );
    });
    expect(firstPlaceholder('Votre prénom')).toHaveValue('Jane');
    expect(firstPlaceholder('Votre nom')).toHaveValue('Ben Salah');
  });

  it('fills the city but not the job from the voice message of someone looking for a provider', async () => {
    const store = configureStore({
      reducer: { auth: authReducer, onboarding: onboardingReducer },
      preloadedState: {
        auth: {
          status: 'authenticated' as const,
          loading: false,
          error: null,
          user: oauthAuthState.user,
          sessionChecked: true,
          sessionGeneration: 0,
        },
      },
    });
    render(
      <I18nProvider>
        <LocationProvider>
          <Provider store={store}>
            <IdentityStep
              profile={null}
              stepNumber={1}
              totalSteps={3}
              loading={false}
              isAuthenticated={true}
              onNext={vi.fn()}
            />
          </Provider>
        </LocationProvider>
      </I18nProvider>,
    );
    fireEvent.click(firstButton('Je cherche un prestataire'));

    const meta = { requestId: 'r1', arg: { uiLocale: 'fr' } };
    store.dispatch({ type: analyzeProfileVideo.pending.type, meta });
    store.dispatch({
      type: analyzeProfileVideo.fulfilled.type,
      payload: {
        suggestions: { firstName: 'Hela', job: 'Plombier', city: 'Sousse', industry: 'btp' },
        source: { values: {}, serviceId: null },
      },
      meta,
    });

    await waitFor(() => {
      expect(firstPlaceholder('Votre ville (ex : Tunis, Sousse...)')).toHaveValue('Sousse');
    });
    expect(firstPlaceholder('Votre prénom')).toHaveValue('Hela');
    expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue('');
  });

  it('shows what the AI is not sure about as one-click proposals under the field', async () => {
    const store = configureStore({
      reducer: { auth: authReducer, onboarding: onboardingReducer },
    });
    render(
      <I18nProvider>
        <LocationProvider>
          <Provider store={store}>
            <IdentityStep
              profile={null}
              stepNumber={1}
              totalSteps={3}
              loading={false}
              isAuthenticated={false}
              onNext={vi.fn()}
            />
          </Provider>
        </LocationProvider>
      </I18nProvider>,
    );
    const meta = { requestId: 'r1', arg: { uiLocale: 'fr' } };
    store.dispatch({ type: analyzeProfileVideo.pending.type, meta });
    store.dispatch({
      type: analyzeProfileVideo.fulfilled.type,
      payload: {
        suggestions: { proposals: { job: ['Ingénieure informatique'] } },
        source: { values: {}, serviceId: null },
      },
      meta,
    });

    fireEvent.click((await screen.findAllByRole('button', { name: 'Ingénieure informatique' }))[0]);

    expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue(
      'Ingénieure informatique',
    );
    expect(
      screen.queryByRole('button', { name: 'Ingénieure informatique' }),
    ).not.toBeInTheDocument();
  });

  it('after a page-language switch, rewrites the AI values but keeps what the person typed', async () => {
    const store = configureStore({
      reducer: { auth: authReducer, onboarding: onboardingReducer },
      preloadedState: {
        auth: {
          status: 'authenticated' as const,
          loading: false,
          error: null,
          user: oauthAuthState.user,
          sessionChecked: true,
          sessionGeneration: 0,
        },
      },
    });
    render(
      <I18nProvider>
        <LocationProvider>
          <Provider store={store}>
            <IdentityStep
              profile={null}
              stepNumber={1}
              totalSteps={3}
              loading={false}
              isAuthenticated={true}
              onNext={vi.fn()}
            />
          </Provider>
        </LocationProvider>
      </I18nProvider>,
    );
    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    const meta = { requestId: 'r1', arg: { uiLocale: 'ar' } };
    store.dispatch({ type: analyzeProfileVideo.pending.type, meta });
    store.dispatch({
      type: analyzeProfileVideo.fulfilled.type,
      payload: {
        suggestions: { firstName: 'هالة', job: 'معينة منزلية' },
        source: { values: { first_name: 'هالة', profession: 'معينة منزلية' }, serviceId: null },
      },
      meta,
    });
    await waitFor(() => {
      expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue(
        'معينة منزلية',
      );
    });

    store.dispatch({
      type: relabelVideoAnalysis.fulfilled.type,
      payload: {
        analysisId: 'r1',
        locale: 'fr',
        suggestions: { firstName: 'Hela', job: 'Aide ménagère' },
      },
      meta: { requestId: 'x', arg: 'fr' },
    });

    await waitFor(() => {
      expect(firstPlaceholder('Exemple : plombier, électricien, chauffeur…')).toHaveValue(
        'Aide ménagère',
      );
    });
    expect(firstPlaceholder('Votre prénom')).toHaveValue('Jane');
  });
  it('sends the sound-only track to the AI right after the recording, before the SMS check', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        job: {
          id: 'job-1',
          status: 'SUCCEEDED',
          error: null,
          result: {
            ok: true,
            profile: { bio: { value: 'Je fais le ménage à domicile.', status: 'fill' } },
          },
        },
        token: 't0k3n',
      },
    });
    const store = configureStore({
      reducer: { auth: authReducer, onboarding: onboardingReducer },
    });
    render(
      <I18nProvider>
        <LocationProvider>
          <Provider store={store}>
            <IdentityStep
              profile={unauthenticatedProfileWithPhoto}
              stepNumber={1}
              totalSteps={3}
              loading={false}
              isAuthenticated={false}
              onNext={vi.fn()}
            />
          </Provider>
        </LocationProvider>
      </I18nProvider>,
    );

    fireEvent.click(firstButton(/Enregistrer ou importer une vidéo/));
    fireEvent.click(screen.getByRole('button', { name: 'fake-record' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/onboarding/video-analysis', expect.any(FormData));
    });
    const sent = (vi.mocked(api.post).mock.calls[0][1] as FormData).get('video') as File;
    expect(sent.name).toBe('clip-audio.webm');
    expect(sent.type).toBe('audio/webm');
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Je fais le ménage à domicile.')[0]).toBeInTheDocument();
    });
  });
});

describe('IdentityStep — credentials for a not-yet-authenticated visitor', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('does not show phone/password fields for an already-authenticated user', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={true}
        onNext={vi.fn()}
      />,
      oauthAuthState,
    );

    expect(screen.queryByText('Numéro de téléphone')).not.toBeInTheDocument();
    expect(firstButton('Enregistrer et continuer')).toBeInTheDocument();
  });

  it('still offers the /connexion escape hatch to a genuinely unauthenticated, not-yet-registered visitor', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={vi.fn()}
      />,
      unauthenticatedState,
    );

    expect(screen.queryAllByText('Retour').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Connexion').length).toBeGreaterThan(0);
  });

  it('still requires a photo for a fresh phone signup even with a stale rehydrated OAuth user left over in Redux', () => {
    const onNext = vi.fn().mockResolvedValue(true);
    // A previous OAuth session's user can still be sitting in Redux (e.g. redux-persist)
    // even though isAuthenticated is false for THIS visitor — auth_provider: 'google'
    // here must not be trusted to waive the phone-signup photo requirement.
    renderWithAuthStore(
      <IdentityStep
        profile={{ ...unauthenticatedProfileWithPhoto, image: null }}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      { status: 'unauthenticated', user: oauthAuthState.user },
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getAllByText('La photo de profil est obligatoire.')[0]).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('sends an OTP, verifies it, registers via /auth/register-phone, then saves the identity fields and advances', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: registeredUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(await findFirstPlaceholder('------')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+21612345678' }),
    );

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/otp/verify', {
        phone: '+21612345678',
        code: '123456',
      }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        signupToken: 'valid-grant-token',
      }),
    );
    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        profileType: 'INDIVIDUAL',
        industry: 'tech_digital',
      }),
    );
  });

  it('uploads a freshly picked photo only after registerPhone succeeds (an authenticated session is required first)', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    const callOrder: string[] = [];
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        callOrder.push('register-phone');
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: registeredUser },
        };
      }
      if (url === '/users/me/profile/photo') {
        callOrder.push('upload-photo');
        return { data: { image: '/uploads/photos/new.jpg' } };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(
      <IdentityStep
        profile={{ ...unauthenticatedProfileWithPhoto, image: null }}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    const file = new File(['abc'], 'selfie.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    // handlePhotoChange reads the file via FileReader before setting `image` — wait for
    // that preview to actually land, or the missing-photo check below would still see
    // the pre-selection empty state and block submission before the OTP modal opens.
    await waitFor(() => expect(document.querySelector('img')).toBeInTheDocument());
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/me/profile/photo', expect.any(FormData)),
    );
    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(callOrder).toEqual(['register-phone', 'upload-photo']);
  });

  it('calls onRegistered before even attempting registerPhone, not just before onNext', async () => {
    // The wizard's guard must be raised before isAuthenticated has any chance to flip —
    // calling onRegistered only after registerPhone resolves would leave a gap, since
    // that state change and this callback aren't guaranteed to land in the same React
    // render (they're separated by an await).
    const callOrder: string[] = [];
    const onRegistered = vi.fn(() => callOrder.push('onRegistered'));
    const onNext = vi.fn(async () => {
      callOrder.push('onNext');
      return true;
    });
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        callOrder.push('register-phone-call');
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: registeredUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onRegistered={onRegistered}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(callOrder).toEqual(['onRegistered', 'register-phone-call', 'onNext']);
  });

  it('disables closing and resending the OTP modal while verification is in flight', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        // Never resolves within this test — keeps otpVerifying true so the guard can be
        // observed.
        return new Promise(() => {});
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', expect.anything()),
    );

    expect(screen.getByLabelText('Fermer')).toBeDisabled();
    expect(firstButton(/Renvoyer/)).toBeDisabled();
  });

  it('does not re-enter verification (e.g. via a repeated Enter keypress) while one is already in flight', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    let registerCalls = 0;
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { verified: true, phone: '+21612345678', signupToken: 'valid-grant-token' },
        };
      }
      if (url === '/auth/register-phone') {
        registerCalls += 1;
        // Never resolves — keeps otpVerifying true for the rest of this test.
        return new Promise(() => {});
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.keyDown(codeInput, { key: 'Enter' });
    fireEvent.keyDown(codeInput, { key: 'Enter' });
    fireEvent.keyDown(codeInput, { key: 'Enter' });

    await waitFor(() => expect(registerCalls).toBeGreaterThan(0));
    expect(registerCalls).toBe(1);
  });

  it('shows an error and does not register or save when the OTP code is rejected', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      throw new Error('invalid_otp');
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(firstButton('Confirmer'));

    await screen.findAllByText('Code incorrect.');
    expect(api.post).not.toHaveBeenCalledWith('/auth/register-phone', expect.anything());
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows a specific message and skips the OTP modal when the phone is already registered', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: 'phone_already_registered' } },
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(
      await screen.findAllByText(
        'Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter.',
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByPlaceholderText('------')).not.toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows a specific message when register-phone rejects a phone registered during the OTP flow', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return { data: { verified: true, phone: '+21612345678', signupToken: 'grant-1' } };
      }
      throw {
        isAxiosError: true,
        response: { data: { code: 'phone_already_registered' } },
      };
    });

    renderWithAuthStore(
      <IdentityStep
        profile={unauthenticatedProfileWithPhoto}
        stepNumber={1}
        totalSteps={3}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
      unauthenticatedState,
    );

    fillIdentityAndCredentials();
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Confirmer'));

    expect(
      await screen.findAllByText(
        'Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter.',
      ),
    ).not.toHaveLength(0);
    expect(onNext).not.toHaveBeenCalled();
  });

  describe('INS-002: Role change and draft reset', () => {
    it('shows confirmation dialog before changing role if role-specific data exists', async () => {
      renderWithAuthStore(
        <IdentityStep
          profile={{
            ...unauthenticatedProfileWithPhoto,
            profile_type: 'INDIVIDUAL',
            experience: '1-3 ans',
          }}
          stepNumber={1}
          totalSteps={3}
          loading={false}
          isAuthenticated={true}
          onNext={vi.fn()}
        />,
        oauthAuthState,
      );

      // Click "Je cherche un prestataire" (PROVIDER)
      const providerBtn = firstButton('Je cherche un prestataire');
      fireEvent.click(providerBtn);

      // Confirmation modal should appear
      expect(await screen.findByText('Changer de profil ?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Changer de profil réinitialisera les informations spécifiques à ce rôle (vidéo de présentation, expérience). Vos informations personnelles seront conservées.',
        ),
      ).toBeInTheDocument();

      // If cancelled, modal closes
      fireEvent.click(firstButton('Annuler'));
      expect(screen.queryByText('Changer de profil ?')).not.toBeInTheDocument();

      // Click again and confirm
      fireEvent.click(providerBtn);
      fireEvent.click(firstButton('Confirmer le changement'));
      expect(screen.queryByText('Changer de profil ?')).not.toBeInTheDocument();
    });

    it('switches role immediately without confirmation if no role-specific data was entered', () => {
      renderWithAuthStore(
        <IdentityStep
          profile={{
            ...unauthenticatedProfileWithPhoto,
            profile_type: 'INDIVIDUAL',
            experience: '',
            video: null,
          }}
          stepNumber={1}
          totalSteps={3}
          loading={false}
          isAuthenticated={true}
          onNext={vi.fn()}
        />,
        oauthAuthState,
      );

      // Click "Je cherche un prestataire" (PROVIDER)
      fireEvent.click(firstButton('Je cherche un prestataire'));
      // No confirmation modal
    });
  });
});
