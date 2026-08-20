'use client';

import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ChevronDown, HelpCircle, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type FAQItem = [string, string];

const data: Record<
  'fr' | 'en' | 'ar',
  {
    eyebrow: string;
    title: string;
    intro: string;
    sectionTitle: string;
    items: FAQItem[];
    moreQuestions: string;
    supportAvailability: string;
    contactUs: string;
  }
> = {
  fr: {
    eyebrow: 'Matchy+ FAQ',
    title: 'Questions Fréquentes',
    intro: 'Tout ce que vous devez savoir pour démarrer et tirer le meilleur parti de Matchy+.',
    sectionTitle: 'Questions et réponses générales',
    moreQuestions: 'Vous ne trouvez pas la réponse à votre question ?',
    supportAvailability: 'Notre équipe d’assistance est disponible 7j/7.',
    contactUs: 'Contacter notre équipe',
    items: [
      [
        'Qu’est-ce que Matchy+ ?',
        'Matchy+ est une plateforme panafricaine nouvelle génération qui met en relation des particuliers et entreprises avec des professionnels, artisans et prestataires locaux vérifiés de confiance.',
      ],
      [
        'Comment trouver un professionnel près de chez moi ?',
        'Activez simplement la géolocalisation pour explorer les profils autour de vous, utilisez la recherche par compétences ou laissez notre algorithme de matching intelligent vous proposer les talents les plus pertinents.',
      ],
      [
        'L’application est-elle gratuite ?',
        'Oui, l’inscription, la découverte et la prise de contact de base sont 100% gratuites. Des fonctionnalités avancées (boost de visibilité, déblocage de profils masqués, appels vidéo prioritaires) sont accessibles grâce à Matchy Wallet.',
      ],
      [
        'Comment fonctionne le Matchy Wallet ?',
        'Matchy Wallet est un portefeuille digital intégré permettant d’acheter des crédits ou de souscrire à des forfaits pour propulser votre visibilité locale et recevoir des demandes de clients ciblés.',
      ],
      [
        'Comment devenir partenaire certifié ?',
        'Rendez-vous sur la page « Devenir partenaire », renseignez votre métier et vos coordonnées. Notre équipe vérifiera vos informations pour vous attribuer le badge de confiance et booster vos opportunités.',
      ],
      [
        'Mes données personnelles sont-elles protégées ?',
        'Absolument. Nous appliquons les normes les plus strictes en matière de sécurité et de confidentialité. Vous gardez un contrôle total sur vos informations et pouvez demander la suppression de votre compte à tout moment.',
      ],
    ],
  },
  en: {
    eyebrow: 'Matchy+ FAQ',
    title: 'Frequently Asked Questions',
    intro: 'Everything you need to know to get started and make the most out of Matchy+.',
    sectionTitle: 'General Questions & Answers',
    moreQuestions: 'Cannot find the answer you are looking for?',
    supportAvailability: 'Our support team is available 7 days a week.',
    contactUs: 'Contact our team',
    items: [
      [
        'What is Matchy+?',
        'Matchy+ is a next-generation pan-African platform connecting individuals and businesses with verified local service providers, artisans, and skilled talent.',
      ],
      [
        'How do I find a professional near me?',
        'Simply enable location services to browse profiles in your area, use skill-based search, or let our smart matching algorithm recommend the best professionals for your needs.',
      ],
      [
        'Is the application free?',
        'Yes, signup, discovery, and basic matching are 100% free. Advanced features such as profile boosters, premium video calls, and VIP recommendations are powered by Matchy Wallet.',
      ],
      [
        'How does Matchy Wallet work?',
        'Matchy Wallet is an integrated digital wallet that allows service providers to purchase credits or subscriptions to increase their local reach and get high-intent leads.',
      ],
      [
        'How can I become a verified partner?',
        'Visit the "Become a Partner" page, enter your business details and contact info. Our team will verify your credentials and award you the trusted verification badge.',
      ],
      [
        'Is my personal data safe?',
        'Strictly secure. We adhere to high data privacy and encryption standards. You have complete control over your profile and can request account deletion at any time.',
      ],
    ],
  },
  ar: {
    eyebrow: 'الأسئلة الشائعة ماتشي بلس',
    title: 'الأسئلة الشائعة',
    intro: 'كل ما تحتاج معرفته للبدء وتحقيق أقصى استفادة من منصة ماتشي بلس.',
    sectionTitle: 'أسئلة وأجوبة عامة',
    moreQuestions: 'لم تجد الإجابة التي تبحث عنها؟',
    supportAvailability: 'فريق الدعم لدينا متاح طوال أيام الأسبوع 7/7.',
    contactUs: 'تواصل مع فريقنا',
    items: [
      [
        'ما هي منصة Matchy+؟',
        'Matchy+ هي منصة إفريقية حديثة تربط الأفراد والشركات بالمهنيين والحرفيين ومقدمي الخدمات المحليين الموثوقين.',
      ],
      [
        'كيف أجد مهنيًا بالقرب مني؟',
        'ما عليك سوى تفعيل الموقع الجغرافي لتصفح الملفات من حولك، أو استخدام البحث بالتخصص، أو الاعتماد على المطابقة الذكية للمنصة.',
      ],
      [
        'هل التطبيق مجاني؟',
        'نعم، التسجيل والاستكشاف والتواصل الأساسي مجاني تمامًا. الميزات المتقدمة مثل مضاعفة الظهور والمكالمات المباشرة متاحة عبر Matchy Wallet.',
      ],
      [
        'كيف تعمل محفظة Matchy Wallet؟',
        'هي محفظة رقمية مدمجة تتيح للمهنيين شراء نقاط أو اشتراكات لترقية ظهورهم وجلب عملاء مؤهلين بسرعة.',
      ],
      [
        'كيف أصبح شريكًا معتمدًا؟',
        'انتقل إلى صفحة "كن شريكًا" وأدخل بيانات نشاطك، وسيقوم فريقنا بمراجعة معلوماتك لمنحك شارة الثقة.',
      ],
      [
        'هل بياناتي الشخصية محمية؟',
        'بالتأكيد. نطبق أعلى معايير الأمان والخصوصية ولديك كامل الصلاحية لحذف بياناتك في أي وقت.',
      ],
    ],
  },
};

export default function FAQ() {
  const { locale } = useI18n();
  const t = data[locale];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero eyebrow={t.eyebrow} title={t.title} subtitle={t.intro} />

        <div className="relative z-20 container -mt-10 max-w-4xl sm:-mt-14">
          <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10">
            <div className="mb-8 flex items-center gap-2 border-b border-neutral-100 pb-5">
              <span className="bg-brand-teal/15 text-brand-teal grid h-8 w-8 place-items-center rounded-lg">
                <HelpCircle className="h-4 w-4" />
              </span>
              <h2 className="text-brand-navy text-lg font-bold">{t.sectionTitle}</h2>
            </div>

            <div className="space-y-4">
              {t.items.map(([question, answer], idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 ${
                      isOpen
                        ? 'border-brand-teal/40 bg-brand-teal/5 shadow-sm'
                        : 'border-neutral-200/80 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      className="text-brand-navy flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left text-sm font-bold sm:text-base"
                    >
                      <span className="flex-1">{question}</span>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-transform duration-200 ${
                          isOpen
                            ? 'bg-brand-teal rotate-180 text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-brand-teal/10 border-t px-5 pt-1 pb-5 text-sm leading-relaxed text-neutral-600">
                        {answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom contact prompt */}
            <div className="from-brand-blue/10 via-brand-teal/10 to-brand-teal/5 border-brand-teal/20 mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r p-6 sm:flex-row">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="bg-brand-blue shadow-brand-blue/20 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-brand-navy text-sm font-bold">{t.moreQuestions}</h4>
                  <p className="text-muted-foreground mt-0.5 text-xs">{t.supportAvailability}</p>
                </div>
              </div>
              <Link
                href="/contact"
                className="bg-brand-blue hover:bg-brand-blue/90 inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
              >
                {t.contactUs}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PageFrame>
  );
}
