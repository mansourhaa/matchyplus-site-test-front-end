import rootReducer from '@/features/auth/store/root-reducer';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminLoginForm } from './admin-login-form';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

function renderForm() {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

  return {
    store,
    ...render(<AdminLoginForm />, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    }),
  };
}

function submit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /Accéder au panneau/ }));
}

describe('AdminLoginForm', () => {
  afterEach(() => {
    // vitest runs without `globals`, so testing-library's automatic cleanup is not installed.
    cleanup();
    vi.restoreAllMocks();
    push.mockClear();
    sessionStorage.clear();
    document.cookie = 'admin_access_token=; path=/; max-age=0';
  });

  it('renders the admin branding and credential fields', () => {
    renderForm();

    expect(screen.getByText('Connexion Admin')).toBeInTheDocument();
    expect(screen.getByText('Accès réservé aux gestionnaires autorisés')).toBeInTheDocument();
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByText('Gestion utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Analytiques avancées')).toBeInTheDocument();
  });

  it('validates that both fields are filled before calling the api', () => {
    const post = vi.spyOn(api, 'post');
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Accéder au panneau/ }));

    expect(screen.getByText('Veuillez remplir tous les champs.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('stores the session and redirects to the panel on success', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        access_token: 'admin-token',
        user: {
          id: 'admin-1',
          email: 'admin@matchyplus.tn',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      },
    } as never);

    const { store } = renderForm();
    submit('admin@matchyplus.tn', 'matchy2026');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'));

    expect(post).toHaveBeenCalledWith('/auth/admin/login', {
      email: 'admin@matchyplus.tn',
      password: 'matchy2026',
    });
    expect(store.getState().adminAuth.admin?.role).toBe('SUPER_ADMIN');
    expect(document.cookie).toContain('admin_access_token=admin-token');
  });

  it('shows an error and stays put when the api rejects the credentials', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { data: { message: 'invalid credentials' } },
    });

    renderForm();
    submit('user@example.com', 'password123');

    expect(
      await screen.findByText('Identifiants incorrects. Vérifiez votre email et mot de passe.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('admin_access_token');
  });
});
