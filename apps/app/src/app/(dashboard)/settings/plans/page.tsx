'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Check, Crown, Shield } from 'lucide-react';

export default function PlansPage() {
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  const title =
    locale === 'fr' ? 'Choisir un forfait' : locale === 'ar' ? 'اختر خطة' : 'Choose a plan';

  const subtitle =
    locale === 'fr'
      ? 'Investissez dans votre réseau professionnel'
      : locale === 'ar'
        ? 'استثمر في شبكتك المهنية'
        : 'Invest in your professional network';

  const currentBadge =
    locale === 'fr'
      ? 'Actuel : Gratuit'
      : locale === 'ar'
        ? 'الخطة الحالية: مجانية'
        : 'Current: Free';

  const planTitle = locale === 'fr' ? 'Gratuit' : locale === 'ar' ? 'مجاني' : 'Free';

  const activeStatus = locale === 'fr' ? 'Actif' : locale === 'ar' ? 'نشط' : 'Active';

  const planSubtitle =
    locale === 'fr'
      ? 'Accès limité aux fonctionnalités de base'
      : locale === 'ar'
        ? 'وصول محدود للميزات الأساسية'
        : 'Limited access to basic features';

  const priceText = locale === 'fr' ? '0 DT' : locale === 'ar' ? '0 د.ت' : '0 DT';

  const feature1 =
    locale === 'fr'
      ? '3 profils visibles par catégorie'
      : locale === 'ar'
        ? '3 ملفات شخصية مرئية لكل فئة'
        : '3 visible profiles per category';

  const feature2 =
    locale === 'fr'
      ? 'Swipe limité (10/jour)'
      : locale === 'ar'
        ? 'تمرير محدود (10/يوم)'
        : 'Limited swipe (10/day)';

  const feature3 =
    locale === 'fr' ? 'Chat basique' : locale === 'ar' ? 'دردشة أساسية' : 'Basic chat';

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto"
      style={{ background: '#F8FAFC' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Hero Header Gradient Banner (Full Width) */}
      <div
        className="relative flex w-full flex-col items-center justify-center px-4 pt-10 pb-24 text-center"
        style={{
          background: 'linear-gradient(90deg, #1E6CB3 0%, #3179BF 40%, #48BBA0 100%)',
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-xs backdrop-blur-xs">
          <Crown size={28} className="text-white" />
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-white md:text-2xl">{title}</h2>
        <p className="mt-1 text-xs font-medium text-white/85 md:text-sm">{subtitle}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
          <span className="h-2 w-2 rounded-full bg-[#10B981]" />
          <span>{currentBadge}</span>
        </div>
      </div>

      {/* Overlapping White Plan Card (Full Width) */}
      <div className="relative -mt-16 w-full px-4 pb-12 md:px-8">
        <div className="mx-auto w-full rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
          {/* Card Top / Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <Shield size={24} className="text-[#64748B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-[#1E293B]">{planTitle}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8F5] px-2.5 py-0.5 text-xs font-bold text-[#10B981]">
                    <Check size={12} strokeWidth={3} />
                    {activeStatus}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#94A3B8]">{planSubtitle}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-extrabold text-[#1E293B] md:text-lg">
                {priceText}
              </span>
            </div>
          </div>

          {/* Features Divider */}
          <div className="my-5 border-t border-[#F1F5F9]" />

          {/* Features List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Check size={15} className="shrink-0 text-[#10B981]" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-[#475569] md:text-sm">{feature1}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={15} className="shrink-0 text-[#10B981]" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-[#475569] md:text-sm">{feature2}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={15} className="shrink-0 text-[#10B981]" strokeWidth={2.5} />
              <span className="text-xs font-semibold text-[#475569] md:text-sm">{feature3}</span>
            </div>
          </div>

          {/* Active Button */}
          <div className="mt-6">
            <button
              type="button"
              disabled
              className="w-full cursor-default rounded-2xl bg-[#F1F5F9] py-3.5 text-center text-sm font-bold text-[#94A3B8]"
            >
              {activeStatus}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
