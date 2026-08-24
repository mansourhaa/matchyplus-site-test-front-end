import { I18nProvider } from '@/features/i18n/i18n-provider';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PublicLayout from './layout';
import PublicPrivacyPolicyPage from './privacy-policy/page';
import PublicTermsOfServicePage from './terms-of-service/page';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/privacy-policy'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

describe('Public Legal Pages', () => {
  beforeEach(() => {
    window.localStorage.setItem('matchy_locale', 'fr');
  });

  it('renders public privacy policy page inside public layout', () => {
    render(
      <I18nProvider>
        <PublicLayout>
          <PublicPrivacyPolicyPage />
        </PublicLayout>
      </I18nProvider>,
    );

    // Verify Public Header branding
    expect(screen.getByAltText('Matchy+')).toBeInTheDocument();
    expect(screen.getByText('Retour')).toBeInTheDocument();

    // Verify Privacy Policy content
    expect(screen.getByText('Plateforme Matchy+')).toBeInTheDocument();
    expect(screen.getByText('1. Données collectées')).toBeInTheDocument();

    // Verify Public Footer
    expect(screen.getByText(/Conditions d['’]utilisation/i)).toBeInTheDocument();
    expect(screen.getByText(/Tous droits réservés/i)).toBeInTheDocument();
  });

  it('renders public terms of service page inside public layout', () => {
    render(
      <I18nProvider>
        <PublicLayout>
          <PublicTermsOfServicePage />
        </PublicLayout>
      </I18nProvider>,
    );

    // Verify Terms of Service content
    expect(screen.getByText('Plateforme Matchy+')).toBeInTheDocument();
    expect(screen.getByText('1. Présentation de la plateforme')).toBeInTheDocument();
  });
});
