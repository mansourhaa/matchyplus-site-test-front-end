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
      hero: 'Touvez le bon professionnel, près de chez vous',
      intro:
        'Besoin d’un service fiable ? Découvrez des professionnels disponibles autour de vous, trouvez le profil qui correspond à votre besoin et entrez facilement en contact.',
      title: 'Trouvez plus facilement le service dont vous avez besoin',
      body: 'Avec Matchy+, particuliers, entreprises et professionnels peuvent se découvrir, échanger et créer de nouvelles opportunités grâce à une mise en relation simple, intelligente et locale.',

      swipeTitle: 'Trouvez des professionnels à proximité',
      swipeText:
        'Utilisez la géolocalisation pour découvrir rapidement les professionnels disponibles autour de vous.',

      growTitle: 'Développez votre activité',
      growText:
        'Présentez vos compétences, valorisez vos services et attirez de nouveaux clients dans votre région.',

      nearTitle: 'Découvrez les profils qui vous correspondent',
      nearText:
        ' Accédez à une sélection personnalisée de professionnels selon votre besoin, votre localisation et vos préférences.',

      aiTitle: 'Recevez des recommandations personnalisées',
      aiText:
        'Profitez de suggestions alimentées par l’intelligence artificielle pour trouver plus rapidement les profils adaptés à votre recherche.',

      wallet: 'Boostez votre visibilité avec Matchy Wallet',
      walletSubtitle: 'Plus de visibilité. Plus de contacts. Plus d’opportunités.',
      walletBody:
        'Matchy Wallet est le portefeuille numérique intégré qui permet aux professionnels d’accéder simplement à des fonctionnalités supplémentaires pour développer leur visibilité sur la plateforme.',
      walletUsage: 'Utilisez vos crédits pour :',
      walletBullets: [
        'Booster votre profil',
        'Remonter dans les résultats de recherche',
        'Augmenter votre visibilité locale',
        'Mettre en avant vos services',
        'Accéder à des fonctionnalités exclusives',
        'Générer davantage de contacts qualifiés',
      ],

      exploreTitle: 'Découvrez les professionnels disponibles autour de vous',
      exploreBody:
        'Matchy Explore vous aide à trouver des artisans, des freelances, des indépendants et des prestataires de services à proximité.',
      exploreUsage:
        'Grâce à la géolocalisation et aux recommandations personnalisées, explorez rapidement les profils les plus pertinents et choisissez le professionnel qui répond à votre besoin.',
      stepsTitle: 'Trouvez le bon professionnel en trois étapes',
      stepsSubtitle: 'les étapes ..',
      stepsBody:
        'Matchy+ simplifie votre recherche et vous aide à entrer rapidement en contact avec les professionnels disponibles près de chez vous.',

      steps: [
        [
          '1',
          'Choisissez le profil adapté',
          'Découvrez une sélection de professionnels correspondant à votre besoin, à vos préférences et à votre localisation.',
        ],
        [
          '2',
          'Choisir un profil',
          ' Consultez les compétences et les services proposés, puis sélectionnez le professionnel qui répond le mieux à votre recherche.',
        ],
        [
          '3',
          'Entrez directement en contact',
          'Échangez avec le professionnel sélectionné pour présenter votre besoin et convenir ensemble des détails du service.',
        ],
      ],

      downloadTitle: 'e professionnel que vous recherchez est peut-être tout près',
      downloadBody:
        'Rejoignez Matchy+ pour trouver facilement des services locaux ou présenter vos compétences à de nouveaux clients.',
      learnMore: 'En Savoir Plus',

      downloadBadge: 'Download now',
      getItOn: 'GET IT ON',
      googlePlay: 'Google Play',
      discoverMore: 'Découvrir plus',
      panAfrican:
        'La plateforme panafricaine qui connecte les besoins locaux aux professionnels disponibles.',
      designedFor: 'Conçu pour rapprocher les talents locaux de nouvelles opportunités.',
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
      hero: 'Find the right professional near you',
      intro:
        ' Need a reliable service? Discover professionals available around you, find the profile that matches your needs and connect easily.',
      title: 'Find the service you need more easily',
      body: 'With Matchy+, individuals, businesses and professionals can discover one another, connect and create new opportunities through a simple, smart and local matching experience.',

      swipeTitle: 'Find professionals nearby',
      swipeText: 'Use geolocation to quickly discover professionals available around you.',

      growTitle: 'Grow your business',
      growText:
        'Showcase your skills, highlight your services and attract new customers in your area.',

      nearTitle: ' Discover profiles that match your needs',
      nearText:
        'Access a personalized selection of professionals based on your needs, location and preferences.',

      aiTitle: 'Get personalized recommendations',
      aiText:
        'Benefit from AI-powered suggestions to find profiles that match your search more quickly.',

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
