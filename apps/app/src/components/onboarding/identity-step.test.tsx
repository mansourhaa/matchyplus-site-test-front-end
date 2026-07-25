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

  it('blocks submission and shows an error when job is missing', async () => {
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

    fireEvent.change(firstPlaceholder('Votre nom complet'), { target: { value: 'Jane Doe' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).not.toHaveBeenCalled();
    expect(
      await screen.findAllByText('Le nom et la profession sont obligatoires.'),
    ).not.toHaveLength(0);
  });

  it('submits name, job, and the selected profile type', async () => {
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

    fireEvent.change(firstPlaceholder('Votre nom complet'), { target: { value: 'Jane Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.click(firstButton('Employeur'));
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(onNext).toHaveBeenCalledWith({
      name: 'Jane Doe',
      job: 'Électricien',
      bio: undefined,
      image: undefined,
      profileType: 'PROVIDER',
    });
  });

  it('prefills from an existing profile and never shows phone/password fields', () => {
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

    expect(firstPlaceholder('Votre nom complet')).toHaveValue('Existing Name');
    expect(firstPlaceholder('Ingénieur, designer, chauffeur...')).toHaveValue('Plombier');
    expect(screen.queryByText('Numéro de téléphone')).not.toBeInTheDocument();
  });
});

describe('IdentityStep — account bootstrap (not yet authenticated)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows phone/password fields and "Créer un compte" as the heading', () => {
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

  it('sends OTP, then registers the account before calling onNext (without name, already sent)', async () => {
    const onNext = vi.fn().mockResolvedValue(true);
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
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

    fireEvent.change(firstPlaceholder('Votre nom complet'), { target: { value: 'Jane Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), { target: { value: 'secret123' } });
    fireEvent.click(firstButton('Envoyer le code'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+21612345678' });
    await vi.waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/register-phone', {
        phone: '+21612345678',
        password: 'secret123',
        code: '123456',
        name: 'Jane Doe',
      }),
    );
    await vi.waitFor(() =>
      expect(onNext).toHaveBeenCalledWith({
        job: 'Électricien',
        bio: undefined,
        image: undefined,
        profileType: 'INDIVIDUAL',
      }),
    );
  });

  it('does not call onNext when the OTP code is rejected', async () => {
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

    fireEvent.change(firstPlaceholder('Votre nom complet'), { target: { value: 'Jane Doe' } });
    fireEvent.change(firstPlaceholder('Ingénieur, designer, chauffeur...'), {
      target: { value: 'Électricien' },
    });
    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Au moins 6 caractères'), { target: { value: 'secret123' } });
    fireEvent.click(firstButton('Envoyer le code'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(firstButton('Enregistrer et continuer'));

    await screen.findAllByText('Code invalide ou expiré.');
    expect(onNext).not.toHaveBeenCalled();
  });
});
