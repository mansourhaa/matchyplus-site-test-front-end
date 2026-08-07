'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.history')}
      description="Your swipe history will list here once the history API is available."
      showAction={false}
    >
      <p className="mt-6 rounded-2xl bg-[#F5F7FA] px-4 py-8 text-center text-sm text-[#888]">
        No history yet
      </p>
    </StubScreen>
  );
}
