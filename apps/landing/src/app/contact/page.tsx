'use client';

import { PageFrame } from '@/components/site-shell';
import { useI18n } from '@/features/i18n/i18n-provider';

const data: Record<'fr' | 'en' | 'ar', string[]> = {
  fr: [
    'Contactez-nous',
    'Une question, une idée ou besoin d’aide ? Écrivez-nous et notre équipe vous répondra rapidement.',
    'Nom complet',
    'Adresse e-mail',
    'Votre message',
    'Envoyer le message',
  ],
  en: [
    'Contact us',
    'A question, an idea or need help? Write to us and our team will get back to you shortly.',
    'Full name',
    'Email address',
    'Your message',
    'Send message',
  ],
  ar: [
    'اتصل بنا',
    'لديك سؤال أو فكرة أو تحتاج إلى المساعدة؟ اكتب لنا وسيرد فريقنا عليك قريبًا.',
    'الاسم الكامل',
    'البريد الإلكتروني',
    'رسالتك',
    'إرسال الرسالة',
  ],
};

export default function Contact() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="inner-page">
        <div className="form-grid container">
          <div>
            <span className="eyebrow">Matchy+</span>
            <h1>{t[0]}</h1>
            <p className="lead">{t[1]}</p>
            <div className="contact-details">
              <span>hello@matchy.tn</span>
              <span>Tunis, Tunisie</span>
            </div>
          </div>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              {t[2]}
              <input required placeholder={t[2]} />
            </label>
            <label>
              {t[3]}
              <input required type="email" placeholder={t[3]} />
            </label>
            <label>
              {t[4]}
              <textarea required rows={5} placeholder={t[4]} />
            </label>
            <button className="button button-primary" type="submit">
              {t[5]}
            </button>
          </form>
        </div>
      </main>
    </PageFrame>
  );
}
