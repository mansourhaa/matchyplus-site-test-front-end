'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const LANGUAGE_NAMES: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
};

function Flag({ locale }: { locale: Locale }) {
  if (locale === 'fr') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 3 2"
        className="h-3 w-4.5 shrink-0 rounded-sm shadow-sm"
      >
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#FFFFFF" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  }
  if (locale === 'ar') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 30 20"
        className="h-3 w-4.5 shrink-0 rounded-sm shadow-sm"
      >
        <rect width="30" height="20" fill="#E20E17" />
        <circle cx="15" cy="10" r="6" fill="#FFF" />
        <path d="M16,10 A3.6 3.6 0 1 1 16 7 A3 3 0 1 0 16 10 Z" fill="#E20E17" />
        <polygon points="17.5,10 16.3,9.1 16.3,10.9" fill="#E20E17" />
      </svg>
    );
  }
  // en
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30"
      className="h-3 w-4.5 shrink-0 rounded-sm shadow-sm"
    >
      <clipPath id="s">
        <path d="M0,0 L60,0 L60,30 L0,30 Z" />
      </clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" stroke-width="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#00247D" stroke-width="4" />
        <path d="M0,15 L60,15 M30,0 L30,30" stroke="#FFF" stroke-width="10" />
        <path d="M0,15 L60,15 M30,0 L30,30" stroke="#CF142B" stroke-width="6" />
      </g>
    </svg>
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
      className={`brand-logo${footer ? 'brand-logo-footer' : ''}`}
      src={footer ? '/logo-matchy-white.svg' : '/matchy-logo.png'}
      alt="Matchy+"
    />
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = useI18n();

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
          <Link href="/#download">{t('landing.download')}</Link>
          <div ref={langRef} className="language-picker-custom relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 py-1.5 text-white select-none hover:bg-white/10"
            >
              <Flag locale={locale} />
              <span className="text-[14px] font-bold">{LANGUAGE_NAMES[locale]}</span>
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
          <Link className="nav-cta" href="/devenir-partenaire">
            {t('landing.cta')} <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          className="mobile-toggle"
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
