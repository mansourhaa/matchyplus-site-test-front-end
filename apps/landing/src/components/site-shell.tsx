'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const languageOptions = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ar', label: 'العربية', flag: '🇹🇳' },
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
  const { locale, setLocale, t } = useI18n();

  const handleLanguageChange = (val: string) => {
    setLocale(val as Locale);
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
          <div className="language-picker">
            <span aria-hidden="true">
              {languageOptions.find((option) => option.value === locale)?.flag}
            </span>
            <ChevronDown size={14} />
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
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
                className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm font-semibold text-white"
                aria-label={option.label}
              >
                <span aria-hidden="true">{option.flag}</span> {option.value.toUpperCase()}
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
