/**
 * Renders via the flag-icons package (real, professionally-made flag SVGs), not
 * emoji — country-flag emoji frequently fail to render as actual flags on Windows
 * (shows blank boxes or letter codes instead), unlike macOS/iOS.
 *
 * This used to be several hand-drawn inline-SVG attempts scattered across the
 * codebase, each wrong in its own way (Tunisia's star drawn white instead of red —
 * reading as Turkey's flag — or shaped like an arc blob instead of a star; the UK
 * cross missing its white border). One real source of truth instead.
 *
 * flag-icons keys by country, not language — English maps to the UK (`gb`), and
 * Arabic maps to Tunisia (`tn`, this app's own Arabic-speaking market), not a
 * generic "Arabic" flag, since no such single flag exists.
 */
export type FlagLocale = 'fr' | 'en' | 'ar' | 'de' | 'es' | 'it';

const COUNTRY_CODE: Record<FlagLocale, string> = {
  fr: 'fr',
  en: 'gb',
  ar: 'tn',
  de: 'de',
  es: 'es',
  it: 'it',
};

export function FlagIcon({ locale, size = 15 }: { locale: FlagLocale; size?: number }) {
  return (
    <span
      className={`fi fi-${COUNTRY_CODE[locale]}`}
      style={{
        fontSize: size,
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}
