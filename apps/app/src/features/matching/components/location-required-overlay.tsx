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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 p-4"
      style={{ backdropFilter: 'blur(1px)' }}
    >
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md rounded-3xl border border-white/15 bg-white p-6 text-center shadow-2xl duration-200">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs"
          style={{ background: '#EEF5FF', border: '1px solid #DCEBFA' }}
        >
          <MapPin size={26} color="#2F76BB" strokeWidth={2.2} />
        </div>
        <h3 className="text-xl font-extrabold text-[#1A1A2E]">
          {locale === 'en'
            ? 'Location required'
            : locale === 'ar'
              ? 'الموقع الجغرافي مطلوب'
              : 'Localisation requise'}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#555]">
          {locale === 'en'
            ? 'Enable location to use Matchy+. Without location permission, access to the application and profiles is blocked.'
            : locale === 'ar'
              ? 'يرجى تفعيل إذن الموقع الجغرافي للمتابعة في Matchy+. بدون إذن الموقع، لا يمكن الوصول إلى التطبيق.'
              : 'Activez la géolocalisation pour utiliser Matchy+. Sans autorisation de localisation, l’accès à l’application et aux profils est bloqué.'}
        </p>
        {message && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-[#B45309]">
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
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white shadow-lg transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
          style={{
            background: matchyBrand.gradient,
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
          }}
        >
          {busy ? <RefreshCw size={18} className="animate-spin" /> : <MapPin size={18} />}
          {busy
            ? locale === 'en'
              ? 'Activating...'
              : locale === 'ar'
                ? 'جارٍ التفعيل...'
                : 'Activation…'
            : locale === 'en'
              ? 'Enable location'
              : locale === 'ar'
                ? 'تفعيل الموقع'
                : 'Activer la localisation'}
        </button>
        <p className="mt-3 text-xs text-[#888]">
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
