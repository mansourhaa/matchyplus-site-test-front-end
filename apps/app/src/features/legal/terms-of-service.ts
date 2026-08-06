import type { Locale } from '@/features/i18n/messages';
import type { LegalDocument } from '@/features/legal/types';

export type { LegalDocument, LegalSection } from '@/features/legal/types';

const TITLES = {
  ar: 'شروط الاستخدام',
  en: 'Terms of Service',
  fr: "Conditions générales d'utilisation",
} as const;
const HEADING = {
  ar: 'منصة Matchy+',
  en: 'Matchy+ Platform',
  fr: 'Plateforme Matchy+',
} as const;
const SUBHEADING = {
  ar: 'آخر تحديث: 30 أبريل 2026',
  en: 'Last updated: April 30, 2026',
  fr: 'Dernière mise à jour : 30 avril 2026',
} as const;
const FOOTER = {
  ar: 'للحصول على أي توضيحات بشأن شروط الخدمة، يرجى الاتصال بنا على contact@matchyplus.com',
  en: 'For any clarification regarding terms of service, please contact us at contact@matchyplus.com',
  fr: "Pour toute clarification concernant les conditions d'utilisation, veuillez nous contacter à contact@matchyplus.com",
} as const;

const SECTIONS = [
  {
    title: {
      ar: '1. تقديم المنصة',
      en: '1. Platform Presentation',
      fr: '1. Présentation de la plateforme',
    },
    content: {
      ar: 'Matchy+ هي منصة رقمية يمكن الوصول إليها عبر الويب والتطبيقات الجوال، مخصصة لتسهيل الاتصال المهني بالموقع الجغرافي بين:\n • صاحبي الأعمال والمجندين\n • العاملين بدوام جزئي أو القريبين (مربية أطفال، سائق، عامل حدائق، ميكانيكي، إلخ)\nتقدم المنصة نظام اتصال يعتمد على خوارزميات التوصية والذكاء الاصطناعي، بهدف تسهيل الاتصالات بين المستخدمين.',
      en: 'Matchy+ is a digital platform accessible via web and mobile applications, designed to facilitate geolocated professional matchmaking between:\n • Employers and recruiters\n • Freelance or proximity workers (nanny, driver, gardener, mechanic, etc.)\nThe platform offers a matchmaking system based on recommendation algorithms and artificial intelligence, aimed at facilitating connections between users.',
      fr: "Matchy+ est une plateforme numérique accessible via le web et des applications mobiles, destinée à la mise en relation professionnelle géolocalisée entre :\n • Employeurs et recruteurs\n • Travailleurs indépendants ou de proximité (nounou, chauffeur, jardinier, mécanicien, etc.)\nLa plateforme propose un système de mise en relation basé sur des algorithmes de recommandation et d'intelligence artificielle, visant à faciliter les connexions entre utilisateurs.",
    },
  },
  {
    title: {
      ar: '2. قبول الشروط',
      en: '2. Acceptance of Terms',
      fr: '2. Acceptation des conditions',
    },
    content: {
      ar: 'الوصول والتسجيل واستخدام منصة Matchy+ ينطوي على قبول كامل وبدون تحفظ:\n • من شروط الاستخدام الحالية\n • من سياسة الخصوصية\nأي إنشاء حساب أو استخدام المنصة يعتبر قبولًا بدون شروط لهذه الوثائق.',
      en: 'Access, registration and use of the Matchy+ platform implies full and unconditional acceptance of:\n • These Terms of Service\n • The Privacy Policy\nAny account creation or platform use constitutes unreserved acceptance of these documents.',
      fr: "L'accès, l'inscription et l'utilisation de la plateforme Matchy+ impliquent l'acceptation pleine et entière :\n • Des présentes Conditions Générales d'Utilisation (CGU)\n • De la Politique de Confidentialité\nToute création de compte ou utilisation de la plateforme vaut acceptation sans réserve de ces documents.",
    },
  },
  {
    title: { ar: '3. حسابات المستخدمين', en: '3. User Accounts', fr: '3. Comptes utilisateurs' },
    content: {
      ar: '3.1 شروط الوصول\nلاستخدام المنصة، يتعهد المستخدم بـ:\n • أن يكون عمره 18 سنة على الأقل\n • تقديم معلومات دقيقة وصادقة ومحدثة\n • الحفاظ على سرية بيانات اعتماده\nالمستخدم وحده مسؤول عن استخدام حسابه.\n\n3.2 أنواع الحسابات\nتقدم Matchy+ عدة أنواع من الحسابات:\n • حساب مجاني\n • حساب بريميوم\n • حساب بريميوم+\nيوفر كل نوع حساب الوصول إلى ميزات مختلفة، والتفاصيل معروضة مباشرة على المنصة. قد تتطور هذه الميزات.',
      en: '3.1 Access Requirements\nTo use the platform, the user commits to:\n • Being at least 18 years old\n • Providing accurate, honest and up-to-date information\n • Maintaining confidentiality of login credentials\nThe user is solely responsible for account usage.\n\n3.2 Account Types\nMatchy+ offers several account types:\n • Free Account\n • Premium Account\n • Premium+ Account\nEach account type provides access to distinct features, detailed directly on the platform. These features may evolve.',
      fr: "3.1 Conditions d'accès\nPour utiliser la plateforme, l'utilisateur s'engage à :\n • Être âgé d'au moins 18 ans\n • Fournir des informations exactes, sincères et à jour\n • Maintenir la confidentialité de ses identifiants de connexion\nL'utilisateur est seul responsable de l'utilisation de son compte.\n\n3.2 Types de comptes\nMatchy+ propose plusieurs types de comptes :\n • Compte Gratuit\n • Compte Premium\n • Compte Premium+\nChaque type de compte donne accès à des fonctionnalités distinctes, dont le détail est présenté directement sur la plateforme. Ces fonctionnalités peuvent évoluer.",
    },
  },
  {
    title: {
      ar: '4. وظائف المطابقة والذكاء الاصطناعي',
      en: '4. Matching and AI Functionality',
      fr: "4. Fonctionnement du matching et de l'intelligence artificielle",
    },
    content: {
      ar: 'يستخدم Matchy+ أنظمة آلية، بما في ذلك خوارزميات الذكاء الاصطناعي، لـ:\n • توصية ملفات متوافقة\n • توليد درجة توافق\n • ترتيب الملفات حسب الملاءمة\nدرجة التوافق هي:\n • مؤشرة تماما\n • غير عقدية\n • بدون تأثير قانوني أو قرار\nإنها أداة مساعدة. القرار النهائي حول الاتصال بمستخدم أم لا ينتمي حصريًا للمستخدمين.',
      en: "Matchy+ uses automated systems, including artificial intelligence algorithms, to:\n • Recommend compatible profiles\n • Generate a compatibility score\n • Rank profiles by relevance\nThe compatibility score is:\n • Purely indicative\n • Non-contractual\n • Without legal or decisional effect\nIt's a decision support tool. The final decision to contact or not contact a user is exclusively up to users.",
      fr: "Matchy+ utilise des systèmes automatisés, incluant des algorithmes d'intelligence artificielle, afin de :\n • Recommander des profils compatibles\n • Générer un score de compatibilité\n • Classer les profils selon leur pertinence\nLe score de compatibilité est :\n • Purement indicatif\n • Non contractuel\n • Sans effet juridique ou décisionnel\nIl s'agit d'un outil d'aide. La décision finale de contacter ou non un utilisateur appartient exclusivement aux utilisateurs.",
    },
  },
  {
    title: {
      ar: '5. العروض والاشتراكات والدفع',
      en: '5. Offers, Subscriptions and Payments',
      fr: '5. Offres, abonnements et paiements',
    },
    content: {
      ar: '5.1 المبدأ العام\nتقدم المنصة:\n • عرضًا مجانيًا\n • اشتراكات مدفوعة توفر الوصول إلى ميزات إضافية\nتفاصيل العروض والميزات والأسعار متاحة في أي وقت في التطبيق.\n\n5.2 المدة والتجديد\n • الاشتراكات شهرية\n • يتم تجديدها تلقائيًا\n • يمكن للمستخدم إلغاء اشتراكه في أي وقت من حسابه أو عبر متجر التطبيقات\n • يسري الإلغاء في نهاية الفترة الحالية\n\n5.3 التجارب المجانية\nقد تتضمن بعض العروض فترة تجربة مجانية. في نهاية هذه الفترة:\n • يصبح الاشتراك مدفوعًا تلقائيًا\n • ما لم يتم إلغاؤه قبل انتهاء التجربة\n\n5.4 سياسة الاسترداد\nلا يتم استرجاع أي مبلغ، كليًا أو جزئيًا، إلا في حالة وجود التزام قانوني آخر. الاشتراكات الملغاة تبقى نشطة حتى انتهاء صلاحيتها.',
      en: '5.1 General Principle\nThe platform offers:\n • A free offer\n • Paid subscriptions providing access to additional features\nDetails of offers, features and prices are available at any time in the application.\n\n5.2 Duration and Renewal\n • Subscriptions are monthly\n • They are automatically renewed\n • The user can cancel their subscription at any time from their account or via the app store\n • Cancellation takes effect at the end of the current period\n\n5.3 Free Trials\nSome offers may include a free trial period. At the end of this period:\n • The subscription automatically becomes paid\n • Unless cancelled before the trial ends\n\n5.4 Refund Policy\nNo refund, total or partial, is made except when required by law. Cancelled subscriptions remain active until their expiration date.',
      fr: "5.1 Principe général\nLa plateforme propose :\n • Une offre gratuite\n • Des abonnements payants donnant accès à des fonctionnalités supplémentaires\nLes détails des offres, fonctionnalités et tarifs sont accessibles à tout moment dans l'application.\n\n5.2 Durée et renouvellement\n • Les abonnements sont mensuels\n • Ils sont renouvelés automatiquement\n • L'utilisateur peut annuler son abonnement à tout moment depuis son compte ou via la boutique d'applications concernée\n • La résiliation prend effet à la fin de la période en cours\n\n5.3 Essais gratuits\nCertaines offres peuvent inclure une période d'essai gratuit. À l'issue de cette période :\n • L'abonnement devient automatiquement payant\n • Sauf annulation effectuée avant la fin de l'essai\n\n5.4 Politique de remboursement\nAucun remboursement, total ou partiel, n'est effectué, sauf obligation légale contraire. Les abonnements annulés restent actifs jusqu'à leur échéance.",
    },
  },
  {
    title: {
      ar: '6. المحفظة والأرصدة والنقاط المكافأة',
      en: '6. Wallet, Credits and Bonus Points',
      fr: '6. Portefeuille, crédits DT et points bonus',
    },
    content: {
      ar: 'توفر Matchy+ محفظة افتراضية تسمح بـ:\n • إعادة شحن المبالغ بالدينار التونسي (DT)\n • التحويل حسب السعر المعروض على المنصة (مثال: 1 دينار = 10 نقاط مكافأة)\n\n6.1 النقاط المكافأة\nنقاط المكافأة:\n • قابلة للاستخدام حصريًا على منصة Matchy+\n • لا تمتلك أي قيمة نقدية\n • لا تشكل عملة إلكترونية\n • غير قابلة للتحويل وغير قابلة للاسترجاع',
      en: 'Matchy+ provides a virtual wallet allowing:\n • Recharging amounts in Tunisian dinars (DT)\n • Conversion according to the rate displayed on the platform (e.g., 1 DT = 10 bonus points)\n\n6.1 Bonus Points\nBonus points:\n • Are usable exclusively on the Matchy+ platform\n • Have no monetary value\n • Do not constitute electronic money\n • Are non-transferable and non-refundable',
      fr: "Matchy+ met à disposition un portefeuille virtuel permettant :\n • Le rechargement de montants en dinars tunisiens (DT)\n • La conversion selon le taux affiché sur la plateforme (ex. : 1 DT = 10 points bonus)\n\n6.1 Points bonus\nLes points bonus :\n • Sont utilisables exclusivement sur la plateforme Matchy+\n • N'ont aucune valeur monétaire\n • Ne constituent pas une monnaie électronique\n • Sont non transférables et non remboursables",
    },
  },
  {
    title: { ar: '7. الإجراءات المتميزة', en: '7. Premium Actions', fr: '7. Actions premium' },
    content: {
      ar: 'تسمح نقاط المكافأة بالوصول إلى إجراءات متميزة، بما في ذلك:\n • فتح الملفات\n • تعزيز الرؤية المؤقتة\n • إرسال الاتصالات ذات الأولوية\nتُعرض تكلفة كل إجراء بوضوح في التطبيق.',
      en: 'Bonus points allow access to premium actions, including:\n • Profile unlocking\n • Temporary visibility boost\n • Sending priority connections\nThe cost of each action is clearly displayed in the application.',
      fr: "Les points bonus permettent d'accéder à des actions premium, notamment :\n • Déblocage de profils\n • Boost de visibilité temporaire\n • Envoi de connexions prioritaires\nLe coût de chaque action est affiché clairement dans l'application.",
    },
  },
  {
    title: {
      ar: '8. مسؤولية المنصة',
      en: '8. Platform Responsibility',
      fr: '8. Responsabilité de la plateforme',
    },
    content: {
      ar: 'تعمل Matchy+ فقط كمزود خدمات تقني للاتصال. على هذا النحو:\n • المنصة ليست وكالة توظيف\n • لا تتدخل في العلاقة التعاقدية بين المستخدمين\n • لا تضمن التوظيف أو المهام أو النتائج\n • لا تتدخل في المدفوعات أو النزاعات بين المستخدمين',
      en: 'Matchy+ acts solely as a technical matchmaking service provider. As such:\n • The platform is not a recruitment agency\n • It does not intervene in contractual relationships between users\n • It does not guarantee employment, missions, or results\n • It does not intervene in payments or disputes between users',
      fr: "Matchy+ agit uniquement en tant que prestataire technique de mise en relation. À ce titre :\n • La plateforme n'est pas une agence d'emploi\n • Elle n'intervient pas dans la relation contractuelle entre utilisateurs\n • Elle ne garantit ni embauche, ni mission, ni résultat\n • Elle n'intervient pas dans les paiements ou litiges entre utilisateurs",
    },
  },
  {
    title: {
      ar: '9. إيقاف وحذف الحساب',
      en: '9. Account Suspension and Deletion',
      fr: '9. Suspension et suppression de compte',
    },
    content: {
      ar: 'تحتفظ Matchy+ بالحق في إيقاف أو حذف حساب في حالة:\n • الاحتيال\n • الاستخدام المسيء أو الانحراف\n • انتهاك شروط الاستخدام الحالية\nيترتب على حذف الحساب فقدان نهائي للاشتراكات والأرصدة والنقاط المكافأة غير المستخدمة.',
      en: 'Matchy+ reserves the right to suspend or delete an account in case of:\n • Fraud\n • Abusive or improper use\n • Violation of these Terms of Service\nAccount deletion results in permanent loss of subscriptions, credits and unused bonus points.',
      fr: 'Matchy+ se réserve le droit de suspendre ou supprimer un compte en cas de :\n • Fraude\n • Utilisation abusive ou détournée\n • Violation des présentes CGU\nLa suppression du compte entraîne la perte définitive des abonnements, crédits et points bonus non utilisés.',
    },
  },
  {
    title: { ar: '10. القانون المعمول به', en: '10. Applicable Law', fr: '10. Droit applicable' },
    content: {
      ar: 'تنظم القانون التونسي شروط الاستخدام الحالية.',
      en: 'These Terms of Service are governed by Tunisian law.',
      fr: "Les présentes Conditions Générales d'Utilisation sont régies par le droit tunisien.",
    },
  },
] as const;

export function getTermsOfService(locale: Locale): LegalDocument {
  const lang = locale === 'ar' || locale === 'en' ? locale : 'fr';
  return {
    pageTitle: TITLES[lang],
    heading: HEADING[lang],
    subheading: SUBHEADING[lang],
    footer: FOOTER[lang],
    sections: SECTIONS.map((s) => ({ title: s.title[lang], content: s.content[lang] })),
  };
}
