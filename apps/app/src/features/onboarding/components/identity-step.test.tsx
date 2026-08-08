import { I18nProvider } from '@/features/i18n/i18n-provider';
import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from './identity-step';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

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
  fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
  fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
    target: { value: 'Électricien' },
  });
  fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
}

describe('IdentityStep', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission and shows an error when profession is missing for an Employé profile', async () => {
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    // handleNext now checks for a pending photo upload before calling onNext — an async
    // gate even when, as here, there's nothing to upload — so the call lands a microtask
    // later rather than synchronously within the click handler.
    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        profileType: 'INDIVIDUAL',
      }),
    );
  });

  it('does not require profession for an Employeur (PROVIDER) profile', async () => {
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Employeur'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: undefined,
        bio: undefined,
        profileType: 'PROVIDER',
      }),
    );
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        profileType: 'INDIVIDUAL',
      }),
    );
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
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
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    const file = new File(['abc'], 'selfie.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(await screen.findAllByText("Échec de l'envoi de la photo. Réessayez.")).not.toHaveLength(
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
    expect(firstPlaceholder('Votre nom de famille')).toHaveValue('Name');
    expect(firstPlaceholder('Ingénieur, designer, chauffeur...')).toHaveValue('Plombier');
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
    expect(firstPlaceholder('Votre nom de famille')).toHaveValue('Name');
    expect(firstPlaceholder('Ingénieur, designer, chauffeur...')).toHaveValue('Plombier');
  });
});

describe('IdentityStep — credentials for a not-yet-authenticated visitor', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getAllByText('La photo de profil est obligatoire.')[0]).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not send an OTP when the password is too short', () => {
    const onNext = vi.fn().mockResolvedValue(true);
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'short' },
    });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    expect(api.post).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('Le mot de passe doit contenir au moins 6 caractères.')[0],
    ).toBeInTheDocument();
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
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
        password: 'secret123',
        signupToken: 'valid-grant-token',
      }),
    );
    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        profileType: 'INDIVIDUAL',
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
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
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer et vérifier par SMS'));

    const codeInput = await findFirstPlaceholder('------');
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(firstButton('Confirmer'));

    await screen.findAllByText('Code incorrect.');
    expect(api.post).not.toHaveBeenCalledWith('/auth/register-phone', expect.anything());
    expect(onNext).not.toHaveBeenCalled();
  });
});
