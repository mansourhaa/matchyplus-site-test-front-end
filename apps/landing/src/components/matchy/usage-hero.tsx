'use client';

import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';

/** Blue band at the top of /utilisation/, like the other sub-pages (keeps the menu readable). */
export function UsageHero() {
  const { t } = useI18n();
  return (
    <SubpageHero
      eyebrow={t('landing.how')}
      title={t('landing.usageTitle')}
      subtitle={t('landing.usageBody')}
    />
  );
}
