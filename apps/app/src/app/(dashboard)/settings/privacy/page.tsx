'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.privacy')}
      description="Control who can see your profile, location, and activity. Preferences will sync when the privacy API is ready."
    />
  );
}
