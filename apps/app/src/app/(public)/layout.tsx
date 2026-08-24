'use client';

import { MatchyLogo } from '@/features/auth/components/matchy-logo';
import { useI18n } from '@/features/i18n/i18n-provider';
import { LangPickerLight } from '@/features/onboarding/components/lang-picker-light';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PublicLegalLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, dir } = useI18n();
  const pathname = usePathname();
  const isRtl = locale === 'ar';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div
      className="flex min-h-screen flex-col bg-[#F5F7FA] text-[#1E293B]"
      style={{
        fontFamily: isRtl ? 'var(--font-cairo), sans-serif' : 'var(--font-baloo), sans-serif',
      }}
      dir={dir}
    >
      {/* Sleek Minimal Public Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-8">
          {/* Left: Back Button + Official Logo */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1E293B] shadow-2xs transition-all hover:bg-slate-50 active:scale-95"
            >
              <BackIcon size={15} className="text-[#2F76BB]" />
              <span>{t('common.back')}</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center transition-opacity hover:opacity-90"
              aria-label="Matchy+"
            >
              <MatchyLogo size="md" />
            </Link>
          </div>

          {/* Right: LangPicker */}
          <div className="flex items-center gap-3">
            <LangPickerLight />
          </div>
        </div>
      </header>

      {/* Main Legal Content */}
      <main className="flex-1">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <Link
              href="/terms-of-service"
              className={`transition-colors hover:text-[#2F76BB] ${
                pathname === '/terms-of-service' ? 'font-bold text-[#2F76BB]' : ''
              }`}
            >
              {t('legal.termsOfService')}
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/privacy-policy"
              className={`transition-colors hover:text-[#2F76BB] ${
                pathname === '/privacy-policy' ? 'font-bold text-[#2F76BB]' : ''
              }`}
            >
              {t('legal.privacyPolicy')}
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/login" className="transition-colors hover:text-[#2F76BB]">
              {t('auth.login')}
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Matchy+. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
