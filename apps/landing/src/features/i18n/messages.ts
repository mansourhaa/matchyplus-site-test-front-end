export type Locale = 'en' | 'fr' | 'ar';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'ar'];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_STORAGE_KEY = 'matchy_locale';

export type MessageTree = { [key: string]: string | MessageTree };

export const messages: Record<Locale, MessageTree> = {
  en: {
    landing: {
      getStarted: 'Log in',
      heroTitle: 'Connect with Trusted Professionals Near You',
      heroSubtitle:
        "Tunisia's leading geolocation-based platform for finding reliable nannies, gardeners, drivers, and more",
      findProfessional: 'Find a Professional',
      joinAsProfessional: 'Join as a Professional',
      whyChoose: 'Why Choose Matchy+?',
      locationMatching: 'Location-Based Matching',
      locationDesc: 'Find professionals near you with our advanced geolocation technology',
      verifiedProfiles: 'Verified Profiles',
      verifiedDesc: 'All professionals are verified to ensure safety and reliability',
      wideRange: 'Wide Range of Services',
      wideRangeDesc: 'Nannies, gardeners, drivers, cleaners, and more professionals',
      quickEasy: 'Quick & Easy',
      quickEasyDesc: 'Post your needs and get matched with professionals in minutes',
      howItWorks: 'How It Works',
      step1Title: 'Create Your Profile',
      step1Desc:
        "Sign up and tell us what kind of professional you're looking for or the services you offer",
      step2Title: 'Get Matched',
      step2Desc:
        'Our platform uses your location to connect you with nearby verified professionals',
      step3Title: 'Connect & Hire',
      step3Desc: 'Review profiles, communicate directly, and hire the perfect match for your needs',
      ourServices: 'Among the services',
      nannies: 'Nannies',
      nanniesDesc: 'Caring and experienced childcare professionals',
      gardeners: 'Gardeners',
      gardenersDesc: 'Expert garden maintenance and landscaping',
      drivers: 'Drivers',
      driversDesc: 'Professional and reliable drivers',
      cleaners: 'Cleaners',
      cleanersDesc: 'Thorough home and office cleaning services',
      cooks: 'Cooks',
      cooksDesc: 'Skilled chefs for home cooking',
      caregivers: 'Caregivers',
      caregiversDesc: 'Compassionate elderly and special needs care',
      readyToStart: 'Ready to Get Started?',
      readyDesc:
        'Join thousands of people across Tunisia who trust Matchy+ for their professional service needs',
      joinToday: 'Join Matchy+ Today',
      footerDesc: 'Connecting communities across Tunisia and Africa with trusted professionals',
      quickLinks: 'Explore',
      howItWorksLink: 'How It Works',
      ourServicesLink: 'Our Services',
      legal: 'Legal',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      safety: 'Safety Guidelines',
      allRights: 'All rights reserved',
      trustedByThousands: 'Trusted by Thousands',
      joinOurCommunity: 'Join Our Community',
      logoAlt: 'Matchy+',
      communityAlt: 'Community',
      gardenerAlt: 'Gardener',
      nannyAlt: 'Nanny',
      tunisiaAlt: 'Tunisia',
    },
  },
  fr: {
    landing: {
      getStarted: 'Connexion',
      heroTitle: 'Connectez-vous avec des Professionnels de Confiance Près de Chez Vous',
      heroSubtitle:
        'La plateforme leader en Tunisie basée sur la géolocalisation pour trouver des nounous, jardiniers, chauffeurs fiables et plus',
      findProfessional: 'Trouver un Professionnel',
      joinAsProfessional: 'Rejoindre en tant que Professionnel',
      whyChoose: 'Pourquoi Choisir Matchy+?',
      locationMatching: 'Correspondance Basée sur la Localisation',
      locationDesc:
        'Trouvez des professionnels près de chez vous grâce à notre technologie de géolocalisation avancée',
      verifiedProfiles: 'Profils Vérifiés',
      verifiedDesc: 'Tous les professionnels sont vérifiés pour garantir sécurité et fiabilité',
      wideRange: 'Large Gamme de Services',
      wideRangeDesc: 'Nounous, jardiniers, chauffeurs, femmes de ménage et plus de professionnels',
      quickEasy: 'Rapide & Facile',
      quickEasyDesc:
        'Publiez vos besoins et soyez mis en relation avec des professionnels en quelques minutes',
      howItWorks: 'Comment Ça Marche',
      step1Title: 'Créez Votre Profil',
      step1Desc:
        'Inscrivez-vous et dites-nous quel type de professionnel vous recherchez ou les services que vous offrez',
      step2Title: 'Soyez Mis en Relation',
      step2Desc:
        'Notre plateforme utilise votre localisation pour vous connecter avec des professionnels vérifiés à proximité',
      step3Title: 'Connectez & Embauchez',
      step3Desc:
        'Consultez les profils, communiquez directement et embauchez la personne idéale pour vos besoins',
      ourServices: 'Parmi les services',
      nannies: 'Nounous',
      nanniesDesc: "Professionnels de garde d'enfants attentionnés et expérimentés",
      gardeners: 'Jardiniers',
      gardenersDesc: 'Experts en entretien de jardin et aménagement paysager',
      drivers: 'Chauffeurs',
      driversDesc: 'Chauffeurs professionnels et fiables',
      cleaners: 'Femmes de Ménage',
      cleanersDesc: 'Services de nettoyage complets pour maison et bureau',
      cooks: 'Cuisiniers',
      cooksDesc: 'Chefs qualifiés pour cuisine à domicile',
      caregivers: 'Aidants',
      caregiversDesc: 'Soins compatissants pour personnes âgées et besoins spéciaux',
      readyToStart: 'Prêt à Commencer?',
      readyDesc:
        'Rejoignez des milliers de personnes en Tunisie qui font confiance à Matchy+ pour leurs besoins en services professionnels',
      joinToday: "Rejoignez Matchy+ Aujourd'hui",
      footerDesc:
        'Connecter les communautés en Tunisie et en Afrique avec des professionnels de confiance',
      quickLinks: 'Explorer',
      howItWorksLink: 'Comment Ça Marche',
      ourServicesLink: 'Nos Services',
      legal: 'Légal',
      privacy: 'Politique de Confidentialité',
      terms: "Conditions d'Utilisation",
      safety: 'Directives de Sécurité',
      allRights: 'Tous droits réservés',
      trustedByThousands: 'Adopté par des milliers de personnes',
      joinOurCommunity: 'Rejoignez notre communauté',
      logoAlt: 'Matchy+',
      communityAlt: 'Communauté',
      gardenerAlt: 'Jardinier',
      nannyAlt: 'Nounou',
      tunisiaAlt: 'Tunisie',
    },
  },
  ar: {
    landing: {
      getStarted: 'تسجيل الدخول',
      heroTitle: 'تواصل مع محترفين موثوقين بالقرب منك',
      heroSubtitle:
        'المنصة الرائدة في تونس القائمة على تحديد الموقع الجغرافي للعثور على مربيات وبستانيين وسائقين موثوقين والمزيد',
      findProfessional: 'ابحث عن محترف',
      joinAsProfessional: 'انضم كمحترف',
      whyChoose: 'لماذا تختار Matchy+؟',
      locationMatching: 'المطابقة على أساس الموقع',
      locationDesc: 'اعثر على محترفين بالقرب منك باستخدام تقنية تحديد الموقع الجغرافي المتقدمة',
      verifiedProfiles: 'ملفات تعريف موثقة',
      verifiedDesc: 'يتم التحقق من جميع المحترفين لضمان السلامة والموثوقية',
      wideRange: 'مجموعة واسعة من الخدمات',
      wideRangeDesc: 'مربيات وبستانيون وسائقون وعمال نظافة والمزيد من المحترفين',
      quickEasy: 'سريع وسهل',
      quickEasyDesc: 'انشر احتياجاتك واحصل على مطابقة مع المحترفين في دقائق',
      howItWorks: 'كيف يعمل',
      step1Title: 'أنشئ ملفك الشخصي',
      step1Desc: 'سجل وأخبرنا عن نوع المحترف الذي تبحث عنه أو الخدمات التي تقدمها',
      step2Title: 'احصل على مطابقة',
      step2Desc: 'تستخدم منصتنا موقعك لربطك بمحترفين موثقين قريبين',
      step3Title: 'تواصل ووظف',
      step3Desc: 'راجع الملفات الشخصية وتواصل مباشرة ووظف المطابقة المثالية لاحتياجاتك',
      ourServices: 'من بين الخدمات',
      nannies: 'مربيات',
      nanniesDesc: 'محترفو رعاية الأطفال الحنونون وذوو الخبرة',
      gardeners: 'بستانيون',
      gardenersDesc: 'خبراء في صيانة الحدائق وتنسيق المناظر الطبيعية',
      drivers: 'سائقون',
      driversDesc: 'سائقون محترفون وموثوقون',
      cleaners: 'عمال نظافة',
      cleanersDesc: 'خدمات تنظيف شاملة للمنزل والمكتب',
      cooks: 'طهاة',
      cooksDesc: 'طهاة ماهرون للطبخ المنزلي',
      caregivers: 'مقدمو رعاية',
      caregiversDesc: 'رعاية رحيمة لكبار السن وذوي الاحتياجات الخاصة',
      readyToStart: 'مستعد للبدء؟',
      readyDesc:
        'انضم إلى آلاف الأشخاص في تونس الذين يثقون في Matchy+ لتلبية احتياجاتهم من الخدمات المهنية',
      joinToday: 'انضم إلى Matchy+ اليوم',
      footerDesc: 'ربط المجتمعات في تونس وأفريقيا بمحترفين موثوقين',
      quickLinks: 'استكشف',
      howItWorksLink: 'كيف يعمل',
      ourServicesLink: 'خدماتنا',
      legal: 'قانوني',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      safety: 'إرشادات السلامة',
      allRights: 'كل الحقوق محفوظة',
      trustedByThousands: 'موثوق من قبل الآلاف',
      joinOurCommunity: 'انضم إلى مجتمعنا',
      logoAlt: 'Matchy+',
      communityAlt: 'مجتمع',
      gardenerAlt: 'بستاني',
      nannyAlt: 'مربية',
      tunisiaAlt: 'تونس',
    },
  },
};

export function getMessage(tree: MessageTree, path: string): string | undefined {
  const parts = path.split('.');
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
