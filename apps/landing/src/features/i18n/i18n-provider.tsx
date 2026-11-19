'use client';

import {
  DEFAULT_LOCALE,
  Locale,
  asList,
  asRows,
  formatMessage,
  getMessage,
  messages,
} from '@/features/i18n/messages';
import { LOCALE_COOKIE, localeDir, switchLocalePath } from '@/features/i18n/routing';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** A list of texts (`string[]`), [] if the key is missing or holds something else. */
  tList: (key: string) => string[];
  /** A table of texts (`string[][]`), [] if the key is missing or holds something else. */
  tRows: (key: string) => string[][];
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * `locale` comes from the URL (`/fr/`, `/en/`, `/ar/`), so the server renders each page in its
 * own language. Switching language navigates to the same page under the other prefix.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // scroll: false keeps the reader where they were, as the in-place switch used to.
      router.push(`${switchLocalePath(pathname, next)}${window.location.hash}`, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): any => {
      const template =
        getMessage(messages[locale], key) || getMessage(messages[DEFAULT_LOCALE], key) || key;
      if (typeof template === 'string') {
        return formatMessage(template, vars);
      }
      return template;
    },
    [locale],
  );

  // same lookup as `t` (current language, then the default one), typed instead of cast
  const lookup = useCallback(
    (key: string) => getMessage(messages[locale], key) ?? getMessage(messages[DEFAULT_LOCALE], key),
    [locale],
  );
  const tList = useCallback((key: string) => asList(lookup(key)), [lookup]);
  const tRows = useCallback((key: string) => asRows(lookup(key)), [lookup]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      tList,
      tRows,
      dir: localeDir(locale),
    }),
    [locale, setLocale, t, tList, tRows],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
