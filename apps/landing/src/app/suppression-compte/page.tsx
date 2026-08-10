'use client';

import { PageFrame } from '@/components/site-shell';
import { useI18n } from '@/features/i18n/i18n-provider';

const data: Record<'fr' | 'en' | 'ar', string[]> = {
  fr: [
    'Supprimer mon compte',
    'Nous sommes désolés de vous voir partir. Pour demander la suppression de votre compte et de vos données, remplissez ce formulaire.',
    'Adresse e-mail du compte',
    'Pourquoi souhaitez-vous partir ?',
    'Demander la suppression',
    'Votre demande sera traitée par notre équipe conformément à notre politique de confidentialité.',
  ],
  en: [
    'Delete my account',
    'We are sorry to see you go. To request deletion of your account and data, complete this form.',
    'Account email address',
    'Why are you leaving?',
    'Request deletion',
    'Your request will be processed by our team in accordance with our privacy policy.',
  ],
  ar: [
    'حذف حسابي',
    'نأسف لرؤيتك تغادر. لطلب حذف حسابك وبياناتك، املأ هذا النموذج.',
    'البريد الإلكتروني للحساب',
    'لماذا تريد المغادرة؟',
    'طلب الحذف',
    'سيتم معالجة طلبك من قبل فريقنا وفقًا لسياسة الخصوصية الخاصة بنا.',
  ],
};

export default function DeleteAccount() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="inner-page">
        <div className="form-grid deletion container">
          <div>
            <span className="eyebrow">Matchy+</span>
            <h1>{t[0]}</h1>
            <p className="lead">{t[1]}</p>
          </div>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              {t[2]}
              <input required type="email" />
            </label>
            <label>
              {t[3]}
              <textarea rows={4} />
            </label>
            <button className="button button-danger" type="submit">
              {t[4]}
            </button>
            <small>{t[5]}</small>
          </form>
        </div>
      </main>
    </PageFrame>
  );
}
