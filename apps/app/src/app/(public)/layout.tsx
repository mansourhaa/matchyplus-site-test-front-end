'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ArrowLeft, ChevronDown, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const LANGUAGES: { code: Locale; label: string; full: string }[] = [
  { code: 'fr', label: 'FR', full: 'Français' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'ar', label: 'عربي', full: 'العربية' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t, dir } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];
  const isRtl = locale === 'ar';

  const pageTitle = pathname.includes('privacy-policy')
    ? t('legal.privacyPolicy')
    : pathname.includes('terms-of-service')
      ? t('legal.termsOfService')
      : t('legal.brandLegal');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]" dir={dir}>
      {/* Top Header matching exact design */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-8">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBack}
            className="group z-10 inline-flex items-center gap-1.5 rounded-lg py-1.5 pr-2 text-xs font-semibold text-[#334155] transition-colors hover:text-[#0F172A] sm:text-sm"
          >
            <ArrowLeft
              size={16}
              className={`transition-transform group-hover:-translate-x-0.5 ${
                isRtl ? 'rotate-180 group-hover:translate-x-0.5' : ''
              }`}
            />
            <span>{t('legal.back')}</span>
          </button>

          {/* Centered Page Title */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <h2 className="text-xs font-bold tracking-tight text-[#0F172A] sm:text-sm">
              {pageTitle}
            </h2>
          </div>

          {/* Language Selector Dropdown on the right */}
          <div className="relative z-10" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#334155] shadow-2xs transition-colors hover:bg-[#F1F5F9] active:scale-95"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <Globe size={13} className="text-[#64748B]" />
              <span>{activeLang.label}</span>
              <ChevronDown
                size={12}
                className={`text-[#94A3B8] transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-1.5 w-36 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg rtl:right-auto rtl:left-0"
                style={{ minWidth: '8.5rem' }}
              >
                {LANGUAGES.map((lang) => {
                  const isSelected = locale === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLocale(lang.code);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#F0F7FF] font-bold text-[#2F76BB]'
                          : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                      }`}
                    >
                      <span>{lang.full}</span>
                      <span
                        className={`text-[10px] uppercase ${
                          isSelected ? 'font-bold text-[#2F76BB]' : 'text-[#94A3B8]'
                        }`}
                      >
                        {lang.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-12">{children}</main>
    </div>
  );
}
