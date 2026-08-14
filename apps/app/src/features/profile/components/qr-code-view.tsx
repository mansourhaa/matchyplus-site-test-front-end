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
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

// Plain outlined "M+" mark for the QR code's center
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="white" stroke="#E0E0E0" stroke-width="1.5"/><text x="16" y="21" font-family="Georgia, serif" font-size="12" font-weight="700" fill="${matchyBrand.textDark}" text-anchor="middle">M +</text></svg>`;
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

  return (
    <div className="mx-auto w-full max-w-md" dir={isRtl ? 'rtl' : 'ltr'}>
      <p className="mb-5 text-center text-sm text-[#888]">
        {locale === 'en'
          ? 'Share your profile easily with your personal QR code'
          : locale === 'ar'
            ? 'شارك ملفك الشخصي بسهولة عبر رمز QR الخاص بك'
            : 'Partagez votre profil facilement avec votre code QR personnel'}
      </p>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-baseline gap-0.5">
            <span style={{ fontSize: 22, fontWeight: 800, color: matchyBrand.blue }}>Matchy</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: matchyBrand.teal }}>+</span>
          </span>
        </div>

        <div
          ref={codeRef}
          aria-label={
            locale === 'en'
              ? 'QR code for your profile'
              : locale === 'ar'
                ? 'رمز الاستجابة السريعة لملفك الشخصي'
                : 'Code QR de votre profil'
          }
          className="mx-auto flex w-fit flex-col items-center rounded-2xl border border-[#E8F0FA] p-5"
        >
          <QRCodeSVG
            value={profileUrl}
            title={profileUrl}
            size={200}
            level="H"
            fgColor={matchyBrand.textDark}
            bgColor="#FFFFFF"
            imageSettings={{
              src: LOGO_DATA_URI,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
          <p className="mt-3 text-sm font-bold text-[#353535]">
            {profile.name ||
              (locale === 'en' ? 'Your name' : locale === 'ar' ? 'اسمك' : 'Votre nom')}
          </p>
          {profile.job && <p className="text-xs text-[#888]">{profile.job}</p>}
          <div className="my-3 w-full border-t border-dashed border-[#E0E0E0]" />
          <p className="text-center text-[11px] text-[#AAA]">
            {locale === 'en'
              ? 'Scan this code to view my Matchy+ profile'
              : locale === 'ar'
                ? 'امسح هذا الرمز للوصول إلى ملفي الشخصي في Matchy+'
                : 'Scannez ce code pour accéder à mon profil Matchy+'}
          </p>
        </div>
      </section>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-xs text-[#555]">{displayUrl}</span>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex shrink-0 items-center gap-1 rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-semibold text-[#2F76BB]"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied
            ? locale === 'en'
              ? 'Copied'
              : locale === 'ar'
                ? 'تم النسخ'
                : 'Copié'
            : locale === 'en'
              ? 'Copy'
              : locale === 'ar'
                ? 'نسخ'
                : 'Copier'}
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={downloadCode}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E0E0E0] bg-white py-3 text-sm font-bold text-[#555]"
        >
          <Download size={16} />{' '}
          {locale === 'en' ? 'Download' : locale === 'ar' ? 'تحميل' : 'Télécharger'}
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-md"
          style={{ background: matchyBrand.gradient }}
        >
          <Share2 size={16} /> {locale === 'en' ? 'Share' : locale === 'ar' ? 'مشاركة' : 'Partager'}
        </button>
      </div>
    </div>
  );
}
