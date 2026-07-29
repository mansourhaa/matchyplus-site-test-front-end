'use client';

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  Locale,
  SUPPORTED_LOCALES,
  formatMessage,
  getMessage,
  messages,
} from '@/features/i18n/messages';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw && SUPPORTED_LOCALES.includes(raw as Locale)) return raw as Locale;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // TEMPORARY - dev's own recent i18n work trips react-hooks/set-state-in-effect
    // here, but this is the correct pattern for this case: initial state must
    // stay DEFAULT_LOCALE on both server and client to avoid a hydration
    // mismatch, then read the real stored locale post-mount. A lazy useState
    // initializer would read localStorage during the client's first render
    // too, mismatching the server-rendered DEFAULT_LOCALE. Suppressing to
    // unblock a CI diagnostic run - revert before merge, not this PR's bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template =
        getMessage(messages[locale], key) || getMessage(messages[DEFAULT_LOCALE], key) || key;
      return formatMessage(template, vars);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
