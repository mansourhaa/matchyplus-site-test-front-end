'use client';

import { StubScreen } from '@/components/matchy/stub-screen';
import { useI18n } from '@/features/i18n/i18n-provider';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  const { t } = useI18n();
  return (
    <StubScreen
      title={t('settings.favorites')}
      description="Saved profiles will appear here when favorites are supported."
      showAction={false}
    >
      <div className="mt-8 flex flex-col items-center gap-3 text-[#888]">
        <Star size={36} color="#2F76BB" />
        <p className="text-sm">No favorites yet</p>
      </div>
    </StubScreen>
  );
}
