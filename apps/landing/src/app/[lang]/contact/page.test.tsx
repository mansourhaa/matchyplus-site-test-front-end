// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Contact from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/contact/',
  useSearchParams: () => new URLSearchParams(),
}));

function fillAndSend() {
  render(
    <I18nProvider locale="fr">
      <Contact />
    </I18nProvider>,
  );
  fireEvent.change(screen.getAllByPlaceholderText('Nom complet')[0], { target: { value: 'Ali' } });
  fireEvent.change(screen.getByPlaceholderText('nom@exemple.com'), {
    target: { value: 'ali@example.com' },
  });
  fireEvent.change(screen.getAllByPlaceholderText('Votre message')[0], {
    target: { value: 'Bonjour' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Envoyer le message/ }));
}

describe('contact form', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says "sent" only when the API received the message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"success":true}'));
    fillAndSend();
    expect(await screen.findByText('Merci ! Votre message a bien été envoyé.')).toBeInTheDocument();
  });

  it('shows an error, and keeps the form, when the API cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    fillAndSend();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Votre message n’a pas pu être envoyé',
    );
    expect(screen.queryByText('Merci ! Votre message a bien été envoyé.')).toBeNull();
    expect(screen.getByRole('button', { name: /Envoyer le message/ })).toBeInTheDocument();
  });
});
