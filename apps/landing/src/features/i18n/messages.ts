export type Locale = 'en' | 'fr' | 'ar';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'ar'];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_STORAGE_KEY = 'matchy_locale';

export type MessageTree = { [key: string]: string | string[] | string[][] | MessageTree };

export const messages: Record<Locale, MessageTree> = {
  fr: {
    landing: {
      services: 'Services',
      explore: 'Explorer',
      how: 'Utilisation',
      download: 'Télécharger',
      faq: 'FAQ',
      contact: 'Contact',
      partner: 'Devenir partenaire',
      delete: 'Supprimer mon compte',
      privacyPolicy: 'Politique de confidentialité',
      terms: "Conditions d'utilisation",
      cta: "S'inscrire gratuitement",
      login: 'Connexion',

      eyebrow: 'Matchy Plus',
      hero: 'La plateforme panafricaine des services locaux',
      intro:
        'Trouvez le bon service près de vous. Développez votre activité. Faites grandir votre réseau local.',
      title: 'Une nouvelle façon de trouver et proposer des services',
      body: 'Une mise en relation simple, intelligente et humaine entre les talents locaux et les personnes qui recherchent un service.',

      swipeTitle: 'Swiper, Matchez, Connectez-vous',
      swipeText:
        'Un système de matching intelligent qui met en relation les talents et les opportunités locales en un instant.',

      growTitle: 'Développez votre visibilité',
      growText: 'Attirez de nouveaux clients et valorisez vos compétences au cœur de votre région.',

      nearTitle: 'Trouvez des services près de vous',
      nearText:
        'Découvrez des professionnels locaux qualifiés et disponibles autour de vous grâce à la géolocalisation intelligente.',

      aiTitle: "Recommandations alimentées par l'IA",
      aiText:
        'Des suggestions sur mesure basées sur vos besoins, votre historique et votre localisation.',

      wallet: 'Développez votre visibilité avec Matchy Wallet',
      walletSubtitle: "Plus de visibilité. Plus d'opportunités.",
      walletBody:
        "Matchy Wallet est le portefeuille numérique intégré qui permet aux professionnels d'accéder à des fonctionnalités premium sans complexité.",
      walletUsage: 'Utilisez vos crédits pour :',
      walletBullets: [
        'Booster votre profil',
        'Remonter dans les résultats de recherche',
        'Augmenter votre visibilité locale',
        'Mettre en avant vos services',
        'Accéder à des fonctionnalités exclusives',
        'Générer davantage de contacts qualifiés',
      ],

      exploreTitle: 'Découvrir Matchy explore',
      exploreBody:
        'Matchy Explore vous permet de découvrir des professionnels, artisans, freelances et prestataires de confiance près de votre localisation. Grâce à la géolocalisation intelligente et au matching personnalisé, trouvez rapidement les profils les plus pertinents pour répondre à vos besoins.',

      stepsTitle: 'Comment Ça Marche',
      stepsSubtitle: 'les étapes ..',
      stepsBody:
        'Matchy+ simplifie la mise en relation entre les talents locaux et les personnes à la recherche de services.',

      steps: [
        [
          '1',
          'Swiper',
          'Notre algorithme fait tout le travail pour vous proposer une sélection quotidienne de profils pertinents.',
        ],
        ['2', 'Choisir un profil', 'Vous matchez lorsque l’intérêt de se rencontrer est mutuel.'],
        [
          '3',
          'Entrer en contact',
          'Brisez la glace en quelques secondes et laissez la magie opérer.',
        ],
      ],

      downloadTitle: 'Rencontrez Des Professionnels Inspirants Sur Matchy',
      downloadBody:
        'Rejoignez Matchy+ et participez à la création de la plus grande plateforme panafricaine de mise en relation géolocalisée pour les services locaux.',
      learnMore: 'En Savoir Plus',

      downloadBadge: 'Download now',
      getItOn: 'GET IT ON',
      googlePlay: 'Google Play',
      discoverMore: 'Découvrir plus',
      panAfrican: 'La plateforme panafricaine des services locaux.',
      designedFor: 'Conçu pour connecter les talents locaux.',
      allRights: '© 2026 Matchy+. Tous droits réservés.',

      partnerPitch: 'Matchy Wallet',
      partnerTitle: 'Devenez partenaire Matchy+',
      partnerSubtitle:
        'Présentez votre activité à des clients qui recherchent exactement vos compétences.',
      partnerBenefits: ['Visibilité locale', 'Clients qualifiés', 'Réseau panafricain'],
      formName: 'Votre nom',
      formActivity: 'Votre activité',
      formPhone: 'Téléphone',
      formJoin: 'Rejoindre le réseau',

      faqTitle: 'Questions fréquentes',
      faqSubtitle: 'Tout ce que vous devez savoir sur Matchy+.',

      deleteTitle: 'Supprimer mon compte',
      deleteSubtitle:
        'Nous sommes désolés de vous voir partir. Pour demander la suppression de votre compte et de vos données, remplissez ce formulaire.',
      deleteEmail: 'Adresse e-mail du compte',
      deleteReason: 'Pourquoi souhaitez-vous partir ?',
      deleteButton: 'Demander la suppression',
      deleteNotice:
        'Votre demande sera traitée par notre équipe conformément à notre politique de confidentialité.',

      contactTitle: 'Contactez-nous',
      contactSubtitle:
        'Une question, une idée ou besoin d’aide ? Écrivez-nous et notre équipe vous répondra rapidement.',
      contactName: 'Nom complet',
      contactEmail: 'Adresse e-mail',
      contactMessage: 'Votre message',
      contactSend: 'Envoyer le message',
      contactLocation: 'Tunis, Tunisie',
    },
  },
  en: {
    landing: {
      services: 'Services',
      explore: 'Explore',
      how: 'How it works',
      download: 'Download',
      faq: 'FAQ',
      contact: 'Contact',
      partner: 'Become a partner',
      delete: 'Delete account',
      privacyPolicy: 'Privacy policy',
      terms: 'Terms of service',
      cta: 'Join for free',
      login: 'Sign in',

      eyebrow: 'Matchy Plus',
      hero: 'The pan-African platform for local services',
      intro: 'Find the right service near you. Grow your business. Strengthen your local network.',
      title: 'A new way to find and offer services',
      body: 'A simple, smart and human connection between local talent and people looking for a service.',

      swipeTitle: 'Swipe, Match, Connect',
      swipeText:
        'A smart matching system that brings local talent and business opportunities together in an instant.',

      growTitle: 'Grow your visibility',
      growText:
        'Attract new customers and highlight your skills right at the heart of your region.',

      nearTitle: 'Find services near you',
      nearText:
        'Discover qualified and available local professionals near you with smart geolocation.',

      aiTitle: 'AI-powered recommendations',
      aiText: 'Tailored suggestions based on your needs, activity history, and exact location.',

      wallet: 'Grow your visibility with Matchy Wallet',
      walletSubtitle: 'More visibility. More opportunities.',
      walletBody:
        'Matchy Wallet is the built-in digital wallet that gives professionals access to premium features with zero complexity.',
      walletUsage: 'Use your credits to:',
      walletBullets: [
        'Boost your profile',
        'Rise in search results',
        'Increase your local visibility',
        'Highlight your services',
        'Access exclusive features',
        'Generate more qualified leads',
      ],

      exploreTitle: 'Discover Matchy explore',
      exploreBody:
        'Matchy Explore allows you to discover trusted professionals, artisans, freelancers and service providers near your location. Smart geolocation and tailored matching help you quickly find the best matches for your needs.',

      stepsTitle: 'How It Works',
      stepsSubtitle: 'the steps ..',
      stepsBody: 'Matchy+ makes it easy to connect local talent with people looking for services.',

      steps: [
        ['1', 'Swipe', 'Our algorithm does the work and suggests relevant profiles every day.'],
        ['2', 'Choose a profile', 'Match when interest is mutual.'],
        ['3', 'Get in touch', 'Break the ice in seconds.'],
      ],

      downloadTitle: 'Meet Inspiring Professionals On Matchy',
      downloadBody:
        'Join Matchy+ and take part in building the largest pan-African platform for location-based local services.',
      learnMore: 'Learn More',

      downloadBadge: 'Download now',
      getItOn: 'GET IT ON',
      googlePlay: 'Google Play',
      discoverMore: 'Discover more',
      panAfrican: 'The pan-African platform for local services.',
      designedFor: 'Designed to connect local talents.',
      allRights: '© 2026 Matchy+. All rights reserved.',

      partnerPitch: 'Matchy Wallet',
      partnerTitle: 'Become a Matchy+ partner',
      partnerSubtitle: 'Showcase your business to customers looking for exactly your skills.',
      partnerBenefits: ['Local visibility', 'Qualified clients', 'Pan-African network'],
      formName: 'Your name',
      formActivity: 'Your business',
      formPhone: 'Phone number',
      formJoin: 'Join the network',

      faqTitle: 'Frequently asked questions',
      faqSubtitle: 'Everything you need to know about Matchy+.',

      deleteTitle: 'Delete my account',
      deleteSubtitle:
        'We are sorry to see you go. To request deletion of your account and data, complete this form.',
      deleteEmail: 'Account email address',
      deleteReason: 'Why are you leaving?',
      deleteButton: 'Request deletion',
      deleteNotice:
        'Your request will be processed by our team in accordance with our privacy policy.',

      contactTitle: 'Contact us',
      contactSubtitle:
        'A question, an idea or need help? Write to us and our team will get back to you shortly.',
      contactName: 'Full name',
      contactEmail: 'Email address',
      contactMessage: 'Your message',
      contactSend: 'Send message',
      contactLocation: 'Tunis, Tunisia',
    },
  },
  ar: {
    landing: {
      services: 'الخدمات',
      explore: 'استكشف',
      how: 'طريقة الاستخدام',
      download: 'تحميل',
      faq: 'الأسئلة الشائعة',
      contact: 'اتصل بنا',
      partner: 'كن شريكًا',
      delete: 'حذف الحساب',
      privacyPolicy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      cta: 'سجّل مجانًا',
      login: 'تسجيل الدخول',

      eyebrow: 'Matchy+',
      hero: 'المنصة الإفريقية للخدمات المحلية',
      intro: 'اعثر على الخدمة المناسبة بالقرب منك. طوّر نشاطك. نمّ شبكتك المحلية.',
      title: 'طريقة جديدة للعثور على الخدمات وتقديمها',
      body: 'ربط بسيط وذكي وإنساني بين المواهب المحلية والأشخاص الذين يبحثون عن خدمة.',

      swipeTitle: 'تصفّح، طابق، تواصل',
      swipeText: 'نظام مطابقة ذكي يقرّب المهارات من الفرص المحلية المناسبة في لحظات.',

      growTitle: 'طوّر ظهورك',
      growText: 'اجذب عملاء جدد وأبرز كفاءاتك في قلب منطقتك.',

      nearTitle: 'خدمات بالقرب منك',
      nearText: 'اكتشف مهنيين محليين مؤهلين ومتاحين من حولك بفضل تحديد الموقع الذكي.',

      aiTitle: 'توصيات بالذكاء الاصطناعي',
      aiText: 'اقتراحات مخصصة بناءً على احتياجاتك وسجل نشاطك وموقعك الدقيق.',

      wallet: 'طوّر ظهورك مع Matchy Wallet',
      walletSubtitle: 'مزيد من الظهور. مزيد من الفرص.',
      walletBody:
        'محفظة Matchy Wallet هي المحفظة الرقمية المتكاملة التي تتيح للمهنيين الوصول إلى ميزات مميزة بكل سهولة.',
      walletUsage: 'استخدم رصيدك من أجل:',
      walletBullets: [
        'زيادة ظهور ملفك الشخصي',
        'الظهور أولاً في نتائج البحث',
        'تحسين ظهورك المحلي',
        'إبراز خدماتك',
        'الوصول إلى ميزات حصرية',
        'جذب المزيد من جهات الاتصال المؤهلة',
      ],

      exploreTitle: 'اكتشف Matchy explore',
      exploreBody:
        'تتيح لك Matchy Explore اكتشاف المحترفين والحرفيين والمستقلين الموثوقين بالقرب منك بفضل تحديد الموقع والمطابقة المخصصة.',

      stepsTitle: 'كيف تعمل المنصة',
      stepsSubtitle: 'الخطوات ..',
      stepsBody: 'تسهّل Matchy+ التواصل بين المواهب المحلية والأشخاص الباحثين عن الخدمات.',

      steps: [
        ['1', 'تصفّح', 'اكتشف الأشخاص المناسبين وتواصل معهم بسهولة.'],
        ['2', 'اختر ملفًا', 'تطابق مع الآخرين عند وجود اهتمام متبادل.'],
        ['3', 'تواصل', 'ابدأ المحادثة في ثوانٍ ودع الباقي للمنصة.'],
      ],

      downloadTitle: 'التقِ بمهنيين ملهمين على Matchy+',
      downloadBody:
        'انضم إلى Matchy+ وساهم في بناء أكبر منصة إفريقية للخدمات المحلية المعتمدة على الموقع.',
      learnMore: 'اعرف أكثر',

      downloadBadge: 'تحميل الآن',
      getItOn: 'تحميل من',
      googlePlay: 'متجر جوجل',
      discoverMore: 'اكتشف المزيد',
      panAfrican: 'المنصة الإفريقية للخدمات المحلية.',
      designedFor: 'مصمم لربط المواهب المحلية.',
      allRights: '© 2026 Matchy+. كل الحقوق محفوظة.',

      partnerPitch: 'Matchy Wallet',
      partnerTitle: 'كن شريكًا مع Matchy+',
      partnerSubtitle: 'اعرض نشاطك على عملاء يبحثون عن مهاراتك وخدماتك.',
      partnerBenefits: ['ظهور محلي', 'عملاء مستهدفون', 'شبكة إفريقية'],
      formName: 'اسمك',
      formActivity: 'نشاطك',
      formPhone: 'رقم الهاتف',
      formJoin: 'انضم إلى الشبكة',

      faqTitle: 'الأسئلة الشائعة',
      faqSubtitle: 'كل ما تحتاج معرفته عن Matchy+.',

      deleteTitle: 'حذف حسابي',
      deleteSubtitle: 'نأسف لرؤيتك تغادر. لطلب حذف حسابك وبياناتك، املأ هذا النموذج.',
      deleteEmail: 'البريد الإلكتروني للحساب',
      deleteReason: 'لماذا تريد المغادرة؟',
      deleteButton: 'طلب الحذف',
      deleteNotice: 'سيتم معالجة طلبك من قبل فريقنا وفقًا لسياسة الخصوصية الخاصة بنا.',

      contactTitle: 'اتصل بنا',
      contactSubtitle:
        'لديك سؤال أو فكرة أو تحتاج إلى المساعدة؟ اكتب لنا وسيرد فريقنا عليك قريبًا.',
      contactName: 'الاسم الكامل',
      contactEmail: 'البريد الإلكتروني',
      contactMessage: 'رسالتك',
      contactSend: 'إرسال الرسالة',
      contactLocation: 'تونس، تونس',
    },
  },
};

export function getMessage(
  tree: MessageTree,
  path: string,
): string | string[][] | string[] | undefined {
  const parts = path.split('.');
  let node: string | MessageTree | string[][] | string[] | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === 'string' || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return typeof node === 'string' || Array.isArray(node) ? node : undefined;
}

export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
