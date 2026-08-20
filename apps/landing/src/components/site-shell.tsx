'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { APP_LOGIN_URL } from '@/lib/constants';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const LANGUAGE_NAMES: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
};

// Renders via the flag-icons package (real, professionally-made flag SVGs), not
// hand-drawn shapes — flag-icons keys by country, not language: English maps to the
// UK (`gb`), Arabic maps to Tunisia (`tn`, this app's own Arabic-speaking market).
const COUNTRY_CODE: Record<Locale, string> = { fr: 'fr', en: 'gb', ar: 'tn' };

function Flag({ locale, size = 15 }: { locale: Locale; size?: number }) {
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

const languageOptions = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
] as const;

function Logo({ footer = false }: { footer?: boolean }) {
  return (
    <img
      className={footer ? 'brand-logo-footer' : 'brand-logo'}
      src={footer ? '/logo-matchy-white.svg' : '/logo-matchy.svg'}
      alt="Matchy+"
      style={{ height: footer ? '30px' : '28px', width: 'auto' }}
    />
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleLanguageChange = (val: string) => {
    setLocale(val as Locale);
    setLangOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link href="/" className="brand" aria-label="Matchy Plus home">
          <Logo />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#services">{t('landing.services')}</Link>
          <Link href="/#explore">{t('landing.explore')}</Link>
          <Link href="/#how">{t('landing.how')}</Link>
          <Link href="/contact">{t('landing.contact')}</Link>
          <div ref={langRef} className="language-picker-custom relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white/10 px-3 py-1.5 text-white transition-colors select-none hover:bg-white/20"
            >
              <Flag locale={locale} />
              <span className="text-[13px] font-bold">{LANGUAGE_NAMES[locale]}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {langOpen && (
              <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-32 overflow-hidden rounded-xl border border-neutral-100 bg-white py-1 shadow-xl">
                {(['fr', 'en', 'ar'] as Locale[]).map((item) => {
                  const active = locale === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleLanguageChange(item)}
                      className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
                    >
                      <span className="flex items-center gap-2">
                        <Flag locale={item} />
                        <span>{LANGUAGE_NAMES[item]}</span>
                      </span>
                      {active && <span className="bg-brand-teal h-2 w-2 rounded-full" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Link className="nav-cta" href={APP_LOGIN_URL}>
            {t('landing.cta')} <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          className="mobile-toggle text-white"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="mobile-menu">
          <Link href="/#services" onClick={() => setOpen(false)}>
            {t('landing.services')}
          </Link>
          <Link href="/#explore" onClick={() => setOpen(false)}>
            {t('landing.explore')}
          </Link>
          <Link href="/#how" onClick={() => setOpen(false)}>
            {t('landing.how')}
          </Link>
          <Link href="/faq" onClick={() => setOpen(false)}>
            {t('landing.faq')}
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)}>
            {t('landing.contact')}
          </Link>
          <Link href="/devenir-partenaire" onClick={() => setOpen(false)}>
            {t('landing.partner')}
          </Link>
          <Link href="/suppression-compte" onClick={() => setOpen(false)}>
            {t('landing.delete')}
          </Link>
          <div className="mobile-langs">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  handleLanguageChange(option.value);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-sm font-semibold text-white"
                aria-label={option.label}
              >
                <Flag locale={option.value} /> {option.value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { locale, t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="footer-grid container">
        <div>
          <Link href="/" className="brand footer-brand">
            <Logo footer />
          </Link>
          <p>{t('landing.panAfrican')}</p>
        </div>
        <div>
          <h3>{locale === 'ar' ? 'اكتشف' : locale === 'en' ? 'Discover' : 'Découvrir'}</h3>
          <Link href="/#services">{t('landing.services')}</Link>
          <Link href="/#explore">{t('landing.explore')}</Link>
          <Link href="/#how">{t('landing.how')}</Link>
          <Link href="/#download">{t('landing.download')}</Link>
        </div>
        <div>
          <h3>
            {locale === 'ar' ? 'روابط مفيدة' : locale === 'en' ? 'Useful links' : 'Liens utiles'}
          </h3>
          <Link href="/faq">{t('landing.faq')}</Link>
          <Link href="/contact">{t('landing.contact')}</Link>
          <Link href="/devenir-partenaire">{t('landing.partner')}</Link>
          <Link href="/suppression-compte">{t('landing.delete')}</Link>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>{t('landing.allRights')}</span>
        <span>{t('landing.designedFor')}</span>
      </div>
    </footer>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  const { dir } = useI18n();
  return (
    <div dir={dir}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
