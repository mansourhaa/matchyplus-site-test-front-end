'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch } from '@/features/auth/hooks';
import { deleteAccount } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { BlockedUsersSection } from '@/features/profile/components/blocked-users-section';
import { toast } from '@/lib/toast';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type VisibilityOption = 'everyone' | 'connections' | 'nobody';

type PrivacySettingsState = {
  hideProfile: boolean;
  visibility: VisibilityOption;
  showDistance: boolean;
  onlineStatus: boolean;
};

const STORAGE_KEY = 'matchy_privacy_settings';

const DEFAULT_SETTINGS: PrivacySettingsState = {
  hideProfile: false,
  visibility: 'everyone',
  showDistance: true,
  onlineStatus: true,
};

export default function PrivacyPage() {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [settings, setSettings] = useState<PrivacySettingsState>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_SETTINGS;
  });

  const updateSetting = <K extends keyof PrivacySettingsState>(
    key: K,
    value: PrivacySettingsState[K],
  ) => {
    setSettings((prev) => {
      let updated = { ...prev, [key]: value };
      if (key === 'hideProfile') {
        if (value === true) {
          updated.visibility = 'nobody';
        } else if (prev.visibility === 'nobody') {
          updated.visibility = 'everyone';
        }
      } else if (key === 'visibility') {
        if (value === 'nobody') {
          updated.hideProfile = true;
        } else {
          updated.hideProfile = false;
        }
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });

    toast.success(
      locale === 'en'
        ? 'Settings updated'
        : locale === 'ar'
          ? 'تم حفظ الإعدادات'
          : 'Paramètres mis à jour',
    );
  };

  const handleDelete = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await dispatch(deleteAccount({ confirm: true })).unwrap();
      toast.success(
        locale === 'en'
          ? 'Account deleted successfully.'
          : locale === 'ar'
            ? 'تم حذف الحساب بنجاح.'
            : 'Compte supprimé avec succès.',
      );
      router.push('/login');
    } catch {
      toast.error(
        locale === 'en'
          ? 'Failed to delete account. Please try again.'
          : locale === 'ar'
            ? 'فشل حذف الحساب. يرجى المحاولة مرة أخرى.'
            : 'Échec de la suppression du compte. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: matchyBrand.bg }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="w-full space-y-4 px-4 py-6 md:px-8">
        {/* 1. Hide My Profile Card */}
        <div
          className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: '#EBF5FB' }}
            >
              <Eye size={20} color={matchyBrand.blue} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#1E293B]">{t('settings.hideProfile')}</p>
              <p className="mt-0.5 text-xs text-[#64748B]">{t('settings.hideProfileDesc')}</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.hideProfile}
            onClick={() => updateSetting('hideProfile', !settings.hideProfile)}
            className="relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none"
            style={{ background: settings.hideProfile ? '#2F76BB' : '#CBD5E1' }}
            dir="ltr"
          >
            <span
              className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
              style={{
                transform: settings.hideProfile ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {/* 2. Who Can See My Profile Card */}
        <div
          className="space-y-3 rounded-3xl bg-white p-5 shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <h2 className="text-sm font-extrabold text-[#1E293B]">{t('settings.whoCanSeeTitle')}</h2>

          <div className="space-y-2.5">
            {/* Everyone */}
            <div
              onClick={() => updateSetting('visibility', 'everyone')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  updateSetting('visibility', 'everyone');
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl p-3.5 transition-all ${
                settings.visibility === 'everyone'
                  ? 'border-2 border-[#2F76BB] bg-[#F4F9FF]'
                  : 'border border-[#EEF2F6] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: settings.visibility === 'everyone' ? '#EBF5FB' : '#F1F5F9',
                  }}
                >
                  <Eye
                    size={18}
                    color={settings.visibility === 'everyone' ? matchyBrand.blue : '#64748B'}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      settings.visibility === 'everyone' ? 'text-[#2F76BB]' : 'text-[#334155]'
                    }`}
                  >
                    {t('settings.visibilityEveryone')}
                  </p>
                  <p className="text-xs text-[#64748B]">{t('settings.visibilityEveryoneDesc')}</p>
                </div>
              </div>

              {settings.visibility === 'everyone' ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F76BB] text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#CBD5E1]" />
              )}
            </div>

            {/* Connections Only */}
            <div
              onClick={() => updateSetting('visibility', 'connections')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  updateSetting('visibility', 'connections');
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl p-3.5 transition-all ${
                settings.visibility === 'connections'
                  ? 'border-2 border-[#2F76BB] bg-[#F4F9FF]'
                  : 'border border-[#EEF2F6] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: settings.visibility === 'connections' ? '#EBF5FB' : '#F1F5F9',
                  }}
                >
                  <Users
                    size={18}
                    color={settings.visibility === 'connections' ? matchyBrand.blue : '#64748B'}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      settings.visibility === 'connections' ? 'text-[#2F76BB]' : 'text-[#334155]'
                    }`}
                  >
                    {t('settings.visibilityConnections')}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {t('settings.visibilityConnectionsDesc')}
                  </p>
                </div>
              </div>

              {settings.visibility === 'connections' ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F76BB] text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#CBD5E1]" />
              )}
            </div>

            {/* Nobody */}
            <div
              onClick={() => updateSetting('visibility', 'nobody')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  updateSetting('visibility', 'nobody');
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-3.5 rounded-2xl p-3.5 transition-all ${
                settings.visibility === 'nobody'
                  ? 'border-2 border-[#2F76BB] bg-[#F4F9FF]'
                  : 'border border-[#EEF2F6] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: settings.visibility === 'nobody' ? '#EBF5FB' : '#F1F5F9',
                  }}
                >
                  <EyeOff
                    size={18}
                    color={settings.visibility === 'nobody' ? matchyBrand.blue : '#64748B'}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      settings.visibility === 'nobody' ? 'text-[#2F76BB]' : 'text-[#334155]'
                    }`}
                  >
                    {t('settings.visibilityNobody')}
                  </p>
                  <p className="text-xs text-[#64748B]">{t('settings.visibilityNobodyDesc')}</p>
                </div>
              </div>

              {settings.visibility === 'nobody' ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F76BB] text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#CBD5E1]" />
              )}
            </div>
          </div>
        </div>

        {/* 3. Show Distance & Online Status Card */}
        <div
          className="divide-y divide-[#F2F4F7] overflow-hidden rounded-3xl bg-white shadow-xs"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          {/* Distance Toggle */}
          <div className="flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF]">
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: '#EBF5FB' }}
              >
                <MapPin size={18} color={matchyBrand.blue} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">{t('settings.showDistance')}</p>
                <p className="text-xs text-[#64748B]">{t('settings.showDistanceDesc')}</p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.showDistance}
              onClick={() => updateSetting('showDistance', !settings.showDistance)}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: settings.showDistance ? '#2F76BB' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: settings.showDistance ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* Online Status Toggle */}
          <div className="flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-[#FAFCFF]">
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: '#EDF8F5' }}
              >
                <Wifi size={18} color="#61BCA6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E293B]">{t('settings.onlineStatus')}</p>
                <p className="text-xs text-[#64748B]">{t('settings.onlineStatusDesc')}</p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.onlineStatus}
              onClick={() => updateSetting('onlineStatus', !settings.onlineStatus)}
              className="relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ background: settings.onlineStatus ? '#61BCA6' : '#CBD5E1' }}
              dir="ltr"
            >
              <span
                className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-xs transition-transform"
                style={{
                  transform: settings.onlineStatus ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>

        {/* 4. GPS Privacy Info */}
        <aside className="flex items-center gap-3 rounded-2xl border border-[#D0E4F7] bg-[#EEF5FF] p-4">
          <ShieldCheck size={20} color={matchyBrand.blue} className="shrink-0" />
          <p className="text-xs leading-relaxed text-[#2F76BB]">
            {locale === 'en'
              ? 'Your privacy is protected. Matchy+ never shares your exact physical GPS coordinates with other users.'
              : locale === 'ar'
                ? 'خصوصيتك محمية. التطبيق لا يشارك إحداثيات موقعك الجغرافي الدقيقة مع الآخرين مطلقا.'
                : 'Votre confidentialité est protégée. Matchy+ ne partage jamais vos coordonnées GPS exactes.'}
          </p>
        </aside>

        {/* 5. Blocked Users Section */}
        <BlockedUsersSection />

        {/* 6. Deletion Warning Box */}
        <div
          className="space-y-4 rounded-3xl bg-white p-6 shadow-sm"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex items-start gap-3 text-[#E74C3C]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDEAEA]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">
                {locale === 'en'
                  ? 'Delete Account'
                  : locale === 'ar'
                    ? 'حذف الحساب'
                    : 'Supprimer le compte'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#777]">
                {locale === 'en'
                  ? 'If you delete your account, your profile, matches, messages, and photos will be permanently deleted and cannot be recovered.'
                  : locale === 'ar'
                    ? 'إذا قمت بحذف حسابك، فسيتم حذف ملفك الشخصي والمطابقات والرسائل والصور بشكل نهائي ولا يمكن استعادتها.'
                    : 'Si vous supprimez votre compte, votre profil, vos correspondances, vos messages et vos photos seront supprimés définitivement et ne pourront pas être récupérés.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E74C3C] py-3.5 text-xs font-extrabold text-white transition-colors hover:bg-[#C0392B] disabled:opacity-50"
          >
            <Trash2 size={14} />
            {loading
              ? locale === 'en'
                ? 'Deleting...'
                : locale === 'ar'
                  ? 'جارٍ الحذف...'
                  : 'Suppression...'
              : locale === 'en'
                ? 'Permanently Delete My Account'
                : locale === 'ar'
                  ? 'حذف حسابي نهائياً'
                  : 'Supprimer définitivement mon compte'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
          onClick={() => {
            if (!loading) setShowConfirm(false);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-confirm-title"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDEAEA]">
              <AlertTriangle size={22} color="#E74C3C" />
            </div>
            <h2
              id="delete-account-confirm-title"
              className="mt-4 text-base font-extrabold"
              style={{ color: matchyBrand.textDark }}
            >
              {locale === 'en'
                ? 'Delete your account?'
                : locale === 'ar'
                  ? 'حذف حسابك؟'
                  : 'Supprimer votre compte ?'}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#777]">
              {locale === 'en'
                ? 'Are you sure you want to permanently delete your account? This action cannot be undone.'
                : locale === 'ar'
                  ? 'هل أنت متأكد من رغبتك في حذف حسابك بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.'
                  : 'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.'}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl py-3 text-xs font-bold"
                style={{ border: `1.5px solid ${matchyBrand.border}`, color: matchyBrand.textDark }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="flex-1 rounded-2xl bg-[#E74C3C] py-3 text-xs font-extrabold text-white transition-colors hover:bg-[#C0392B]"
              >
                {locale === 'en' ? 'Delete' : locale === 'ar' ? 'حذف' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
