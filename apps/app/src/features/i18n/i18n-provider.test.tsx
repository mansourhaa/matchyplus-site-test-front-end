import { LOCALE_STORAGE_KEY } from '@/features/i18n/messages';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider, useI18n } from './i18n-provider';

function ShowLocale() {
  const { locale, dir, setLocale } = useI18n();
  return (
    <>
      <p data-testid="locale">
        {locale} {dir}
      </p>
      <button type="button" onClick={() => setLocale('fr')}>
        fr
      </button>
    </>
  );
}

function openAt(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <I18nProvider>
      <ShowLocale />
    </I18nProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('I18nProvider language from the URL (links from the landing site)', () => {
  it('?lang=ar opens the app in Arabic, right to left, and keeps it', () => {
    openAt('/connexion?lang=ar');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar rtl');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
  });

  it('a later choice in the app wins over the ?lang of the address', () => {
    openAt('/register?lang=ar&service=Plombier');
    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
    act(() => screen.getByRole('button', { name: 'fr' }).click());
    expect(screen.getByTestId('locale')).toHaveTextContent('fr ltr');
  });

  it('an unknown ?lang or no ?lang keeps the stored language', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
    openAt('/connexion?lang=de');
    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
  });
});
