'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { Clock, Compass, History } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F0FA]">
            <History size={20} color={matchyBrand.blue} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
              {t('settings.history')}
            </h1>
            <p className="text-xs text-[#777]">
              {locale === 'en'
                ? 'Your recent swipes, profile visits, and interactions'
                : locale === 'ar'
                  ? 'سجل حركات التمرير والزيارات والتفاعلات الأخيرة'
                  : 'Vos swipes récents, visites de profil et interactions'}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF5FF] shadow-inner">
            <Clock size={36} color={matchyBrand.blue} />
          </div>
          <h2 className="text-base font-extrabold" style={{ color: matchyBrand.textDark }}>
            {locale === 'en'
              ? 'No activity history yet'
              : locale === 'ar'
                ? 'لا يوجد سجل نشاط حتى الآن'
                : 'Aucun historique d’activité'}
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#777]">
            {locale === 'en'
              ? 'As you swipe profiles and interact with recommendations, your historical log will appear here.'
              : locale === 'ar'
                ? 'بمجرد التفاعل والتمرير على الملفات الشخصية، سيسجل نشاطك تلقائياً هنا.'
                : 'Au fur et à mesure que vous balayez des profils et interagissez, votre historique s’affichera ici.'}
          </p>

          <Link
            href="/home"
            className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
            style={{ background: matchyBrand.gradient }}
          >
            <Compass size={15} />
            {locale === 'en'
              ? 'Explore Discovery Feed'
              : locale === 'ar'
                ? 'استكشاف الملفات الآن'
                : 'Découvrir des profils'}
          </Link>
        </div>
      </div>
    </div>
  );
}
