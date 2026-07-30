import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditProfileForm } from './edit-profile-form';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function buildStore() {
  return configureStore({ reducer: { onboarding: onboardingReducer, profile: profileReducer } });
}

const fetchedProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: 'Électricien',
  bio: 'Bio text',
  image: '/uploads/photos/abc.jpg',
  video: null,
  city: 'Tunis',
  profile_type: 'INDIVIDUAL',
  offer_service: false,
  service_type: null,
  price: null,
  interests: ['Bricolage'],
  selected_goals: ['Trouver un job'],
  availability_days: [],
  availability_hours: [],
  contact_modes: [],
  languages: [],
  onboardingCompleted: true,
};

describe('EditProfileForm', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('hydrates the fields from the fetched profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Électricien')).toBeInTheDocument();
    expect(screen.getByText('Bio text')).toBeInTheDocument();
    expect(screen.getByText('Centres d’intérêt')).toBeInTheDocument();
    expect(screen.getByText('Expériences professionnelles')).toBeInTheDocument();
  });

  it('blocks saving with an empty name', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ...fetchedProfile, name: '' },
    });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Le nom est obligatoire.')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('saves the edited fields and shows a confirmation', async () => {
    const savedProfile = { ...fetchedProfile, job: 'Plombier' };
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockResolvedValue({ data: savedProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier le nom et la profession' }),
    );
    const jobInput = screen.getByDisplayValue('Électricien');
    fireEvent.change(jobInput, { target: { value: 'Plombier' } });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }),
    );

    expect(await screen.findByText('✓ Profil mis à jour')).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith(
      '/users/me/profile',
      expect.objectContaining({ job: 'Plombier' }),
    );
  });

  it('persists a biography from its section save action', async () => {
    const savedProfile = { ...fetchedProfile, bio: 'Nouvelle biographie' };
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockResolvedValue({ data: savedProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    const biographyHeading = await screen.findByRole('heading', { name: 'Biographie' });
    fireEvent.click(
      within(biographyHeading.closest('section') as HTMLElement).getByRole('button', {
        name: 'Modifier',
      }),
    );
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), {
      target: { value: 'Nouvelle biographie' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }),
    );

    expect(await screen.findByText('✓ Profil mis à jour')).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith(
      '/users/me/profile',
      expect.objectContaining({ bio: 'Nouvelle biographie' }),
    );
  });

  it('represents a persisted introduction video by filename', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ...fetchedProfile,
        video: '/uploads/videos/1f3e4151-7f9c-4d7b-a780-c41ef4207feb.mp4',
      },
    });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    expect(await screen.findByText('1f3e4151-7f9c-4d7b-a780-c41ef4207feb.mp4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lire la vidéo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer la vidéo' })).toBeInTheDocument();
  });

  it('shows a failure message when the save request is rejected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockRejectedValue(new Error('Network Error'));
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Modifier le nom et la profession' }),
    );
    fireEvent.change(screen.getByDisplayValue('Électricien'), {
      target: { value: 'Plombier' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }),
    );

    // The failure is surfaced both inside the still-open sheet and on the page banner —
    // querying within the dialog proves it's visible where the user is actually looking,
    // not just hidden behind the modal.
    expect(
      await within(screen.getByRole('dialog')).findByText('Échec de la sauvegarde. Réessayez.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('✓ Profil mis à jour')).not.toBeInTheDocument();
  });

  it('uploads a new photo and refreshes the profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.post).mockResolvedValue({ data: { image: '/uploads/photos/new.jpg' } });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/me/profile/photo', expect.any(FormData)),
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('removes the current photo', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.delete).mockResolvedValue({ data: { image: null } });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    fireEvent.click(await screen.findByText('Supprimer la photo'));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/users/me/profile/photo'));
  });

  it('persists a new professional experience via PATCH instead of only local state', async () => {
    const savedProfile = {
      ...fetchedProfile,
      experiences: [
        {
          id: 'exp-1',
          title: 'Chef de chantier',
          company: '',
          type: '',
          startDate: '',
          endDate: '',
          current: false,
        },
      ],
    };
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockResolvedValue({ data: savedProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    const heading = await screen.findByRole('heading', { name: 'Expériences professionnelles' });
    fireEvent.click(
      within(heading.closest('section') as HTMLElement).getByRole('button', { name: 'Ajouter' }),
    );
    fireEvent.change(screen.getByLabelText('Intitulé du poste *'), {
      target: { value: 'Chef de chantier' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }),
    );

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/users/me/profile',
        expect.objectContaining({
          experiences: [expect.objectContaining({ title: 'Chef de chantier' })],
        }),
      ),
    );
    expect(await screen.findByText('Chef de chantier')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a failure message inside the experience editor when persisting fails, and keeps it open', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockRejectedValue(new Error('Network Error'));
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    const heading = await screen.findByRole('heading', { name: 'Expériences professionnelles' });
    fireEvent.click(
      within(heading.closest('section') as HTMLElement).getByRole('button', { name: 'Ajouter' }),
    );
    fireEvent.change(screen.getByLabelText('Intitulé du poste *'), {
      target: { value: 'Chef de chantier' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }),
    );

    expect(
      await within(screen.getByRole('dialog')).findByText('Échec de la sauvegarde. Réessayez.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("Aucune expérience pour l'instant")).toBeInTheDocument();
  });

  it('discards an abandoned interests-sheet edit instead of letting it ride along on a later save', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: fetchedProfile });
    vi.mocked(api.patch).mockResolvedValue({ data: fetchedProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <EditProfileForm />
      </Provider>,
    );

    const interestsHeading = await screen.findByRole('heading', { name: 'Centres d’intérêt' });
    fireEvent.click(
      within(interestsHeading.closest('section') as HTMLElement).getByRole('button', {
        name: 'Modifier',
      }),
    );
    // Remove the only interest inside the sheet, then dismiss without saving.
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Bricolage/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' }));

    // The chip must still be visible outside the sheet — the removal was never committed.
    expect(screen.getByText('Bricolage')).toBeInTheDocument();

    // An unrelated later save must not resend the removed-but-unsaved interest.
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/users/me/profile',
        expect.objectContaining({ interests: ['Bricolage'] }),
      ),
    );
  });
});
