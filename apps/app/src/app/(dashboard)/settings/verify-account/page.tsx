'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { IdentityVerificationSection } from '@/features/auth/components/account-settings';
import { useI18n } from '@/features/i18n/i18n-provider';
import Link from 'next/link';

export default function VerifyAccountPage() {
  const { locale } = useI18n();

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 md:px-8">
        <Link
          href="/settings/account"
          className="text-sm font-bold"
          style={{ color: matchyBrand.muted }}
        >
          ← {locale === 'ar' ? 'رجوع' : locale === 'en' ? 'Back' : 'Retour'}
        </Link>
        <IdentityVerificationSection />
      </div>
    </div>
  );
}
