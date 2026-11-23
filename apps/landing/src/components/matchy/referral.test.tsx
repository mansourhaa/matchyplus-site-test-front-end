// @vitest-environment jsdom
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { SUPPORTED_LOCALES, getMessage, messages } from '@/features/i18n/messages';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReferralCode, referralUrl } from './referral';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/fr/',
}));

const KEYS = [
  'referralCodeLabel',
  'referralSampleCode',
  'referralCopy',
  'referralCopied',
  'referralQr',
  'referralYou',
];

describe('referralUrl', () => {
  it('adds the code to the sign-up link', () => {
    expect(referralUrl('https://app.matchyplus.com/register', 'MP-7K2Q9')).toBe(
      'https://app.matchyplus.com/register?ref=MP-7K2Q9',
    );
  });
});

describe('referral texts', () => {
  it.each(SUPPORTED_LOCALES)('%s has every referral text', (locale) => {
    for (const key of KEYS) expect(getMessage(messages[locale], `landing.${key}`)).toBeTruthy();
  });
});

describe('ReferralCode', () => {
  function renderFr() {
    return render(
      <I18nProvider locale="fr">
        <ReferralCode />
      </I18nProvider>,
    );
  }

  it('shows the code, a QR code and the points', () => {
    renderFr();
    expect(screen.getByText('MP-7K2Q9')).toBeInTheDocument();
    // the QR code is an SVG with a title, so screen readers know what it is
    expect(screen.getByText('Scannez pour rejoindre Matchy+')).toBeInTheDocument();
    expect(document.querySelector('svg title')).not.toBeNull();
    expect(screen.getByText('10 points pour vous')).toBeInTheDocument();
  });

  it('copies the code and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderFr();
    fireEvent.click(screen.getByRole('button', { name: 'Copier le code' }));
    expect(writeText).toHaveBeenCalledWith('MP-7K2Q9');
    expect(await screen.findByText('Code copié !')).toBeInTheDocument();
  });
});
