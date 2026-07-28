import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from './identity-step';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

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

const registeredUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: 'Jane Doe',
  auth_provider: 'phone',
  email_verified: false,
  onboarding_completed: false,
};

describe('IdentityStep — resuming (already authenticated)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission and shows an error when profession is missing for an Employé profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated
        onNext={onNext}
      />,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(await screen.findAllByText('La profession est obligatoire.')).not.toHaveLength(0);
  });

  it('does not require profession for an Employeur (PROVIDER) profile', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated
        onNext={onNext}
      />,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.click(firstButton('Employeur'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: undefined,
      bio: undefined,
      image: undefined,
      profileType: 'PROVIDER',
    });
  });

  it('submits prénom, nom, job, and the selected profile type', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated
        onNext={onNext}
      />,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      image: undefined,
      profileType: 'INDIVIDUAL',
    });
  });

  it('prefills prénom/nom by splitting the existing name, and never shows the phone field', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={{
          id: 'user-1',
          name: 'Existing Name',
          job: 'Plombier',
          bio: null,
          image: null,
          city: null,
          profile_type: 'INDIVIDUAL',
          offer_service: false,
          service_type: null,
          sector: null,
          price: null,
          interests: [],
          selected_goals: [],
          experience: null,
          experiences: null,
          education_level: null,
          educations: null,
          availability_days: [],
          availability_hours: [],
          contact_modes: [],
          languages: [],
          onboardingCompleted: false,
        }}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated
        onNext={vi.fn()}
      />,
    );

    expect(firstPlaceholder('Votre prénom')).toHaveValue('Existing');
    expect(firstPlaceholder('Votre nom de famille')).toHaveValue('Name');
    expect(firstPlaceholder('Ingénieur, designer, chauffeur...')).toHaveValue('Plombier');
    expect(screen.queryByText('Numéro de téléphone')).not.toBeInTheDocument();
  });
});

describe('IdentityStep — account bootstrap (not yet authenticated)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the phone and password fields and "Créer un compte" as the heading', () => {
    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated={false}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Créer un compte')[0]).toBeInTheDocument();
    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
    expect(firstPlaceholder('Au moins 6 caractères')).toBeInTheDocument();
  });

  it('sends OTP, verifies it for a signup grant, registers via /auth/register-phone, then calls onNext', async () => {
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
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Vérifier le numéro par SMS'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+21612345678' });
    await vi.waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/otp/verify', {
        phone: '+21612345678',
        code: '123456',
      }),
    );
    await vi.waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        password: 'secret123',
        name: 'Jane Doe',
        signupToken: 'valid-grant-token',
      }),
    );
    await vi.waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        name: 'Jane Doe',
        job: 'Électricien',
        bio: undefined,
        image: undefined,
        profileType: 'INDIVIDUAL',
      }),
    );
  });

  it('does not call registerPhone or onNext when the OTP code is rejected', async () => {
    const onNext = vi.fn();
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      throw new Error('invalid_otp');
    });

    renderWithAuthStore(
      <IdentityStep
        profile={null}
        stepNumber={1}
        totalSteps={5}
        loading={false}
        isAuthenticated={false}
        onNext={onNext}
      />,
    );

    fireEvent.change(firstPlaceholder('Votre prénom'), { target: { value: 'Jane' } });
    fireEvent.change(firstPlaceholder('Votre nom de famille'), { target: { value: 'Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Vérifier le numéro par SMS'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    await screen.findAllByText('Code incorrect.');
    expect(api.post).not.toHaveBeenCalledWith('/auth/register-phone', expect.anything());
    expect(onNext).not.toHaveBeenCalled();
  });
});
