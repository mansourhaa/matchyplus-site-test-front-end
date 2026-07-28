'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function NotificationsPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.notifications')}
      description="Match alerts and push preferences will appear here. Realtime match events already update your matches list."
      showAction={false}
    />
  );
}
