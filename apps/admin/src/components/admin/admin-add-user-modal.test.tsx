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

async function fillMinimumValidForm() {
  fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Amine Ben Salah' } });
  fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '20123456' } });
  fireEvent.change(screen.getByLabelText('Métier'), { target: { value: 'Plombier' } });

  const file = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(fileInput, { target: { files: [file] } });
  await screen.findByAltText('Aperçu');

  // Navigate to step 2
  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

  fireEvent.change(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
    target: { value: 'Plomberie' },
  });
  fireEvent.keyDown(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
    key: 'Enter',
  });

  fireEvent.click(screen.getByRole('button', { name: 'Trouver un job' }));

  // Navigate to step 3
  fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
}

describe('AdminAddUserModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('blocks navigation and shows an error when required fields are missing', () => {
    const post = vi.spyOn(adminApi, 'post');
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    expect(
      screen.getByText('Le nom et le téléphone sont obligatoires.'),
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
        job: 'Plombier',
        interests: ['Plomberie'],
        selectedGoals: ['Trouver un job'],
        image: expect.stringMatching(/^data:/),
        languages: ['fr', 'ar'],
        email: undefined,
        city: undefined,
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

    await fillMinimumValidForm();
    fireEvent.click(screen.getByRole('button', { name: "Créer l'utilisateur" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({
        name: 'Amine Ben Salah',
        phone: '20123456',
      }),
    );

    expect(await screen.findByText('Utilisateur pré-enregistré !')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('http://localhost:3000/activer?token=test-tok'),
    ).toBeInTheDocument();
    expect(screen.getByText("Message SMS d'invitation")).toBeInTheDocument();
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();

    const smsButton = screen.getByRole('button', { name: /envoyer par sms/i });
    expect(smsButton).toBeInTheDocument();

    fireEvent.click(smsButton);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/admin/users/u-lead/send-activation-sms',
        expect.objectContaining({
          activationLink: 'http://localhost:3000/activer?token=test-tok',
        }),
      );
    });
    expect(await screen.findByText('SMS envoyé avec succès !')).toBeInTheDocument();

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
    fireEvent.change(screen.getByLabelText('Métier'), { target: { value: 'Plombier' } });

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    fireEvent.change(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      target: { value: 'Plomberie' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trouver un job' }));

    // Step 2 to Step 3
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

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

  it('navigates through steps with Suivant and Précédent buttons', async () => {
    renderModal();

    // Step 1: cannot advance without name & phone
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    expect(screen.getByText('Le nom et le téléphone sont obligatoires.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Amine Ben Salah' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '20123456' } });
    fireEvent.change(screen.getByLabelText('Métier'), { target: { value: 'Plombier' } });

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    expect(screen.getByRole('heading', { name: 'Centres d’intérêt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Créer l'utilisateur" })).not.toBeInTheDocument();

    // Step 2 to Step 1 via Précédent
    fireEvent.click(screen.getByRole('button', { name: /précédent/i }));
    expect(screen.getByLabelText('Nom complet')).toBeInTheDocument();

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    expect(screen.getByRole('heading', { name: 'Centres d’intérêt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Créer l'utilisateur" })).not.toBeInTheDocument();

    // Add required interest and goal for step 2
    fireEvent.change(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      target: { value: 'Plomberie' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Ajouter un centre d’intérêt personnalisé'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Trouver un job' }));

    // Step 2 to Step 3
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    expect(screen.getByRole('heading', { name: 'Disponibilités & Préférences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Créer l'utilisateur" })).toBeInTheDocument();
  });
});
