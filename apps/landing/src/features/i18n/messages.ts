export type Locale = 'en' | 'fr' | 'ar';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'ar'];
export const DEFAULT_LOCALE: Locale = 'fr';

export type MessageTree = { [key: string]: string | string[] | string[][] | MessageTree };

export const messages: Record<Locale, MessageTree> = {
  fr: {
    landing: {
      services: 'Services',
      explore: 'Explorer',
      about: 'À propos',
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
      hero: 'Trouvez le bon professionnel,',
      heroLine2: 'près de chez vous',
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
      walletUsage:
        'Utilisez vos crédits pour : booster votre profil, remonter dans les résultats de recherche, augmenter votre visibilité locale, mettre en avant vos services, accéder à des fonctionnalités exclusives et générer davantage de contacts qualifiés.',

      exploreTitle: 'Découvrez les professionnels',
      exploreTitleLine2: 'disponibles autour de vous',
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

      downloadTitle: 'le professionnel que vous recherchez',
      downloadTitleLine2: 'est peut-être tout près',
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

      heroImageAlt:
        'Écran de l’application Matchy+ montrant le profil d’une professionnelle de la garde d’enfants disponible à proximité',
      featuresImageAlt:
        'Profil d’un plombier dans l’application Matchy+ avec sa note, sa distance, ses compétences et ses modes de contact',
      walletImageAlt:
        'Écran Matchy Wallet affichant le solde et les actions pour booster un profil',
      exploreImageAlt:
        'Carte de l’Afrique illustrant des professionnels locaux (chauffeur, nounou, électricien, plombier, jardinier) reliés à l’application Matchy+',
      ctaImageAlt:
        'Collage de travailleurs et de professionnels africains formant la carte de l’Afrique',
    },
  },
  en: {
    landing: {
      services: 'Services',
      explore: 'Explore',
      about: 'About Us',
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
      hero: 'Find the right professional',
      heroLine2: 'near you',
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

      wallet: 'Boost your visibility with Matchy Wallet',
      walletSubtitle: 'More visibility. More contacts. More opportunities.',
      walletBody:
        'Matchy Wallet is the integrated digital wallet that gives professionals easy access to additional features designed to increase their visibility on the platform.',
      walletUsage:
        'Use your credits to: boost your profile, appear higher in search results, improve your local visibility, highlight your services, access exclusive features and generate more qualified leads.',

      exploreTitle: 'Discover professionals',
      exploreTitleLine2: 'available around you',
      exploreBody:
        ' Matchy Explore helps you find nearby artisans, freelancers, independent professionals and local service providers.',
      exploreUsage:
        'With geolocation and personalized recommendations, quickly explore relevant profiles and choose the professional who best meets your needs.',
      stepsTitle: 'Find the right professional in three steps',
      stepsSubtitle: 'the steps ..',
      stepsBody:
        'Matchy+ simplifies your search and helps you quickly connect with professionals available near you',

      steps: [
        [
          '1',
          'Explore profiles',
          'Discover a selection of professionals based on your needs, preferences and location.',
        ],
        [
          '2',
          'Choose a profile',
          'Review the skills and services offered, then select the professional who best matches your search',
        ],
        [
          '3',
          'Connect directly',
          'Contact the selected professional, explain your needs and agree on the service details together.',
        ],
      ],

      downloadTitle: 'The professional you need',
      downloadTitleLine2: 'may be closer than you think',
      downloadBody:
        'Join Matchy+ to find local services easily or showcase your skills to new customers.',
      learnMore: 'Learn More',

      downloadBadge: 'Download now',
      getItOn: 'GET IT ON',
      googlePlay: 'Google Play',
      discoverMore: 'Discover more',
      panAfrican: 'The pan-African platform connecting local needs with available professionals.',
      designedFor: 'Designed to bring local talent closer to new opportunities.',
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

      heroImageAlt:
        'Matchy+ app screen showing the profile of a childcare professional available nearby',
      featuresImageAlt:
        'Plumber’s profile in the Matchy+ app with rating, distance, skills and contact options',
      walletImageAlt: 'Matchy Wallet screen showing the balance and actions to boost a profile',
      exploreImageAlt:
        'Map of Africa showing local professionals (driver, nanny, electrician, plumber, gardener) connected to the Matchy+ app',
      ctaImageAlt: 'Collage of African workers and professionals forming the map of Africa',
    },
  },
  ar: {
    landing: {
      services: 'الخدمات',
      explore: 'استكشف',
      about: 'من نحن',
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
      hero: 'اعثر على المهني المناسب',
      heroLine2: 'بالقرب منك',
      intro:
        ' هل تحتاج إلى خدمة موثوقة؟ اكتشف المهنيين المتاحين من حولك، واعثر على الملف الذي يناسب احتياجاتك، وتواصل بسهولة.',
      title: ' اعثر بسهولة أكبر على الخدمة التي تحتاجها',
      body: 'مع Matchy+، يمكن للأفراد والشركات والمهنيين اكتشاف بعضهم بعضاً والتواصل وخلق فرص جديدة من خلال تجربة ربط بسيطة وذكية ومحلية.',

      swipeTitle: 'عثر على مهنيين بالقرب منك',
      swipeText: ' استخدم الموقع الجغرافي لاكتشاف المهنيين المتاحين حولك بسرعة. ',

      growTitle: ' احصل على توصيات مخصصة',
      growText:
        '  استفد من اقتراحات مدعومة بالذكاء الاصطناعي للعثور بسرعة أكبر على الملفات المناسبة لبحثك..',

      nearTitle: 'اكتشف الملفات التي تناسب احتياجاتك',
      nearText: ' استفد من مجموعة مخصصة من المهنيين وفقاً لاحتياجاتك وموقعك وتفضيلاتك.',

      aiTitle: 'توصيات بالذكاء الاصطناعي',
      aiText: 'اقتراحات مخصصة بناءً على احتياجاتك وسجل نشاطك وموقعك الدقيق.',

      wallet: 'عزّز ظهورك مع Matchy Wallet',
      walletSubtitle: ' ظهور أكبر. تواصل أكثر. فرص جديدة.',
      walletBody:
        'Matchy Wallet هي المحفظة الرقمية المدمجة التي تتيح للمهنيين الوصول بسهولة إلى خصائص إضافية تساعدهم على تعزيز ظهورهم داخل المنصة.',
      walletUsage:
        'استخدم رصيدك من أجل: تعزيز ملفك، الظهور في مراتب متقدمة ضمن نتائج البحث، تحسين ظهورك المحلي، إبراز خدماتك، الوصول إلى خصائص حصرية والحصول على فرص تواصل أكثر جودة.',

      exploreTitle: 'اكتشف المهنيين',
      exploreTitleLine2: 'المتاحين من حولك',
      exploreBody:
        ' تساعدك Matchy Explore على العثور على الحرفيين والمستقلين والمهنيين ومقدمي الخدمات القريبين منك.',

      stepsTitle: ' اعثر على المهني المناسب في ثلاث خطوات',
      stepsSubtitle: 'الخطوات ..',
      stepsBody:
        ' تسهّل Matchy+ عملية البحث وتساعدك على التواصل بسرعة مع المهنيين المتاحين بالقرب منك.',

      steps: [
        ['1', 'استكشف الملفات', 'اكتشف مجموعة من المهنيين وفقاً لاحتياجاتك وتفضيلاتك وموقعك.'],
        [
          '2',
          'اختر الملف المناسب',
          'اطلع على المهارات والخدمات المقترحة، ثم اختر المهني الأنسب لبحثك.',
        ],
        [
          '3',
          ' تواصل مباشرة',
          'تواصل مع المهني الذي اخترته، واشرح احتياجاتك، واتفقا معاً على تفاصيل الخدمة.',
        ],
      ],

      downloadTitle: 'قد يكون المهني الذي تبحث عنه',
      downloadTitleLine2: 'أقرب مما تتوقع',
      downloadBody:
        ' انضم إلى Matchy+ للعثور بسهولة على خدمات محلية أو لعرض مهاراتك أمام عملاء جدد.',
      learnMore: 'اعرف أكثر',

      downloadBadge: 'تحميل الآن',
      getItOn: 'تحميل من',
      googlePlay: 'متجر جوجل',
      discoverMore: 'اكتشف المزيد',
      panAfrican: ' المنصة الإفريقية التي تربط الاحتياجات المحلية بالمهنيين المتاحين.',
      designedFor: 'صُممت لتقريب المواهب المحلية من فرص جديدة.',
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

      heroImageAlt: 'شاشة تطبيق Matchy+ تعرض ملف مهنية في رعاية الأطفال متاحة بالقرب منك',
      featuresImageAlt: 'ملف سبّاك في تطبيق Matchy+ يعرض تقييمه والمسافة ومهاراته وطرق التواصل معه',
      walletImageAlt: 'شاشة Matchy Wallet تعرض الرصيد وخيارات تعزيز الملف',
      exploreImageAlt:
        'خريطة إفريقيا تُظهر مهنيين محليين (سائق، مربية أطفال، كهربائي، سبّاك، بستاني) متصلين بتطبيق Matchy+',
      ctaImageAlt: 'صورة مجمّعة لعمال ومهنيين أفارقة تشكّل خريطة إفريقيا',
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
