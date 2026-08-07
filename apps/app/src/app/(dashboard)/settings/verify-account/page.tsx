'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function VerifyAccountPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.verifyAccount')}
      description="Complete identity verification to unlock the verified badge on your profile."
    />
  );
}
