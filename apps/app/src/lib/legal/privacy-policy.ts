import type { LegalDocument, LegalLocale } from './types';

export type { LegalDocument, LegalSection, LegalLocale } from './types';

const TITLES = {
  ar: 'سياسة الخصوصية',
  en: 'Privacy Policy',
  fr: 'Politique de confidentialité',
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
  ar: 'لأي استفسارات بشأن الخصوصية، يرجى الاتصال بنا على Contact@matchyplus.com',
  en: 'For any privacy inquiries, please contact us at Contact@matchyplus.com',
  fr: 'Pour toute question relative à la confidentialité, veuillez nous contacter à Contact@matchyplus.com',
} as const;

const SECTIONS = [
  {
    title: { ar: '1. البيانات المجمعة', en: '1. Data Collected', fr: '1. Données collectées' },
    content: {
      ar: 'يجمع Matchy+ فقط البيانات الضرورية لتشغيل المنصة، بما في ذلك:\n • بيانات الهوية وجهات الاتصال\n • البيانات المهنية وبيانات الملف الشخصي\n • بيانات الموقع (إن تم التصريح بها)\n • البيانات التقنية وبيانات التصفح\n • بيانات المعاملات (الاشتراكات وإعادة الشحن والنقاط)',
      en: 'Matchy+ collects only the data necessary for platform operation, including:\n • Identification and contact data\n • Professional and profile data\n • Location data (if authorized)\n • Technical and navigation data\n • Transaction data (subscriptions, recharges, points)',
      fr: "Matchy+ collecte uniquement les données nécessaires au fonctionnement de la plateforme, notamment :\n • Données d'identification et de contact\n • Données professionnelles et de profil\n • Données de localisation (si autorisée)\n • Données techniques et de navigation\n • Données transactionnelles (abonnements, recharges, points)",
    },
  },
  {
    title: { ar: '2. بيانات الدفع', en: '2. Payment Data', fr: '2. Données de paiement' },
    content: {
      ar: 'يتم معالجة المدفوعات من خلال موفري دفع آمنين. لا يقوم Matchy+ بـ:\n • تخزين أي بيانات بنكية كاملة\n • الاحتفاظ إلا بالمعلومات اللازمة لإدارة الاشتراكات والمعاملات',
      en: 'Payments are processed by secure payment providers. Matchy+:\n • Does not store any complete banking data\n • Only retains information necessary for subscription and transaction management',
      fr: 'Les paiements sont traités par des prestataires de paiement sécurisés. Matchy+ :\n • Ne stocke aucune donnée bancaire complète\n • Ne conserve que les informations nécessaires à la gestion des abonnements et transactions',
    },
  },
  {
    title: { ar: '3. استخدام البيانات', en: '3. Data Usage', fr: '3. Utilisation des données' },
    content: {
      ar: 'يتم استخدام البيانات لـ:\n • تسهيل التوصيل والمطابقة الذكية\n • إدارة الاشتراكات والمحفظة والإجراءات المميزة\n • الأمان ومنع الاحتيال\n • تحسين الخدمات وتجربة المستخدم',
      en: 'Data is used for:\n • Facilitating matchmaking and intelligent matching\n • Managing subscriptions, wallet and premium actions\n • Security and fraud prevention\n • Improving services and user experience',
      fr: "Les données sont utilisées pour :\n • La mise en relation et le matching intelligent\n • La gestion des abonnements, portefeuille et actions premium\n • La sécurité et la prévention de la fraude\n • L'amélioration des services et de l'expérience utilisateur",
    },
  },
  {
    title: {
      ar: '4. الذكاء الاصطناعي والتوصيات',
      en: '4. Artificial Intelligence and Recommendations',
      fr: '4. Intelligence artificielle et recommandations',
    },
    content: {
      ar: 'قد يتم معالجة بعض البيانات غير الحساسة بطريقة آلية لـ:\n • توليد توصيات مخصصة\n • حساب درجات التوافق\nهذه العمليات:\n • لا تترتب عليها آثار قانونية ملزمة\n • لا تنطوي على أي قرار مؤتمت يؤثر على حقوق المستخدمين',
      en: 'Some non-sensitive data may be processed automatically to:\n • Generate personalized recommendations\n • Calculate compatibility scores\nThese processes:\n • Have no binding legal effect\n • Do not involve any automated decision impacting user rights',
      fr: "Certaines données non sensibles peuvent être traitées de manière automatisée afin de :\n • Générer des recommandations personnalisées\n • Calculer des scores de compatibilité\nCes traitements :\n • N'ont aucun effet juridique contraignant\n • N'impliquent aucune décision automatisée impactant les droits des utilisateurs",
    },
  },
  {
    title: { ar: '5. مشاركة البيانات', en: '5. Data Sharing', fr: '5. Partage des données' },
    content: {
      ar: 'قد يتم مشاركة البيانات فقط مع:\n • المستخدمين الآخرين في إطار التوصيل\n • موفري الخدمات التقنية الضروريين للتشغيل\n • السلطات القانونية عند التزام تنظيمي\nلا يتم بيع أي بيانات شخصية لأطراف ثالثة.',
      en: 'Data may be shared only with:\n • Other users within the context of matchmaking\n • Technical providers necessary for operation\n • Legal authorities upon regulatory obligation\nNo personal data is sold to third parties.',
      fr: "Les données peuvent être partagées uniquement avec :\n • Les autres utilisateurs dans le cadre de la mise en relation\n • Les prestataires techniques nécessaires au fonctionnement\n • Les autorités légales sur obligation réglementaire\nAucune donnée personnelle n'est vendue à des tiers.",
    },
  },
  {
    title: {
      ar: '6. الاحتفاظ بالبيانات',
      en: '6. Data Retention',
      fr: '6. Conservation des données',
    },
    content: {
      ar: '• يتم الاحتفاظ بالبيانات طالما كان الحساب نشطًا\n • يتم حذفها أو إخفاء هويتها بعد حذف الحساب\n • قد يتم الاحتفاظ ببعض البيانات لالتزامات قانونية',
      en: '• Data is retained as long as the account is active\n • It is deleted or anonymized after account deletion\n • Some data may be retained for legal obligations',
      fr: '• Les données sont conservées tant que le compte est actif\n • Elles sont supprimées ou anonymisées après suppression du compte\n • Certaines données peuvent être conservées pour des obligations légales',
    },
  },
  {
    title: { ar: '7. حقوق المستخدمين', en: '7. User Rights', fr: '7. Droits des utilisateurs' },
    content: {
      ar: 'كل مستخدم له الحقوق التالية:\n • حق الوصول\n • حق التصحيح\n • حق الحذف\n • حق الاعتراض\nيمكن توجيه أي طلب إلى: Contact@matchyplus.com',
      en: 'Each user has the following rights:\n • Right of access\n • Right of rectification\n • Right of deletion\n • Right of objection\nAny request can be submitted to: Contact@matchyplus.com',
      fr: "Chaque utilisateur dispose des droits suivants :\n • Droit d'accès\n • Droit de rectification\n • Droit de suppression\n • Droit d'opposition\nToute demande peut être adressée à : Contact@matchyplus.com",
    },
  },
  {
    title: { ar: '8. الأمان', en: '8. Security', fr: '8. Sécurité' },
    content: {
      ar: 'يطبق Matchy+ تدابير تقنية وتنظيمية مناسبة لحماية البيانات الشخصية من أي وصول غير مصرح به أو فقدان أو إفصاح.',
      en: 'Matchy+ implements appropriate technical and organizational measures to protect personal data against any unauthorized access, loss or disclosure.',
      fr: 'Matchy+ met en œuvre des mesures techniques et organisationnelles appropriées afin de protéger les données personnelles contre tout accès non autorisé, perte ou divulgation.',
    },
  },
  {
    title: {
      ar: '9. تعديل السياسة',
      en: '9. Policy Modifications',
      fr: '9. Modification de la politique',
    },
    content: {
      ar: 'يمكن تعديل هذه السياسة في أي وقت. سيتم إخطار المستخدمين عبر المنصة.',
      en: 'This policy may be modified at any time. Users will be informed via the platform.',
      fr: 'La présente politique peut être modifiée à tout moment. Les utilisateurs seront informés via la plateforme.',
    },
  },
] as const;

export function getPrivacyPolicy(locale: LegalLocale): LegalDocument {
  const lang = locale === 'ar' || locale === 'en' ? locale : 'fr';
  return {
    pageTitle: TITLES[lang],
    heading: HEADING[lang],
    subheading: SUBHEADING[lang],
    footer: FOOTER[lang],
    sections: SECTIONS.map((s) => ({ title: s.title[lang], content: s.content[lang] })),
  };
}
