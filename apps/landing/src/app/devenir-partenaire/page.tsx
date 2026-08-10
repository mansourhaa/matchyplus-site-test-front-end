'use client';

import { PageFrame } from '@/components/site-shell';
import { useI18n } from '@/features/i18n/i18n-provider';

const data: Record<'fr' | 'en' | 'ar', string[]> = {
  fr: [
    'Devenez partenaire Matchy+',
    'Présentez votre activité à des clients qui recherchent exactement vos compétences.',
    'Votre nom',
    'Votre activité',
    'Téléphone',
    'Rejoindre le réseau',
  ],
  en: [
    'Become a Matchy+ partner',
    'Showcase your business to customers looking for exactly your skills.',
    'Your name',
    'Your business',
    'Phone number',
    'Join the network',
  ],
  ar: [
    'كن شريكًا مع ماتشي',
    'اعرض نشاطك على عملاء يبحثون عن مهاراتك وخدماتك.',
    'اسمك',
    'نشاطك',
    'رقم الهاتف',
    'انضم إلى الشبكة',
  ],
};

export default function Partner() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="inner-page">
        <div className="form-grid container">
          <div className="partner-pitch">
            <span className="eyebrow">Matchy Wallet</span>
            <h1>{t[0]}</h1>
            <p className="lead">{t[1]}</p>
            <div className="partner-benefits">
              <span>
                ✦{' '}
                {locale === 'ar'
                  ? 'ظهور محلي'
                  : locale === 'en'
                    ? 'Local visibility'
                    : 'Visibilité locale'}
              </span>
              <span>
                ✦{' '}
                {locale === 'ar'
                  ? 'عملاء مستهدفون'
                  : locale === 'en'
                    ? 'Qualified clients'
                    : 'Clients qualifiés'}
              </span>
              <span>
                ✦{' '}
                {locale === 'ar'
                  ? 'شبكة إفريقية'
                  : locale === 'en'
                    ? 'Pan-African network'
                    : 'Réseau panafricain'}
              </span>
            </div>
          </div>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              {t[2]}
              <input required />
            </label>
            <label>
              {t[3]}
              <input required />
            </label>
            <label>
              {t[4]}
              <input required type="tel" />
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
