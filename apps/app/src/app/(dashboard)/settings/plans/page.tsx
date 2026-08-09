'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { Crown, Star } from 'lucide-react';

export default function PlansPage() {
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
            <Crown size={20} color="#F5A623" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
              {t('settings.subscription')}
            </h1>
            <p className="text-xs text-[#777]">
              {locale === 'en'
                ? 'Manage your subscription and view active benefits'
                : locale === 'ar'
                  ? 'إدارة اشتراكك وعرض المزايا المفعلة'
                  : 'Gérez votre abonnement et découvrez vos avantages'}
            </p>
          </div>
        </div>

        {/* Current Plan Card */}
        <div
          className="rounded-3xl bg-white p-6 shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: matchyBrand.softBlue }}
              >
                <Star size={24} color={matchyBrand.blue} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#888]">
                  {locale === 'en'
                    ? 'Active Plan'
                    : locale === 'ar'
                      ? 'الخطة الحالية'
                      : 'Plan actuel'}
                </p>
                <h2 className="text-lg font-extrabold" style={{ color: matchyBrand.textDark }}>
                  {locale === 'en'
                    ? 'Free Member Plan'
                    : locale === 'ar'
                      ? 'الحساب المجاني'
                      : 'Formule Gratuite'}
                </h2>
              </div>
            </div>

            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: matchyBrand.softBlue,
                color: matchyBrand.blue,
              }}
            >
              {locale === 'en' ? 'Free' : locale === 'ar' ? 'مجاني' : 'Gratuit'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
