'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { localizePath } from '@/features/i18n/routing';
import { APP_LOGIN_URL, APP_REGISTER_URL, SOCIAL_LINKS } from '@/lib/constants';
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

// lucide-react dropped its brand icons in v1, so these redraw them inline with the same
// 24×24 stroke geometry to stay consistent with the other Lucide icons on the site.
const socialNetworks = [
  {
    label: 'Instagram',
    href: SOCIAL_LINKS.instagram,
    icon: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </>
    ),
  },
  {
    label: 'Facebook',
    href: SOCIAL_LINKS.facebook,
    icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  },
  {
    label: 'LinkedIn',
    href: SOCIAL_LINKS.linkedin,
    icon: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
];

function SocialLinks() {
  return (
    <div className="footer-social">
      {socialNetworks.map(({ label, href, icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {icon}
          </svg>
        </a>
      ))}
    </div>
  );
}

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
  const { locale, setLocale, t, dir } = useI18n();
  const isRtl = dir === 'rtl';
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
        <Link href={localizePath(locale, '/')} className="brand" aria-label="Matchy Plus home">
          <Logo />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href={localizePath(locale, '/services')}>{t('landing.services')}</Link>
          <Link href={localizePath(locale, '/a-propos')}>{t('landing.about')}</Link>
          <Link href={localizePath(locale, '/utilisation')}>{t('landing.how')}</Link>
          <Link href={localizePath(locale, '/contact')}>{t('landing.contact')}</Link>
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
              <div className="absolute top-[calc(100%+0.5rem)] z-50 w-32 overflow-hidden rounded-xl border border-neutral-100 bg-white py-1 shadow-xl ltr:right-0 rtl:left-0">
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
          <Link className="nav-cta" href={APP_REGISTER_URL}>
            {t('landing.cta')} <ArrowUpRight size={15} className="rtl:-scale-x-1" />
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
        <div className="mobile-menu rtl:text-right">
          <Link href={localizePath(locale, '/services')} onClick={() => setOpen(false)}>
            {t('landing.services')}
          </Link>
          <Link href={localizePath(locale, '/a-propos')} onClick={() => setOpen(false)}>
            {t('landing.about')}
          </Link>
          <Link href={localizePath(locale, '/utilisation')} onClick={() => setOpen(false)}>
            {t('landing.how')}
          </Link>
          <Link href={localizePath(locale, '/faq')} onClick={() => setOpen(false)}>
            {t('landing.faq')}
          </Link>
          <Link href={localizePath(locale, '/contact')} onClick={() => setOpen(false)}>
            {t('landing.contact')}
          </Link>
          <Link href={localizePath(locale, '/devenir-partenaire')} onClick={() => setOpen(false)}>
            {t('landing.partner')}
          </Link>
          <div className="mt-2 border-t border-white/20 pt-4">
            <Link
              href={APP_REGISTER_URL}
              onClick={() => setOpen(false)}
              className="nav-cta !text-brand-blue flex w-full items-center justify-center gap-1.5 !rounded-full !bg-white py-3 text-center text-sm font-bold shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98]"
              style={{ color: 'var(--brand-blue)' }}
            >
              <span>{t('landing.cta')}</span>
              <ArrowUpRight size={16} className="rtl:-scale-x-1" />
            </Link>
          </div>
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

declare global {
  interface Window {
    /** CookieYes (loaded by analytics.tsx): reopens its preferences, for "Gérer les cookies". */
    revisitCkyConsent?: () => void;
  }
}

/** One footer link: a page of this site, or an app page (sign-up, log-in). */
type FooterLink = { label: string; href: string; app?: boolean };

/** The 3 footer columns, as the manager listed them. */
function footerColumns(t: (key: string) => string, locale: Locale) {
  const page = (path: string) => localizePath(locale, path);
  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t('landing.footerProsTitle'),
      links: [
        { label: t('landing.footerCreateProfile'), href: APP_REGISTER_URL, app: true },
        { label: t('landing.footerVisibility'), href: page('/utilisation') },
        { label: t('landing.footerHowItWorks'), href: page('/utilisation') },
        { label: t('landing.footerHelp'), href: page('/faq') },
        { label: t('landing.footerLogin'), href: APP_LOGIN_URL, app: true },
        // the professional's way in: the partner form
        { label: t('landing.partnersCta'), href: page('/devenir-partenaire') },
      ],
    },
    {
      title: t('landing.footerMatchyTitle'),
      links: [
        { label: t('landing.footerAbout'), href: page('/a-propos') },
        { label: t('landing.footerNews'), href: page('/actualites') },
        { label: t('landing.footerDownload'), href: `${page('/utilisation')}#download` },
        { label: t('landing.footerContact'), href: page('/contact') },
        // the companies' way in: our partners and what a partnership brings
        { label: t('landing.partnersCta'), href: page('/partenaires') },
      ],
    },
    {
      title: t('landing.footerLegalTitle'),
      links: [
        { label: t('landing.footerPrivacy'), href: page('/privacy-policy') },
        { label: t('landing.footerTerms'), href: page('/terms-of-service') },
      ],
    },
  ];
  return columns;
}

export function Footer() {
  const { locale, t } = useI18n();
  const columns = footerColumns(t, locale);
  return (
    <footer className="site-footer">
      <div className="footer-grid container">
        <div>
          <Link href={localizePath(locale, '/')} className="brand footer-brand">
            <Logo footer />
          </Link>
          <p>{t('landing.panAfrican')}</p>
          <SocialLinks />
        </div>
        {columns.map((column, index) => (
          <nav key={column.title} aria-label={column.title}>
            <h3>{column.title}</h3>
            {column.links.map((link) =>
              link.app ? (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ),
            )}
            {/* last column: reopens the CookieYes preferences (only loaded on the public site) */}
            {index === columns.length - 1 && (
              <button
                type="button"
                className="footer-link-button cky-banner-element"
                onClick={() => window.revisitCkyConsent?.()}
              >
                {t('landing.footerCookies')}
              </button>
            )}
          </nav>
        ))}
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
