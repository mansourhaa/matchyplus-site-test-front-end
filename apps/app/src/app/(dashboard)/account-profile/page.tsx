'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { StubScreen } from '@/components/matchy/stub-screen';
import { useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import Link from 'next/link';

export default function AccountProfilePage() {
  const { t } = useI18n();
  const auth = useAppSelector(selectAuth);

  return (
    <StubScreen
      title={t('settings.account')}
      description="Review your account details. Editing will be available when profile APIs ship."
      showAction={false}
    >
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl px-4 py-3" style={{ background: matchyBrand.bg }}>
          <p className="text-[11px] font-bold text-[#888] uppercase">Name</p>
          <p className="text-sm font-semibold" style={{ color: matchyBrand.textDark }}>
            {auth.user?.name || '—'}
          </p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: matchyBrand.bg }}>
          <p className="text-[11px] font-bold text-[#888] uppercase">Email</p>
          <p className="text-sm font-semibold" style={{ color: matchyBrand.textDark }}>
            {auth.user?.email || '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/password"
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
          >
            Password
          </Link>
          <Link
            href="/email"
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
          >
            Email
          </Link>
          <Link
            href="/add-phone-number"
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
          >
            Phone
          </Link>
        </div>
      </div>
    </StubScreen>
  );
}
