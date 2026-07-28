'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function VideoSettingsPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.video')}
      description="Record or upload your intro video when media APIs are ready."
    />
  );
}
