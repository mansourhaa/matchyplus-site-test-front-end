// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Partner from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/devenir-partenaire/',
  useSearchParams: () => new URLSearchParams(),
}));

function fillAndSend() {
  const { container } = render(
    <I18nProvider locale="fr">
      <Partner />
    </I18nProvider>,
  );
  const fields = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'form input[required], form textarea[required]',
  );
  const values = ['Ali Ben Salah', 'ali@example.com', '94670292', 'Plombier à Sousse'];
  fields.forEach((field, index) => {
    fireEvent.change(field, { target: { value: values[index] ?? 'x' } });
  });
  fireEvent.click(screen.getByRole('button', { name: /Rejoindre le réseau professionnel/ }));
}

describe('partner form', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says "sent" only when the API received the application', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"success":true}'));
    fillAndSend();
    expect(await screen.findByText(/Demande envoyée/)).toBeInTheDocument();
  });

  it('shows an error when the API answers an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));
    fillAndSend();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Votre demande n’a pas pu être envoyée',
    );
    expect(screen.queryByText(/Demande envoyée/)).toBeNull();
  });
});
