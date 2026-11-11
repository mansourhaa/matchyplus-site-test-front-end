/**
 * Industry keys a member picks in the onboarding identity step ("Secteur d'activité"). The key is
 * what `User.industry` stores, whatever the member's language; the app translates it for display.
 */
export const INDUSTRY_KEYS = [
  'commerce_retail',
  'professional_services',
  'tech_digital',
  'finance_insurance',
  'industry_production',
  'agriculture_food',
  'health_wellness',
  'education_training',
  'transport_logistics',
  'local_services_trades',
] as const;

export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export const INDUSTRY_LABELS: Record<IndustryKey, string> = {
  commerce_retail: 'Commerce & Retail',
  professional_services: 'Services professionnels & Conseil',
  tech_digital: 'Technologie & Digital',
  finance_insurance: 'Finance & Assurance',
  industry_production: 'Industrie & Production',
  agriculture_food: 'Agriculture & Agroalimentaire',
  health_wellness: 'Santé & Bien-être',
  education_training: 'Éducation & Formation',
  transport_logistics: 'Transport & Logistique',
  local_services_trades: 'Services de proximité & Métiers',
};

/**
 * Internal matching keywords for each industry, per language. Never shown to members: the app only
 * displays the industry name.
 */
export const INDUSTRY_KEYWORDS: Record<IndustryKey, Record<'fr' | 'en' | 'ar', string[]>> = {
  commerce_retail: {
    fr: ['boutiques', 'e-commerce', 'grossistes'],
    en: ['stores', 'e-commerce', 'wholesalers'],
    ar: ['المتاجر', 'التجارة الإلكترونية', 'تجار الجملة'],
  },
  professional_services: {
    fr: ['conseil', 'juridique', 'comptabilité', 'RH'],
    en: ['consulting', 'legal services', 'accounting', 'human resources'],
    ar: ['الاستشارات', 'الخدمات القانونية', 'المحاسبة', 'الموارد البشرية'],
  },
  tech_digital: {
    fr: ['IT', 'SaaS', 'développement', 'télécoms'],
    en: ['IT', 'SaaS', 'software development', 'telecommunications'],
    ar: ['تقنية المعلومات', 'البرمجيات كخدمة SaaS', 'التطوير', 'الاتصالات'],
  },
  finance_insurance: {
    fr: ['banques', 'fintech', 'assurance', 'microfinance'],
    en: ['banking', 'fintech', 'insurance', 'microfinance'],
    ar: ['البنوك', 'التكنولوجيا المالية', 'التأمين', 'التمويل الأصغر'],
  },
  industry_production: {
    fr: ['usines', 'fabrication', 'transformation'],
    en: ['factories', 'manufacturing', 'processing'],
    ar: ['المصانع', 'التصنيع', 'التحويل'],
  },
  agriculture_food: {
    fr: ['agriculture', 'élevage', 'transformation alimentaire'],
    en: ['farming', 'livestock', 'food processing'],
    ar: ['الزراعة', 'تربية الماشية', 'تصنيع الأغذية'],
  },
  health_wellness: {
    fr: ['cliniques', 'pharmacies', 'coaching', 'fitness'],
    en: ['clinics', 'pharmacies', 'coaching', 'fitness'],
    ar: ['العيادات', 'الصيدليات', 'التدريب الشخصي', 'اللياقة البدنية'],
  },
  education_training: {
    fr: ['écoles', 'universités', 'centres de formation'],
    en: ['schools', 'universities', 'training centers'],
    ar: ['المدارس', 'الجامعات', 'مراكز التدريب'],
  },
  transport_logistics: {
    fr: ['transporteurs', 'livraison', 'mobilité'],
    en: ['transportation', 'delivery', 'mobility'],
    ar: ['النقل', 'التوصيل', 'خدمات التنقل'],
  },
  local_services_trades: {
    fr: [
      'BTP',
      'plomberie',
      'électricité',
      'nettoyage',
      'maintenance',
      'restauration',
      'hôtellerie',
    ],
    en: [
      'construction',
      'plumbing',
      'electrical services',
      'cleaning',
      'maintenance',
      'restaurants',
      'hospitality',
    ],
    ar: ['البناء والأشغال', 'السباكة', 'الكهرباء', 'التنظيف', 'الصيانة', 'المطاعم', 'الفندقة'],
  },
};
