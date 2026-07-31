import onboardingReducer from '@/features/onboarding/store/onboarding-slice';
import { api } from '@/lib/api';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QrCodeView } from './qr-code-view';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { get: vi.fn() },
  };
});

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function buildStore() {
  return configureStore({ reducer: { onboarding: onboardingReducer } });
}

const profile = {
  id: 'user-1',
  name: 'Jane Doe',
  auth_provider: 'phone',
  job: 'Électricien',
  bio: null,
  image: null,
  city: null,
  profile_type: 'INDIVIDUAL',
  offer_service: false,
  service_type: null,
  price: null,
  interests: [] as string[],
  selected_goals: [] as string[],
  availability_days: [] as string[],
  availability_hours: [] as string[],
  contact_modes: [] as string[],
  languages: [] as string[],
  onboardingCompleted: true,
};

describe('QrCodeView', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://app.matchy.plus' },
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders a QR code encoding the profile URL, with the name and job below it', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: profile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <QrCodeView />
      </Provider>,
    );

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Électricien')).toBeInTheDocument();
    expect(screen.getByText('app.matchy.plus/profile/user-1')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('copies the profile link to the clipboard', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: profile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <QrCodeView />
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Copier/ }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://app.matchy.plus/profile/user-1',
      ),
    );
    expect(await screen.findByRole('button', { name: /Copié/ })).toBeInTheDocument();
  });

  it('falls back to copying the link when the Web Share API is unavailable', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: profile });
    const store = buildStore();

    render(
      <Provider store={store}>
        <QrCodeView />
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Partager/ }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://app.matchy.plus/profile/user-1',
      ),
    );
  });

  it('downloads the QR code as an SVG file named after the user', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: profile });
    const store = buildStore();
    const createElementSpy = vi.spyOn(document, 'createElement');

    render(
      <Provider store={store}>
        <QrCodeView />
      </Provider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Télécharger/ }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const anchor = createElementSpy.mock.results
      .map((result) => result.value as HTMLElement)
      .find((element) => element.tagName === 'A') as HTMLAnchorElement;
    expect(anchor.download).toBe('matchy-qr-jane.svg');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
