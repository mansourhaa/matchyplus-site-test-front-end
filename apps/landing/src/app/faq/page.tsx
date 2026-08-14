'use client';

import { PageFrame } from '@/components/site-shell';
import { useI18n } from '@/features/i18n/i18n-provider';

type FAQItem = [string, string];

const data: Record<'fr' | 'en' | 'ar', { title: string; intro: string; items: FAQItem[] }> = {
  fr: {
    title: 'Questions fréquentes',
    intro: 'Tout ce que vous devez savoir sur Matchy+.',
    items: [
      [
        'Qu’est-ce que Matchy+ ?',
        'Matchy+ est une plateforme panafricaine qui met en relation les personnes avec des professionnels et services locaux de confiance.',
      ],
      [
        'Comment trouver un professionnel ?',
        'Choisissez votre localisation, explorez les profils proposés et connectez-vous avec le professionnel qui correspond à vos besoins.',
      ],
      [
        'L’application est-elle gratuite ?',
        'La découverte et la mise en relation sont simples et accessibles. Des fonctionnalités premium sont disponibles via Matchy Wallet.',
      ],
      [
        'Comment devenir partenaire ?',
        'Remplissez le formulaire partenaire et notre équipe vous accompagnera pour créer un profil attractif.',
      ],
    ],
  },
  en: {
    title: 'Frequently asked questions',
    intro: 'Everything you need to know about Matchy+.',
    items: [
      [
        'What is Matchy+?',
        'Matchy+ is a pan-African platform connecting people with trusted local professionals and services.',
      ],
      [
        'How do I find a professional?',
        'Choose your location, browse suggested profiles and connect with the professional who fits your needs.',
      ],
      [
        'Is the app free?',
        'Discovery and matching are easy and accessible. Premium features are available through Matchy Wallet.',
      ],
      [
        'How do I become a partner?',
        'Fill in the partner form and our team will help you create an attractive profile.',
      ],
    ],
  },
  ar: {
    title: 'الأسئلة الشائعة',
    intro: 'كل ما تحتاج معرفته عن ماتشي بلس.',
    items: [
      ['ما هي Matchy+؟', 'منصة إفريقية تربط الأشخاص بالمهنيين والخدمات المحلية الموثوقة.'],
      [
        'كيف أعثر على مهني؟',
        'اختر موقعك وتصفح الملفات المقترحة وتواصل مع المهني المناسب لااحتياجاتك.',
      ],
      [
        'هل التطبيق مجاني؟',
        'الاكتشاف والمطابقة متاحان بسهولة. الميزات المميزة متوفرة عبر Matchy Wallet.',
      ],
      ['كيف أصبح شريكًا؟', 'املأ استمارة الشريك وسيساعدك فريقنا على إنشاء ملف جذاب.'],
    ],
  },
};

export default function FAQ() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="inner-page">
        <div className="narrow container">
          <span className="eyebrow">Matchy+</span>
          <h1>{t.title}</h1>
          <p className="lead">{t.intro}</p>
          <div className="faq-list">
            {t.items.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </PageFrame>
  );
}
