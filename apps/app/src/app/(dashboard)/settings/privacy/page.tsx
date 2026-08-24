'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch } from '@/features/auth/hooks';
import { deleteAccount } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { toast } from '@/lib/toast';
import { AlertTriangle, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PrivacyPage() {
  const { t, locale } = useI18n();
  const isRtl = locale === 'ar';
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    } catch (err) {
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
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F7F3]">
            <Lock size={20} color={matchyBrand.teal} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
              {t('settings.privacy')}
            </h1>
            <p className="text-xs text-[#777]">
              {locale === 'en'
                ? 'Manage your profile visibility, location sharing, and security preferences'
                : locale === 'ar'
                  ? 'إدارة رؤية الملف الشخصي وتحديد الموقع وتفضيلات الأمان'
                  : 'Gérez la visibilité de votre profil, votre localisation et vos préférences'}
            </p>
          </div>
        </div>

        {/* GPS Privacy Info */}
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

        {/* Deletion Warning Box */}
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
