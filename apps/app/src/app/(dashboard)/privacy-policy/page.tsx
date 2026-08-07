'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function PrivacyPolicyPage() {
  const { t } = useI18n();
  return (
    <StubScreen title={t('settings.privacyPolicy')} showAction={false}>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#555]">
        <p>
          Matchy+ processes account and matching data to help professionals discover and connect
          with each other. We do not sell personal data.
        </p>
        <p>
          Full legal copy will replace this placeholder. Contact support for data access or deletion
          requests.
        </p>
      </div>
    </StubScreen>
  );
}
