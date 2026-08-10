'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { MapPin, RefreshCw } from 'lucide-react';

type LocationRequiredOverlayProps = {
  message?: string | null;
  onActivate: () => void;
  busy: boolean;
};

export function LocationRequiredOverlay({
  message,
  onActivate,
  busy,
}: LocationRequiredOverlayProps) {
  const { locale } = useI18n();

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)' }}
    >
      <div className="w-full max-w-md rounded-3xl border border-[#E5EEF8] bg-white p-6 text-center shadow-xl">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: '#EEF5FF' }}
        >
          <MapPin size={24} color="#2F76BB" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#353535' }}>
          {locale === 'en'
            ? 'Location required'
            : locale === 'ar'
              ? 'الموقع الجغرافي مطلوب'
              : 'Localisation requise'}
        </h3>
        <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}>
          {locale === 'en'
            ? 'Enable location to view profiles in Home and Search. Without permission, no profiles will be visible.'
            : locale === 'ar'
              ? 'قم بتمكين الموقع الجغرافي لعرض الملفات الشخصية في الرئيسية والبحث. بدون إذن، لن تكون الملفات الشخصية مرئية.'
              : 'Activez la localisation pour afficher les profils dans Home et Recherche. Sans autorisation, aucun profil ne sera visible.'}
        </p>
        {message && (
          <p className="mt-3" style={{ fontSize: 12, lineHeight: 1.5, color: '#B45309' }}>
            {locale === 'en'
              ? 'Location permission is disabled or denied. Please enable location to continue.'
              : locale === 'ar'
                ? 'إذن الموقع معطل أو مرفوض. يرجى تمكين الموقع للمتابعة.'
                : 'L’autorisation de localisation est désactivée ou refusée. Veuillez activer la localisation pour continuer.'}
          </p>
        )}
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white transition-all active:scale-95"
          style={{
            background: matchyBrand.gradient,
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? <RefreshCw size={18} className="animate-spin" /> : <MapPin size={18} />}
          {busy
            ? locale === 'en'
              ? 'Activating...'
              : locale === 'ar'
                ? 'جارٍ التفعيل...'
                : 'Activation...'
            : locale === 'en'
              ? 'Enable location'
              : locale === 'ar'
                ? 'تفعيل الموقع'
                : 'Activer la localisation'}
        </button>
        <p className="mt-3" style={{ fontSize: 11, color: '#888' }}>
          {locale === 'en'
            ? 'Allow location access when prompted by your browser.'
            : locale === 'ar'
              ? 'اسمح بالوصول إلى الموقع عندما يطلب المتصفح ذلك.'
              : 'Autorisez la localisation lorsque le navigateur vous le demande.'}
        </p>
      </div>
    </div>
  );
}
