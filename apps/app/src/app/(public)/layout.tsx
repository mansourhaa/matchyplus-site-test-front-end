'use client';

import { HeaderBackButton } from '@/components/matchy/header-back-button';
import { useI18n } from '@/features/i18n/i18n-provider';
import { LangPickerLight } from '@/features/onboarding/components/lang-picker-light';
import { usePathname, useRouter } from 'next/navigation';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t, dir } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle = pathname.includes('privacy-policy')
    ? t('legal.privacyPolicy')
    : pathname.includes('terms-of-service')
      ? t('legal.termsOfService')
      : t('legal.brandLegal');

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
          <div className="relative z-10 flex items-center">
            <HeaderBackButton onClick={handleBack} label={t('legal.back')} />
          </div>

          {/* Centered Page Title */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <h2 className="text-xs font-bold tracking-tight text-[#0F172A] sm:text-sm">
              {pageTitle}
            </h2>
          </div>

          {/* Language Selector matching login and onboarding */}
          <div className="relative z-10 flex items-center">
            <LangPickerLight />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-12">{children}</main>
    </div>
  );
}
