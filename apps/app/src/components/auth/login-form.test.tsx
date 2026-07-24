import { api } from '@/lib/api';
import { renderWithAuthStore } from '@/test/render-with-auth-store';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './login-form';

const { pushMock, refreshMock, searchParamsRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  searchParamsRef: { current: new URLSearchParams('step=phone') },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const otpUser = {
  id: 'user-1',
  email: null,
  phone: '+21612345678',
  name: null,
  auth_provider: 'phone',
  email_verified: false,
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
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    searchParamsRef.current = new URLSearchParams('step=phone');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the OTP send step by default, with no password field (OTP is primary, not loginPhone)', () => {
    renderWithAuthStore(<LoginForm />);

    expect(firstPlaceholder('XX XXX XXX')).toBeInTheDocument();
    expect(firstButton('Envoyer le code')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Au moins 6 caractères')).not.toBeInTheDocument();
  });

  it('sends an OTP, then verifies it and establishes a session (never calling /auth/login-phone)', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') {
        return { data: { message: 'sent', phone: '+21612345678' } };
      }
      if (url === '/auth/otp/verify') {
        return {
          data: { access_token: 'access-1', refresh_token: 'refresh-1', user: otpUser },
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));

    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Vérifier le code'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(refreshMock).toHaveBeenCalled();

    expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+21612345678' });
    expect(api.post).toHaveBeenCalledWith('/auth/otp/verify', {
      phone: '+21612345678',
      code: '123456',
    });
    expect(api.post).not.toHaveBeenCalledWith('/auth/login-phone', expect.anything());
  });

  it('renders visible (explicit text color) inputs in the forgot-password mini-flow', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'reset_code_sent' } });

    renderWithAuthStore(<LoginForm />);

    fireEvent.click(firstButton('Se connecter avec un mot de passe'));
    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Mot de passe oublié ?'));

    const codeInput = await findFirstPlaceholder('123456');
    const newPasswordInput = firstPlaceholder('6 caractères minimum');

    expect(codeInput).toHaveClass('text-[#353535]');
    expect(newPasswordInput).toHaveClass('text-[#353535]');
  });

  it('preserves a safe next param after a successful OTP verification', async () => {
    searchParamsRef.current = new URLSearchParams('step=phone&next=%2Fprojects');
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/otp/send') return { data: { message: 'sent', phone: '+21612345678' } };
      return { data: { access_token: 'access-1', refresh_token: 'refresh-1', user: otpUser } };
    });

    renderWithAuthStore(<LoginForm />);

    fireEvent.change(firstPlaceholder('XX XXX XXX'), { target: { value: '12345678' } });
    fireEvent.click(firstButton('Envoyer le code'));
    const codeInput = await findFirstPlaceholder('123456');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(firstButton('Vérifier le code'));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/projects'));
  });
});

describe('LoginForm — OAuth start URLs', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
    searchParamsRef.current = new URLSearchParams();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
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
