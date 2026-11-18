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

  it('shows the phone input and send OTP button on step=phone', () => {
    renderWithAuthStore(<LoginForm />);

    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Votre mot de passe')).not.toBeInTheDocument();
    expect(firstButton('Envoyer le code')).toBeInTheDocument();
  });

  it('sends login OTP and logs in via /auth/login-phone with { phone, code }', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/login-otp/send') {
        return { data: { message: 'Code envoyé', phone: '+21612345678' } };
      }
      if (url === '/auth/login-phone') {
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: phoneUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/login-otp/send', {
        phone: '+21612345678',
      }),
    );

    fireEvent.change(firstPlaceholder('000000'), { target: { value: '123456' } });
    fireEvent.click(firstButton('Continuer'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/home'));
    expect(refreshMock).toHaveBeenCalled();

    expect(api.post).toHaveBeenCalledWith('/auth/login-phone', {
      phone: '+21612345678',
      code: '123456',
    });
  });

  function apiErrorWithCode(code: string) {
    return { isAxiosError: true, response: { data: { code } } };
  }

  it('shows a specific message when phone is not registered on sendLoginOtp', async () => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode('phone_not_found'));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    expect(
      (await screen.findAllByText(/Aucun compte trouvé avec ce numéro/))[0],
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it.each([
    ['account_banned', /banni/],
    ['account_inactive', /désactivé/],
  ])('shows a specific message for %s on sendLoginOtp', async (code, expectedText) => {
    vi.mocked(api.post).mockRejectedValue(apiErrorWithCode(code));

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    expect((await screen.findAllByText(expectedText))[0]).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows an invalid OTP message when /auth/login-phone rejects with invalid_otp', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/login-otp/send') {
        return { data: { message: 'Code envoyé', phone: '+21612345678' } };
      }
      if (url === '/auth/login-phone') {
        throw apiErrorWithCode('invalid_otp');
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => expect(firstPlaceholder('000000')).toBeInTheDocument());
    fireEvent.change(firstPlaceholder('000000'), { target: { value: '999999' } });
    fireEvent.click(firstButton('Continuer'));

    expect((await screen.findAllByText(/Code incorrect/i))[0]).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('preserves a safe next param after a successful phone OTP login', async () => {
    searchParamsRef.current = new URLSearchParams('step=phone&next=%2Fmatches');
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/login-otp/send') {
        return { data: { message: 'Code envoyé', phone: '+21612345678' } };
      }
      return {
        data: { access_token: 'access-1', refresh_token: 'refresh-1', user: phoneUser },
      };
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    await waitFor(() => expect(firstPlaceholder('000000')).toBeInTheDocument());
    fireEvent.change(firstPlaceholder('000000'), { target: { value: '123456' } });
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

describe('LoginForm — Back button', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
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

  it('navigates to landing page when clicking the back button on main login screen', () => {
    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton('Retour'));

    expect(window.location.href).toBe('http://localhost:3002/?lang=fr');
  });

  it('navigates back to /connexion when clicking the back button on phone step', () => {
    searchParamsRef.current = new URLSearchParams('step=phone');
    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton('Retour'));

    expect(pushMock).toHaveBeenCalledWith('/connexion');
  });

  it('renders dedicated incomplete onboarding view on /connexion without bouncing', () => {
    searchParamsRef.current = new URLSearchParams();
    renderWithAuthStore(<LoginForm />, {
      status: 'authenticated',
      user: {
        ...phoneUser,
        onboarding_completed: false,
      },
      sessionChecked: true,
    });

    expect(replaceMock).not.toHaveBeenCalledWith('/inscription');
    expect(screen.getAllByText('Inscription en cours')[0]).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Continuer l’inscription/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Changer de compte \/ Se déconnecter/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Ou se connecter avec un autre compte/i })[0],
    ).toBeInTheDocument();
  });

  it('navigates to /inscription when clicking continue registration or header back', () => {
    searchParamsRef.current = new URLSearchParams();
    renderWithAuthStore(<LoginForm />, {
      status: 'authenticated',
      user: {
        ...phoneUser,
        onboarding_completed: false,
      },
      sessionChecked: true,
    });

    fireEvent.click(firstButton(/Continuer l’inscription/i));
    expect(pushMock).toHaveBeenCalledWith('/inscription');

    fireEvent.click(firstButton('Retour'));
    expect(pushMock).toHaveBeenCalledWith('/inscription');
  });

  it('navigates to /connexion?switch=true when clicking signInOtherAccountLink', () => {
    searchParamsRef.current = new URLSearchParams();
    renderWithAuthStore(<LoginForm />, {
      status: 'authenticated',
      user: {
        ...phoneUser,
        onboarding_completed: false,
      },
      sessionChecked: true,
    });

    fireEvent.click(firstButton(/Ou se connecter avec un autre compte/i));
    expect(pushMock).toHaveBeenCalledWith('/connexion?switch=true');
  });
});
