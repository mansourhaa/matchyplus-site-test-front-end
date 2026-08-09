'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { Compass, Star } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF8EB]">
            <Star size={20} color="#F5A623" fill="#F5A623" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
              {t('settings.favorites')}
            </h1>
            <p className="text-xs text-[#777]">
              {locale === 'en'
                ? 'Your bookmarked profiles and saved connections'
                : locale === 'ar'
                  ? 'الملفات الشخصية المحفوظة والمفضلة لديك'
                  : 'Vos profils enregistrés et coups de cœur'}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF8EB] shadow-inner">
            <Star size={38} color="#F5A623" fill="#F5A623" />
          </div>
          <h2 className="text-base font-extrabold" style={{ color: matchyBrand.textDark }}>
            {locale === 'en'
              ? 'No favorite profiles yet'
              : locale === 'ar'
                ? 'لا تملك مفضلة بعد'
                : 'Aucun favori pour l’instant'}
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#777]">
            {locale === 'en'
              ? 'Bookmark profiles you love to keep quick access to their details and send direct messages anytime.'
              : locale === 'ar'
                ? 'قم بحفظ الملفات التي تعجبك للوصول السريع إليها وإرسال رسائل مباشرة في أي وقت.'
                : 'Ajoutez des profils en favoris pour y accéder rapidement et échanger avec eux à tout moment.'}
          </p>

          <Link
            href="/home"
            className="mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
            style={{ background: matchyBrand.gradient }}
          >
            <Compass size={15} />
            {locale === 'en'
              ? 'Discover Profiles'
              : locale === 'ar'
                ? 'اكتشاف الملفات الشخصية'
                : 'Découvrir des profils'}
          </Link>
        </div>
      </div>
    </div>
  );
}
