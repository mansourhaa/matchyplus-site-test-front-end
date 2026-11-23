import type { Locale } from '@/features/i18n/messages';

/**
 * One block of a story section: a paragraph, a stand-out sentence (bold) or a list of short lines
 * shown one under the other.
 */
export type StoryBlock = string | { strong: string } | { lines: string[] };

export type StoryText = {
  /** Small label above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  quote: string;
  name: string;
  role: string;
  discover: string;
  sections: { heading: string; blocks: StoryBlock[] }[];
  nextTitle: string;
  /** The 3 questions of "Écrivez la suite avec nous", each with its button. */
  next: { find: [string, string]; profile: [string, string]; build: [string, string] };
};

/**
 * "Découvrez l'histoire de Matchy+" (/a-propos/histoire-matchy-plus/): the texts of the
 * "Story Matchy" document, in its 3 languages.
 */
export const STORY: Record<Locale, StoryText> = {
  fr: {
    eyebrow: 'Notre histoire',
    title: 'Découvrez l’histoire de Matchy+',
    subtitle: 'Une idée, un premier MVP et une ambition devenue réalité',
    quote:
      '« Derrière chaque besoin, il y a une personne qui cherche une solution. Derrière chaque profil, il y a un talent qui mérite d’être visible. Matchy+ rapproche les deux. »',
    name: 'Randa TOUATI',
    role: 'Cofondatrice de Matchy+',
    discover: 'Découvrir Matchy+',
    sections: [
      {
        heading: 'La première fois que j’ai compris qu’il manquait un lien',
        blocks: [
          'Tout commence souvent par un besoin simple.',
          {
            lines: [
              'Une fuite d’eau à réparer.',
              'Un jardin à entretenir.',
              'Un meuble à fabriquer.',
              'Un trajet à organiser.',
              'Une nounou à trouver.',
              'Une mission à confier à un prestataire.',
            ],
          },
          'Le besoin est réel, parfois urgent. La compétence existe probablement à quelques kilomètres, mais la rencontre entre les deux reste compliquée.',
          'La recherche se disperse entre les contacts personnels, les réseaux sociaux et les recommandations. Les informations sont incomplètes, les disponibilités ne sont pas toujours claires et les compétences restent difficiles à comparer.',
          'Pendant ce temps, des artisans, des prestataires et des experts possèdent un véritable savoir-faire, mais manquent encore de visibilité.',
          'Le problème n’était donc pas l’absence de compétences.',
          { strong: 'Le problème était la difficulté à les découvrir au bon moment.' },
          'C’est à partir de ce constat que l’idée de Matchy+ a commencé à prendre forme.',
        ],
      },
      {
        heading: 'Un premier MVP sans connaissance du code ni de l’outil',
        blocks: [
          'Lorsque j’ai commencé à imaginer Matchy+, je ne possédais pas encore les compétences techniques nécessaires pour développer une application complète.',
          {
            strong:
              'Avec l’aide de l’intelligence artificielle, et sans connaissance du code ni de l’outil, un premier MVP de Matchy+ a vu le jour.',
          },
          'Cette première version m’a permis de donner vie à mon idée, d’imaginer les premiers parcours et de transformer une intuition en une expérience concrète.',
          'Je connaissais le besoin. Je savais que la technologie pouvait créer un lien plus simple, plus rapide et plus humain entre une personne qui cherche une solution et un professionnel capable d’y répondre.',
          'Je n’ai pas attendu de tout maîtriser pour commencer.',
          { strong: 'J’ai commencé pour apprendre, tester et avancer.' },
        ],
      },
      {
        heading: 'L’histoire ne fait que commencer',
        blocks: [
          'Le premier MVP est né grâce à l’intelligence artificielle. Puis, Matchy+ est devenue une aventure collective.',
          'Les stagiaires ont apporté leurs idées et leur énergie dans le design, les tests et le marketing. Les équipes de Dot-IT ont partagé leurs conseils techniques et entrepreneuriaux.',
          'Mon associé, M. Khalil ZAHOUANI, cofondateur de Matchy+ et fondateur de Dot-IT, a accompagné la structuration et l’évolution du projet.',
          'Aujourd’hui, Matchy+ poursuit son développement comme spin-off de Dot-IT, avec sa propre identité, sa mission et une ambition claire :',
          {
            strong:
              'Rendre les compétences locales plus visibles et les opportunités plus accessibles.',
          },
        ],
      },
    ],
    nextTitle: 'Écrivez la suite avec nous',
    next: {
      find: ['Vous recherchez un professionnel ?', 'Trouver un professionnel'],
      profile: ['Vous proposez un service ?', 'Créer mon profil gratuitement'],
      build: ['Vous représentez une entreprise ou un partenaire ?', 'Construire avec Matchy+'],
    },
  },
  en: {
    eyebrow: 'Our story',
    title: 'Discover the Story of Matchy+',
    subtitle: 'An idea, a first MVP and an ambition brought to life',
    quote:
      '“Behind every need is someone looking for a solution. Behind every profile is a talent that deserves to be seen. Matchy+ brings the two together.”',
    name: 'Randa TOUATI',
    role: 'Co-founder of Matchy+',
    discover: 'Discover Matchy+',
    sections: [
      {
        heading: 'The moment I realized a link was missing',
        blocks: [
          'It often starts with a simple need.',
          {
            lines: [
              'A leaking pipe to repair.',
              'A garden to maintain.',
              'A piece of furniture to build.',
              'A journey to organize.',
              'A babysitter to find.',
              'A project to entrust to a service provider.',
            ],
          },
          'The need is real and sometimes urgent. The right professional may already be only a few kilometres away, yet connecting the two sides remains difficult.',
          'The search becomes scattered across personal contacts, social media and recommendations. Information is incomplete, availability is not always clear and skills are difficult to compare.',
          'Meanwhile, craftspeople, service providers and experts have valuable expertise but still lack visibility.',
          'The problem was not a lack of skills.',
          { strong: 'The problem was finding those skills at the right time.' },
          'That realization gave shape to the idea behind Matchy+.',
        ],
      },
      {
        heading: 'A first MVP without knowledge of coding or the tools',
        blocks: [
          'When I started imagining Matchy+, I did not yet have the technical skills required to develop a complete application.',
          {
            strong:
              'With the help of artificial intelligence, and without knowledge of coding or the tools, the first Matchy+ MVP came to life.',
          },
          'This initial version allowed me to bring the idea to life, imagine the first user journeys and turn an intuition into a tangible experience.',
          'I understood the need. I knew technology could create a simpler, faster and more human connection between someone looking for a solution and a professional able to provide it.',
          'I did not wait until I had mastered everything.',
          { strong: 'I started to learn, test and move forward.' },
        ],
      },
      {
        heading: 'The story is only beginning',
        blocks: [
          'The first MVP was created with the help of artificial intelligence. Matchy+ then grew into a collective journey.',
          'Interns contributed their ideas and energy across design, testing and marketing. The Dot-IT teams shared technical and entrepreneurial advice.',
          'My business partner, Mr Khalil ZAHOUANI, co-founder of Matchy+ and founder of Dot-IT, supported the structure and evolution of the project.',
          'Today, Matchy+ continues to grow as a Dot-IT spin-off, with its own identity, mission and a clear ambition:',
          { strong: 'To make local skills more visible and opportunities more accessible.' },
        ],
      },
    ],
    nextTitle: 'Write the next chapter with us',
    next: {
      find: ['Are you looking for a professional?', 'Find a professional'],
      profile: ['Do you offer a service?', 'Create my free profile'],
      build: ['Do you represent a company or a partner?', 'Build with Matchy+'],
    },
  },
  ar: {
    eyebrow: 'قصتنا',
    title: 'اكتشفوا قصة Matchy+\u200E',
    subtitle: 'فكرة، ونموذج أولي، وطموح أصبح حقيقة',
    quote:
      '« وراء كل حاجة شخص يبحث عن حل، ووراء كل ملف مهني موهبة تستحق أن تظهر. Matchy+\u200E تقرّب بينهما. »',
    name: 'راندا التواتي',
    role: 'المؤسسة المشاركة لـ Matchy+\u200E',
    discover: 'اكتشف Matchy+\u200E',
    sections: [
      {
        heading: 'اللحظة التي أدركت فيها أن هناك حلقة مفقودة',
        blocks: [
          'تبدأ الحكاية غالباً بحاجة بسيطة.',
          {
            lines: [
              'تسرّب مياه يحتاج إلى إصلاح.',
              'حديقة تحتاج إلى العناية.',
              'قطعة أثاث تحتاج إلى الصنع.',
              'رحلة تحتاج إلى التنظيم.',
              'جليسة أطفال يجب العثور عليها.',
              'أو مهمة تحتاج إلى مقدم خدمة مناسب.',
            ],
          },
          'الحاجة حقيقية، وأحياناً عاجلة. وقد يكون صاحب المهارة المناسبة على بُعد بضعة كيلومترات فقط، لكن الوصول إليه يبقى صعباً.',
          'يتوزع البحث بين جهات الاتصال الشخصية، وشبكات التواصل الاجتماعي والتوصيات. تكون المعلومات أحياناً غير مكتملة، ولا يكون التوفر واضحاً دائماً، كما يصعب مقارنة المهارات والخدمات.',
          'في المقابل، يمتلك الحرفيون ومقدمو الخدمات والخبراء مهارات حقيقية، لكنهم لا يحظون دائماً بالظهور الذي يستحقونه.',
          'لم تكن المشكلة في غياب المهارات.',
          { strong: 'كانت المشكلة في صعوبة العثور عليها في الوقت المناسب.' },
          'من هذا الواقع، بدأت فكرة Matchy+\u200E تتشكل.',
        ],
      },
      {
        heading: 'نموذج أولي دون معرفة بالبرمجة أو الأدوات',
        blocks: [
          'عندما بدأت أتخيل Matchy+\u200E، لم أكن أمتلك بعد المهارات التقنية اللازمة لتطوير تطبيق متكامل.',
          {
            strong:
              'بمساعدة الذكاء الاصطناعي، ودون معرفة بالبرمجة أو الأدوات، وُلد أول نموذج أولي لـ Matchy+\u200E.',
          },
          'ساعدتني هذه النسخة الأولى على تحويل الفكرة إلى تجربة ملموسة، وتصور المسارات الأولى للمستخدمين.',
          'كنت أفهم الحاجة، وكنت أعلم أن التكنولوجيا قادرة على إنشاء رابط أبسط وأسرع وأكثر إنسانية بين شخص يبحث عن حل ومهني قادر على تقديمه.',
          'لم أنتظر حتى أتقن كل شيء.',
          { strong: 'بدأت لأتعلم، وأختبر، وأتقدم.' },
        ],
      },
      {
        heading: 'القصة ما زالت في بدايتها',
        blocks: [
          'وُلد النموذج الأولي بمساعدة الذكاء الاصطناعي، ثم تحولت Matchy+\u200E إلى مغامرة جماعية.',
          'ساهم المتدربون بأفكارهم وطاقتهم في التصميم والاختبارات والتسويق. كما قدمت فرق Dot-IT نصائحها التقنية والريادية.',
          'وساهم شريكي، السيد خليل الزهواني، المؤسس المشارك لـ Matchy+\u200E ومؤسس Dot-IT، في هيكلة المشروع ودعم تطوره.',
          'واليوم، تواصل Matchy+\u200E تطورها باعتبارها شركة منبثقة عن Dot-IT، بهويتها الخاصة ورسالتها وطموح واضح:',
          { strong: 'جعل المهارات المحلية أكثر ظهوراً والفرص أكثر سهولة في الوصول.' },
        ],
      },
    ],
    nextTitle: 'اكتبوا معنا الفصل القادم',
    next: {
      find: ['هل تبحثون عن مهني؟', 'ابحث عن مهني'],
      profile: ['هل تقدمون خدمة؟', 'أنشئ ملفي مجاناً'],
      build: ['هل تمثلون شركة أو شريكاً؟', 'ابنِ معنا مستقبل Matchy+\u200E'],
    },
  },
};
