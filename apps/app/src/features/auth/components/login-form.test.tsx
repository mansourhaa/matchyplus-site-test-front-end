import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './login-form';

const { pushMock, replaceMock, refreshMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams('step=phone') },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  getApiErrorCode: (error: unknown) =>
    (error as { response?: { data?: { code?: string } } } | undefined)?.response?.data?.code,
}));

const phoneUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: null,
  auth_provider: 'phone',
  email_verified: false,
  verified: false,
  onboarding_completed: true,
};

// AuthLayout renders both a desktop and a mobile copy of the form content (CSS-hidden
// via className, not removed from the DOM) — every query below matches twice, so we
// always operate on the first match.
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

describe('LoginForm — phone step', () => {
  beforeEach(() => {
    // These tests assert French copy .
    window.localStorage.setItem('matchy_locale', 'fr');
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    searchParamsRef.current = new URLSearchParams('step=phone');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('shows the phone + password login form by default, with no OTP send step (OTP is never login)', () => {
    renderWithAuthStore(<LoginForm />);

    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
    expect(firstPlaceholder('Votre mot de passe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer le code' })).not.toBeInTheDocument();
  });

  it('logs in with phone + password via /auth/login-phone (never calling /auth/otp/*)', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/login-phone') {
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: phoneUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/home'));
    expect(refreshMock).toHaveBeenCalled();

    expect(api.post).toHaveBeenCalledWith('/auth/login-phone', {
      phone: '+21612345678',
      password: 'secret123',
    });
    expect(api.post).not.toHaveBeenCalledWith('/auth/otp/send', expect.anything());
    expect(api.post).not.toHaveBeenCalledWith('/auth/otp/verify', expect.anything());
  });

  it('renders visible (explicit text color) inputs in the forgot-password mini-flow', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'reset_code_sent' } });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Mot de passe oublié ?'));

    const codeInput = await findFirstPlaceholder('123456');
    const newPasswordInput = firstPlaceholder('Nouveau mot de passe');

    expect(codeInput).toHaveClass('text-[#353535]');
    expect(newPasswordInput).toHaveClass('text-[#353535]');
  });

  function apiErrorWithCode(code: string) {
    return { isAxiosError: true, response: { data: { code } } };
  }

  it('shows a specific message for an unverified phone, without offering OTP login', async () => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode('phone_not_verified'));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    expect((await screen.findAllByText(/n'a pas encore été vérifié/))[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer le code' })).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows a specific message for a social-only account', async () => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode('oauth_only_account'));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    expect((await screen.findAllByText(/Google ou LinkedIn/))[0]).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Regression: a banned/deactivated account has correct credentials — the account is
  // just blocked — so it must not be lumped in with "wrong password or unknown phone"
  // under the same generic invalid_credentials message.
  it.each([
    ['account_banned', /banni/],
    ['account_inactive', /désactivé/],
  ])('shows a specific message for %s', async (code, expectedText) => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode(code));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    expect((await screen.findAllByText(expectedText))[0]).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('falls back to the generic message for invalid_credentials (wrong password or unknown phone)', async () => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode('invalid_credentials'));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    expect(
      (
        await screen.findAllByText('Connexion échouée. Vérifiez votre numéro et votre mot de passe')
      )[0],
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('preserves a safe next param after a successful phone + password login', async () => {
    searchParamsRef.current = new URLSearchParams('step=phone&next=%2Fmatches');
    vi.mocked(api.post).mockResolvedValue({
      data: { access_token: 'access-1', refresh_token: 'refresh-1', user: phoneUser },
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.change(firstPlaceholder('Votre mot de passe'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(firstButton('Continuer'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/matches'));
  });
});

describe('LoginForm — OAuth start URLs', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    searchParamsRef.current = new URLSearchParams();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('starts Google OAuth at /auth/oauth/google (not the old /auth/google)', () => {
    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton(/Continuer avec Google/));

    expect(window.location.href).toBe('http://localhost:4000/auth/oauth/google');
  });

  it('starts LinkedIn OAuth at /auth/oauth/linkedin (not the old /auth/linkedin)', () => {
    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton(/Continuer avec LinkedIn/));

    expect(window.location.href).toBe('http://localhost:4000/auth/oauth/linkedin');
  });
});

describe('LoginForm — Créer un compte', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
    searchParamsRef.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem('matchy_locale');
  });

  it('goes to the onboarding wizard, where the identity step also collects phone + password + OTP for a new visitor', () => {
    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton('Créer un compte'));

    expect(pushMock).toHaveBeenCalledWith('/onboarding');
  });
});
