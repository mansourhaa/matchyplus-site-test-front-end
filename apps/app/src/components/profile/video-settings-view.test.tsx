import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import profileReducer from '@/features/profile/store/profile-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VideoSettingsView } from './video-settings-view';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function buildStore() {
  return configureStore({ reducer: { onboarding: onboardingReducer, profile: profileReducer } });
}

const baseProfile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: null,
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
  onboardingCompleted: true,
};

describe('VideoSettingsView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a placeholder and no remove button when there is no video yet', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: baseProfile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <VideoSettingsView />
      </Provider>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByText('Ajouter une vidéo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Supprimer la vidéo')).not.toBeInTheDocument();
  });

  it('uploads a video and refreshes the profile', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: baseProfile });
    vi.mocked(api.post).mockResolvedValue({ data: { video: '/uploads/videos/new.mp4' } });
    const store = buildStore();

    render(
      <Provider store={store}>
        <VideoSettingsView />
      </Provider>,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    const file = new File(['abc'], 'video.mp4', { type: 'video/mp4' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/me/profile/video', expect.any(FormData)),
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('shows a player and remove button once a video exists', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ...baseProfile, video: '/uploads/videos/abc.mp4' },
    });
    vi.mocked(api.delete).mockResolvedValue({ data: { video: null } });
    const store = buildStore();

    render(
      <Provider store={store}>
        <VideoSettingsView />
      </Provider>,
    );

    expect(await screen.findByLabelText('Supprimer la vidéo')).toBeInTheDocument();
    expect(screen.getByText('Remplacer la vidéo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Supprimer la vidéo'));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/users/me/profile/video'));
  });
});
