'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function PlansPage() {
  const { t } = useI18n();

  return (
    <StubScreen
      title={t('settings.subscription')}
      description={t('search.subscriptionSoonDesc')}
      showAction
      actionLabel={t('settings.comingSoon')}
    />
  );
}
