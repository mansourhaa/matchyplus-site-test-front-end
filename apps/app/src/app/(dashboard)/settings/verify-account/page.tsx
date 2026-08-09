'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { toast } from '@/lib/toast';
import { CheckCircle2, Mail, Phone, ShieldCheck, UserCheck, Zap } from 'lucide-react';
import { useState } from 'react';

export default function VerifyAccountPage() {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';
  const { user } = useAppSelector(selectAuth);
  const [badgeRequested, setBadgeRequested] = useState(false);

  const phoneVerified = Boolean(user?.phone_verified || user?.phone);
  const emailVerified = Boolean(user?.email_verified || user?.email);

  const handleRequestBadge = () => {
    setBadgeRequested(true);
    toast.success(
      locale === 'en'
        ? 'Verification badge request submitted!'
        : locale === 'ar'
          ? 'تم تقديم طلب شارة التحقق بنجاح!'
          : 'Demande de badge de vérification soumise avec succès !',
    );
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F7F3]">
            <ShieldCheck size={20} color={matchyBrand.teal} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
              {t('settings.verifyAccount')}
            </h1>
            <p className="text-xs text-[#777]">
              {locale === 'en'
                ? 'Increase trust, stand out, and get up to 3× more matches with a verified profile badge'
                : locale === 'ar'
                  ? 'زيادة الثقة والتميز والحصول على مطاباقات أكثر 3 مرات مع شارة التوثيق'
                  : 'Augmentez la confiance et obtenez jusqu’à 3× plus de matches avec un profil vérifié'}
            </p>
          </div>
        </div>

        {/* Verification Status Card */}
        <div
          className="rounded-3xl bg-white p-6 shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: matchyBrand.softTeal }}
            >
              <UserCheck size={24} color={matchyBrand.teal} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold" style={{ color: matchyBrand.textDark }}>
                  {user?.name || 'Membre Matchy+'}
                </span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#61BCA6]">
                  <CheckCircle2 size={12} color="white" />
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#61BCA6]">
                {badgeRequested
                  ? locale === 'en'
                    ? 'Badge Verification Pending'
                    : locale === 'ar'
                      ? 'طلب التوثيق قيد المراجعة'
                      : 'Vérification en cours'
                  : locale === 'en'
                    ? 'Verified Member Status'
                    : locale === 'ar'
                      ? 'حساب موثق الجزئيات'
                      : 'Statut membre vérifié'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Phone check */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F7F3]">
                  <Phone size={16} color={matchyBrand.teal} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: matchyBrand.textDark }}>
                    {locale === 'en'
                      ? 'Phone Number'
                      : locale === 'ar'
                        ? 'رقم الهاتف'
                        : 'Numéro de téléphone'}
                  </p>
                  <p className="text-[11px] text-[#777]">
                    {user?.phone
                      ? user.phone
                      : locale === 'en'
                        ? 'Not connected'
                        : locale === 'ar'
                          ? 'غير مرتبط'
                          : 'Non renseigné'}
                  </p>
                </div>
              </div>
              {phoneVerified ? (
                <span className="rounded-full bg-[#E8F7F3] px-3 py-1 text-[11px] font-bold text-[#2A9177]">
                  ✓ {locale === 'en' ? 'Verified' : locale === 'ar' ? 'متحقق' : 'Vérifié'}
                </span>
              ) : (
                <span className="rounded-full bg-[#FFF0F0] px-3 py-1 text-[11px] font-bold text-[#FF6B6B]">
                  {locale === 'en' ? 'Unverified' : locale === 'ar' ? 'غير متحقق' : 'Non vérifié'}
                </span>
              )}
            </div>

            {/* Email check */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF5FF]">
                  <Mail size={16} color={matchyBrand.blue} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: matchyBrand.textDark }}>
                    {locale === 'en'
                      ? 'Email Address'
                      : locale === 'ar'
                        ? 'البريد الإلكتروني'
                        : 'Adresse e-mail'}
                  </p>
                  <p className="text-[11px] text-[#777]">
                    {user?.email
                      ? user.email
                      : locale === 'en'
                        ? 'Not connected'
                        : locale === 'ar'
                          ? 'غير مرتبط'
                          : 'Non renseigné'}
                  </p>
                </div>
              </div>
              {emailVerified ? (
                <span className="rounded-full bg-[#EEF5FF] px-3 py-1 text-[11px] font-bold text-[#2F76BB]">
                  ✓ {locale === 'en' ? 'Verified' : locale === 'ar' ? 'متحقق' : 'Vérifié'}
                </span>
              ) : (
                <span className="rounded-full bg-[#FFF0F0] px-3 py-1 text-[11px] font-bold text-[#FF6B6B]">
                  {locale === 'en' ? 'Unverified' : locale === 'ar' ? 'غير متحقق' : 'Non vérifié'}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[#F0F0F0] pt-4">
            <button
              type="button"
              onClick={handleRequestBadge}
              disabled={badgeRequested}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-60"
              style={{ background: matchyBrand.gradient }}
            >
              <Zap size={16} />
              {badgeRequested
                ? locale === 'en'
                  ? 'Verification Request Sent ✓'
                  : locale === 'ar'
                    ? 'تم تقديم الطلب ✓'
                    : 'Demande envoyée ✓'
                : locale === 'en'
                  ? 'Request Official Blue Badge'
                  : locale === 'ar'
                    ? 'طلب شارة التوثيق الزرقاء'
                    : 'Demander le badge bleu officiel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
