'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  fetchOnboardingProfile,
  selectOnboarding,
} from '@/features/onboarding/store/onboarding-slice';
import { toast } from '@/lib/toast';
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

// Plain outlined "M+" mark for the QR code center
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="white" stroke="none"/><text x="16" y="21" font-family="Georgia, serif" font-size="13" font-weight="700" fill="#1A4367" text-anchor="middle">M+</text></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}`;

export function QrCodeView() {
  const dispatch = useAppDispatch();
  const { locale } = useI18n();
  const isRtl = locale === 'ar';
  const { user } = useAppSelector(selectAuth);
  const { profile: loadedProfile, loading, error } = useAppSelector(selectOnboarding);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  const ownProfile = loadedProfile && user && loadedProfile.id === user.id ? loadedProfile : null;

  if (!ownProfile && loading) {
    return (
      <div className="py-16 text-center text-sm text-[#888]">
        {locale === 'en'
          ? 'Loading QR code...'
          : locale === 'ar'
            ? 'جارٍ تحميل رمز QR...'
            : 'Chargement du code QR…'}
      </div>
    );
  }

  if (!ownProfile && error) {
    return (
      <div className="mx-4 my-10 rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-[#E24E59]">
          {locale === 'en'
            ? 'Unable to load profile.'
            : locale === 'ar'
              ? 'تعذر تحميل الملف الشخصي.'
              : 'Impossible de charger votre profil.'}
        </p>
        <button
          type="button"
          onClick={() => dispatch(fetchOnboardingProfile())}
          className="mt-4 rounded-xl bg-[#2F76BB] px-5 py-2.5 text-sm font-bold text-white"
        >
          {locale === 'en' ? 'Retry' : locale === 'ar' ? 'إعادة المحاولة' : 'Réessayer'}
        </button>
      </div>
    );
  }

  if (!ownProfile) return null;
  const profile = ownProfile;

  const profileUrl = `${window.location.origin}/profile/${profile.id}`;
  const displayUrl = profileUrl.replace(/^https?:\/\//, '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success(
        locale === 'en' ? 'Link copied!' : locale === 'ar' ? 'تم نسخ الرابط!' : 'Lien copié !',
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        locale === 'en'
          ? 'Unable to copy link.'
          : locale === 'ar'
            ? 'تعذر نسخ الرابط.'
            : 'Impossible de copier le lien.',
      );
    }
  };

  const shareLink = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title:
            locale === 'en'
              ? 'My Matchy+ profile'
              : locale === 'ar'
                ? 'ملفي في Matchy+'
                : 'Mon profil Matchy+',
          url: profileUrl,
        });
      } catch {
        // dismissed
      }
      return;
    }
    await copyLink();
  };

  const downloadCode = () => {
    const svg = codeRef.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const firstName = (profile.name || 'matchy').trim().split(/\s+/)[0]?.toLowerCase() || 'matchy';
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchy-qr-${firstName}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const roleText =
    profile.job ||
    profile.service_type ||
    (locale === 'en' ? 'Freelance' : locale === 'ar' ? 'مستقل' : 'Freelance');

  return (
    <div className="flex w-full flex-col items-center" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header subtitle */}
      <p className="mb-6 text-center text-sm font-medium text-[#64748B]">
        {locale === 'en'
          ? 'Share your profile easily with your personal QR code'
          : locale === 'ar'
            ? 'شارك ملفك الشخصي بسهولة عبر رمز QR الخاص بك'
            : 'Share your profile easily with your personal QR code'}
      </p>

      {/* 2. Main White Card */}
      <section className="w-full rounded-[2.5rem] border border-[#EEF2F6] bg-white p-7 text-center shadow-xl shadow-blue-500/5">
        {/* SVG Logo */}
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-matchy.svg" alt="Matchy+" className="h-7 w-auto" />
        </div>

        {/* QR Code Container */}
        <div
          ref={codeRef}
          aria-label={
            locale === 'en'
              ? 'QR code for your profile'
              : locale === 'ar'
                ? 'رمز الاستجابة السريعة لملفك الشخصي'
                : 'Code QR de votre profil'
          }
          className="mx-auto mb-6 flex w-full max-w-[260px] justify-center rounded-3xl border border-[#E2E8F0] bg-[#FFFFFF] p-4"
        >
          <QRCodeSVG
            value={profileUrl}
            title={profileUrl}
            size={220}
            level="H"
            fgColor="#1A4367"
            bgColor="#FFFFFF"
            imageSettings={{
              src: LOGO_DATA_URI,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Profile Name & Job */}
        <h2 className="text-base font-extrabold text-[#1E293B]">
          {profile.name ||
            (locale === 'en' ? 'Utilisateur' : locale === 'ar' ? 'مستخدم' : 'Utilisateur')}
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-[#94A3B8]">{roleText}</p>

        {/* Dashed Separator */}
        <div className="my-5 w-full border-t border-dashed border-[#E2E8F0]" />

        {/* Footer prompt */}
        <p className="text-xs font-medium text-[#94A3B8]">
          {locale === 'en'
            ? 'Scan this code to access my Matchy+ profile'
            : locale === 'ar'
              ? 'امسح هذا الرمز للوصول إلى ملفي الشخصي في Matchy+'
              : 'Scan this code to access my Matchy+ profile'}
        </p>
      </section>

      {/* 3. Link Bar */}
      <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-[#EEF2F6] bg-white p-2.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-2 pl-2">
          <ExternalLink size={16} className="shrink-0 text-[#2F76BB]" />
          <span className="truncate text-xs font-medium text-[#475569]">{displayUrl}</span>
        </div>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#EBF5FB] px-3.5 py-2 text-xs font-bold text-[#2F76BB] transition-opacity hover:opacity-90 active:scale-95"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>
            {copied
              ? locale === 'en'
                ? 'Copied'
                : locale === 'ar'
                  ? 'تم النسخ'
                  : 'Copié'
              : locale === 'en'
                ? 'Copy link'
                : locale === 'ar'
                  ? 'نسخ الرابط'
                  : 'Copier le lien'}
          </span>
        </button>
      </div>

      {/* 4. Action Buttons (Download & Share) */}
      <div className="mt-4 flex w-full gap-3">
        <button
          type="button"
          onClick={downloadCode}
          className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#EEF2F6] bg-white py-4 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
        >
          <Download size={20} className="text-[#2F76BB]" />
          <span className="text-xs font-extrabold text-[#1E293B]">
            {locale === 'en' ? 'Download' : locale === 'ar' ? 'تحميل' : 'Télécharger'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl py-4 text-white shadow-lg shadow-teal-500/20 transition-all hover:opacity-95 active:scale-95"
          style={{ background: matchyBrand.gradient }}
        >
          <Share2 size={20} className="text-white" />
          <span className="text-xs font-extrabold text-white">
            {locale === 'en' ? 'Share' : locale === 'ar' ? 'مشاركة' : 'Partager'}
          </span>
        </button>
      </div>

      {/* 5. Stat Counter Cards */}
      {/* <div className="mt-4 grid w-full grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#EEF2F6] bg-white p-3.5 text-center shadow-xs">
          <p className="text-lg font-extrabold text-[#2F76BB]">0</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#94A3B8]">
            {locale === 'en' ? 'Scans' : locale === 'ar' ? 'الماسحات' : 'Scans'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#EEF2F6] bg-white p-3.5 text-center shadow-xs">
          <p className="text-lg font-extrabold text-[#61BCA6]">0</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#94A3B8]">
            {locale === 'en' ? 'Visits' : locale === 'ar' ? 'الزيارات' : 'Visites'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#EEF2F6] bg-white p-3.5 text-center shadow-xs">
          <p className="text-lg font-extrabold text-[#F5A623]">0</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#94A3B8]">
            {locale === 'en' ? 'Contacts' : locale === 'ar' ? 'جهات الاتصال' : 'Contacts'}
          </p>
        </div>
      </div> */}
    </div>
  );
}
