'use client';

import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { AlertTriangle, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';

const data: Record<
  'fr' | 'en' | 'ar',
  {
    title: string;
    subtitle: string;
    warningTitle: string;
    warningDesc: string;
    emailLabel: string;
    reasonLabel: string;
    button: string;
    confirmText: string;
    sent: string;
    notice: string;
  }
> = {
  fr: {
    title: 'Suppression de compte',
    subtitle:
      'Conformément au RGPD et à notre engagement pour la confidentialité de vos données personnelles.',
    warningTitle: 'Action irréversible',
    warningDesc:
      'La suppression de votre compte effacera définitivement votre profil, vos avis, votre solde Matchy Wallet et vos historiques de conversations.',
    emailLabel: 'Adresse e-mail associée au compte Matchy+',
    reasonLabel: 'Pourquoi souhaitez-vous nous quitter ? (optionnel)',
    button: 'Confirmer la demande de suppression',
    confirmText:
      'Je confirme vouloir supprimer définitivement mon compte et toutes les données associées.',
    sent: 'Demande de suppression enregistrée. Vous recevrez un e-mail de confirmation sous peu.',
    notice:
      'Votre demande sera traitée par notre équipe sous un délai maximum de 30 jours conformément à notre politique de confidentialité.',
  },
  en: {
    title: 'Account Deletion',
    subtitle: 'In compliance with GDPR and our strict commitment to personal data privacy.',
    warningTitle: 'Irreversible Action',
    warningDesc:
      'Deleting your account will permanently remove your profile, reviews, Matchy Wallet balance, and chat history.',
    emailLabel: 'Email address associated with your Matchy+ account',
    reasonLabel: 'Why are you leaving? (optional)',
    button: 'Confirm deletion request',
    confirmText: 'I confirm that I want to permanently delete my account and all associated data.',
    sent: 'Deletion request recorded. You will receive a confirmation email shortly.',
    notice:
      'Your request will be processed by our team within 30 days in accordance with our privacy policy.',
  },
  ar: {
    title: 'حذف الحساب',
    subtitle: 'وفقًا لسياسات الخصوصية وحماية بياناتك الشخصية بالكامل.',
    warningTitle: 'إجراء نهائي لا يمكن التراجع عنه',
    warningDesc:
      'سيؤدي حذف حسابك إلى مسح ملفك الشخصي وتقييماتك ورصيد Matchy Wallet وسجل المحادثات نهائيًا.',
    emailLabel: 'البريد الإلكتروني المرتبط بحساب Matchy+',
    reasonLabel: 'ما هو سبب المغادرة؟ (اختياري)',
    button: 'تأكيد طلب حذف الحساب',
    confirmText: 'أؤكد رغبتي في حذف حسابي وجميع البيانات المرتبطة به نهائيًا.',
    sent: 'تم تسجيل طلب الحذف بنجاح. ستتلقى بريدًا إلكترونيًا لتأكيد العملية قريبًا.',
    notice: 'ستتم معالجة طلبك خلال 30 يومًا كحد أقصى وفقًا لسياسة الخصوصية الخاصة بنا.',
  },
};

export default function DeleteAccount() {
  const { locale } = useI18n();
  const t = data[locale];
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setSubmitted(true);
  };

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero eyebrow="Matchy+ Confidentialité" title={t.title} subtitle={t.subtitle} />

        <div className="relative z-20 container -mt-10 max-w-3xl sm:-mt-14">
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10">
            <div className="mb-6 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50/70 p-4">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900">{t.warningTitle}</h3>
                <p className="mt-1 text-xs leading-relaxed text-red-700">{t.warningDesc}</p>
              </div>
            </div>

            {submitted ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-brand-navy mt-4 text-lg font-bold">{t.sent}</h3>
                <p className="text-muted-foreground mt-2 max-w-md text-xs leading-relaxed">
                  {t.notice}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                    {t.emailLabel}
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="nom@exemple.com"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-brand-navy mb-1.5 block text-xs font-bold">
                    {t.reasonLabel}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Partagez-nous vos retours pour nous aider à nous améliorer..."
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 pt-2 select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs leading-relaxed font-medium text-neutral-700">
                    {t.confirmText}
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!agreed}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> {t.button}
                </button>

                <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
                  {t.notice}
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </PageFrame>
  );
}
