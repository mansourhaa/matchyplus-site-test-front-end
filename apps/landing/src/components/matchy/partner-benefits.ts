import type { Locale } from '@/features/i18n/messages';

export type PartnerBenefit = { title: string; desc: string };

/** What a Matchy+ partner gets: shown on /devenir-partenaire/ and on /partenaires/. */
export const PARTNER_BENEFITS: Record<Locale, PartnerBenefit[]> = {
  fr: [
    {
      title: 'Visibilité maximale',
      desc: 'Apparaissez en priorité dans les recherches géolocalisées de votre ville.',
    },
    {
      title: 'Clients qualifiés',
      desc: 'Recevez des demandes ciblées correspondant exactement à vos domaines d’expertise.',
    },
    {
      title: 'Matchy Wallet & Boosters',
      desc: 'Accédez à des outils exclusifs pour multiplier vos connexions et opportunités.',
    },
  ],
  en: [
    {
      title: 'Maximum visibility',
      desc: 'Appear at the top of location-based searches in your city.',
    },
    {
      title: 'Qualified clients',
      desc: 'Receive targeted service requests tailored to your exact skillset.',
    },
    {
      title: 'Matchy Wallet & Boosters',
      desc: 'Unlock exclusive tools to multiply connections and business opportunities.',
    },
  ],
  ar: [
    {
      title: 'أقصى درجات الظهور',
      desc: 'كن في مقدمة نتائج البحث المعتمدة على الموقع في منطقتك.',
    },
    {
      title: 'عملاء مؤهلون',
      desc: 'احصل على طلبات تطابق تخصصك وخبراتك بدقة.',
    },
    {
      title: 'Matchy Wallet وميزات الترويج',
      desc: 'استفد من أدوات تسريع الظهور لمضاعفة فرص العمل.',
    },
  ],
};
