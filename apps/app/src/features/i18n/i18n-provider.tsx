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
  useSyncExternalStore,
} from 'react';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
};

const I18nContext = createContext<I18nContextValue | null>(null);

const localeListeners = new Set<() => void>();

function emitLocaleChange() {
  for (const listener of localeListeners) {
    listener();
  }
}

function subscribeLocale(onStoreChange: () => void) {
  localeListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    localeListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The language asked for in the URL (`?lang=ar`), e.g. by the landing site's links: the landing is
 * another site, so this is how a visitor on its Arabic pages lands on the app in Arabic. It is
 * kept as the visitor's language; without `lang`, the stored choice is used as before.
 */
function localeFromUrl(): Locale | null {
  const requested = new URLSearchParams(window.location.search).get('lang');
  return requested && SUPPORTED_LOCALES.includes(requested as Locale)
    ? (requested as Locale)
    : null;
}

/** The address whose `?lang` was last applied: applied once, so a later choice in the app wins. */
let appliedUrl: string | null = null;

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  if (appliedUrl !== window.location.href) {
    appliedUrl = window.location.href;
    const fromUrl = localeFromUrl();
    if (fromUrl) window.localStorage.setItem(LOCALE_STORAGE_KEY, fromUrl);
  }
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw && SUPPORTED_LOCALES.includes(raw as Locale)) return raw as Locale;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore keeps SSR/hydration on DEFAULT_LOCALE (getServerSnapshot)
  // and reads localStorage only on the client without a post-mount setState.
  const locale = useSyncExternalStore(subscribeLocale, readStoredLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    emitLocaleChange();
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

const defaultContext: I18nContextValue = {
  locale: 'fr',
  setLocale: () => {},
  t: (key: string) => key,
  dir: 'ltr',
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx ?? defaultContext;
}
