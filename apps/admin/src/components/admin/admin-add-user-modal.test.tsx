import rootReducer from '@/features/auth/store/root-reducer';
import { adminApi } from '@/lib/admin-api';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminAddUserModal } from './admin-add-user-modal';

function renderModal(onClose = vi.fn(), onCreated = vi.fn()) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  render(
    <Provider store={store}>
      <AdminAddUserModal isOpen onClose={onClose} onCreated={onCreated} />
    </Provider>,
  );
  return { onClose, onCreated };
}

async function fillMinimumValidForm({ manualPassword = true }: { manualPassword?: boolean } = {}) {
  fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Amine Ben Salah' } });
  fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '20123456' } });
  if (manualPassword) {
    fireEvent.click(screen.getByRole('button', { name: /mot de passe manuel/i }));
    fireEvent.change(screen.getByLabelText('Mot de passe temporaire'), {
      target: { value: 'Matchy2026!' },
    });
  }
  fireEvent.change(screen.getByLabelText('Métier'), { target: { value: 'Plombier' } });

  fireEvent.change(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
    target: { value: 'Plomberie' },
  });
  fireEvent.keyDown(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
    key: 'Enter',
  });

  fireEvent.click(screen.getByRole('button', { name: 'Trouver un job' }));

  const file = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [file] } });
  await screen.findByAltText('Aperçu');
}

describe('AdminAddUserModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('blocks submission and shows an error when required fields are missing', () => {
    const post = vi.spyOn(adminApi, 'post');
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    expect(
      screen.getByText('Le nom et le téléphone sont obligatoires.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('blocks submission when manual password mode is selected but password is empty', () => {
    const post = vi.spyOn(adminApi, 'post');
    renderModal();

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Amine Ben Salah' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '20123456' } });
    fireEvent.click(screen.getByRole('button', { name: /mot de passe manuel/i }));

    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    expect(
      screen.getByText('Le mot de passe est obligatoire en mode manuel.'),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('creates the user with the filled-in profile and closes the modal', async () => {
    const post = vi
      .spyOn(adminApi, 'post')
      .mockResolvedValue({ data: { user: { id: 'u1', name: 'Amine Ben Salah' } } });
    const { onClose, onCreated } = renderModal();

    await fillMinimumValidForm();
    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({
        name: 'Amine Ben Salah',
        phone: '20123456',
        password: 'Matchy2026!',
        job: 'Plombier',
        interests: ['Plomberie'],
        selectedGoals: ['Trouver un job'],
        image: expect.stringMatching(/^data:/),
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('creates a lead with activation link mode and displays the success screen', async () => {
    const post = vi.spyOn(adminApi, 'post').mockResolvedValue({
      data: {
        user: { id: 'u-lead', name: 'Amine Ben Salah', phone: '20123456' },
        activationToken: 'test-tok',
        activationLink: 'http://localhost:3000/activer?token=test-tok',
      },
    });
    const { onClose, onCreated } = renderModal();

    await fillMinimumValidForm({ manualPassword: false });
    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({
        name: 'Amine Ben Salah',
        phone: '20123456',
        password: undefined,
      }),
    );

    expect(await screen.findByText('Utilisateur pré-enregistré !')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('http://localhost:3000/activer?token=test-tok'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('creates the user without a profile photo', async () => {
    const post = vi
      .spyOn(adminApi, 'post')
      .mockResolvedValue({ data: { user: { id: 'u1', name: 'Amine Ben Salah' } } });
    renderModal();

    fireEvent.change(screen.getByLabelText('Nom complet'), {
      target: { value: 'Amine Ben Salah' },
    });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '20123456' } });
    fireEvent.click(screen.getByRole('button', { name: /mot de passe manuel/i }));
    fireEvent.change(screen.getByLabelText('Mot de passe temporaire'), { target: { value: 'Matchy2026!' } });
    fireEvent.change(screen.getByLabelText('Métier'), { target: { value: 'Plombier' } });
    fireEvent.change(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      target: { value: 'Plomberie' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trouver un job' }));

    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({ name: 'Amine Ben Salah', image: undefined }),
    );
  });

  it("surfaces the server's rejection message and keeps the modal open", async () => {
    const post = vi.spyOn(adminApi, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Ce numéro de téléphone est déjà utilisé.' } },
    });
    const { onClose } = renderModal();

    await fillMinimumValidForm();
    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    expect(await screen.findByText('Ce numéro de téléphone est déjà utilisé.')).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
