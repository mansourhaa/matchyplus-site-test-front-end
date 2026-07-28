'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <StubScreen title={t('settings.terms')} showAction={false}>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#555]">
        <p>
          By using Matchy+ you agree to use the platform respectfully, provide accurate profile
          information, and comply with applicable laws.
        </p>
        <p>Full terms of service copy will replace this placeholder.</p>
      </div>
    </StubScreen>
  );
}
