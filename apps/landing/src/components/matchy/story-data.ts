import type { Locale } from '@/features/i18n/messages';

/**
 * One block of a story part: a paragraph, a stand-out sentence (bold) or a list of short lines
 * shown one under the other.
 */
export type StoryBlock = string | { strong: string } | { lines: string[] };

/** A founder's quote, signed. */
export type StoryQuote = { text: string; name: string; role: string };

export type StoryText = {
  /** Small label above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  quotes: StoryQuote[];
  discover: string;
  /** The story; a part without a heading is the opening text. */
  sections: { heading?: string; blocks: StoryBlock[] }[];
  nextTitle: string;
  /** The 3 questions of "Écrivez la suite avec nous", each with its button. */
  next: { find: [string, string]; profile: [string, string]; build: [string, string] };
};

/**
 * "Découvrez l'histoire de Matchy+" (/a-propos/histoire-matchy-plus/): the texts of the
 * "Story Matchy 2" document (French, light spelling fixes), translated for /en/ and /ar/.
 */
export const STORY: Record<Locale, StoryText> = {
  fr: {
    eyebrow: 'Notre histoire',
    title: 'Découvrez l’histoire de Matchy+',
    subtitle: 'Une application populaire, sociale et inclusive',
    quotes: [
      {
        text: '« Derrière chaque besoin, il y a une personne qui cherche une solution. Derrière chaque profil, il y a un talent qui mérite d’être visible. Matchy+ rapproche les deux. »',
        name: 'Randa TOUATI',
        role: 'Cofondatrice de Matchy+',
      },
      {
        text: '« Créer une application populaire, intuitive, sociale et inclusive. »',
        name: 'Khalil ZAHOUANI',
        role: 'Cofondateur de Matchy+',
      },
    ],
    discover: 'Découvrir Matchy+',
    sections: [
      {
        blocks: [
          'Tout commence par un constat simple : les compétences et les experts ont leurs sites et leurs lieux pour trouver un emploi, mais les personnes précaires sans compétences spécifiques, qui représentent une bonne partie de la population employable, n’ont aucun moyen de se mettre en relation avec des employeurs.',
          'D’où le besoin de résoudre une problématique sociale d’accès à l’emploi et à l’inclusion financière.',
          'De ce fait, Matchy+, grâce à l’IA et à la géolocalisation intégrée, offre une application très intuitive pour la mise en relation professionnelle des métiers précaires et des donneurs d’ordres (particuliers ou entreprises) :',
          'Aide-ménagère, jardinier, serveur, chauffeur, technicien, agent d’usine, ouvrier textile, etc.',
          'Le besoin est réel, parfois urgent. La disponibilité existe probablement à quelques kilomètres, mais la rencontre entre les deux reste compliquée.',
          'La recherche se disperse entre les contacts personnels, les réseaux sociaux et les recommandations. Les informations sont incomplètes, les disponibilités ne sont pas toujours claires et les compétences restent invisibles.',
          'Pendant ce temps, des artisans, des prestataires et des experts possèdent un véritable savoir-faire, mais manquent encore de visibilité.',
          'Le problème n’était donc pas l’absence de compétences.',
          { strong: 'Le problème était la difficulté à les découvrir au bon moment.' },
          'C’est à partir de ce constat que l’idée de Matchy+ a commencé à prendre forme.',
          { strong: 'Une application populaire, sociale et inclusive.' },
        ],
      },
      {
        heading: 'L’histoire ne fait que commencer',
        blocks: [
          'Matchy+ est devenue une aventure collective.',
          'Les membres de l’équipe ont apporté leurs idées et leur énergie dans le design, les tests et le marketing. Les équipes de Dot-IT ont partagé leurs conseils techniques et entrepreneuriaux.',
          'Mon associé, M. Khalil ZAHOUANI, cofondateur de Matchy+ et fondateur de Dot-IT, a accompagné la structuration et l’évolution du projet.',
          'Aujourd’hui, Matchy+ poursuit son développement comme spin-off de Dot-IT, avec sa propre identité, sa mission et une ambition claire :',
          {
            strong:
              'Rendre l’emploi précaire durable et inclusif, et les opportunités beaucoup plus visibles et accessibles.',
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
    subtitle: 'A popular, social and inclusive app',
    quotes: [
      {
        text: '“Behind every need is someone looking for a solution. Behind every profile is a talent that deserves to be seen. Matchy+ brings the two together.”',
        name: 'Randa TOUATI',
        role: 'Co-founder of Matchy+',
      },
      {
        text: '“To create a popular, intuitive, social and inclusive app.”',
        name: 'Khalil ZAHOUANI',
        role: 'Co-founder of Matchy+',
      },
    ],
    discover: 'Discover Matchy+',
    sections: [
      {
        blocks: [
          'It all starts with a simple observation: skilled people and experts have their own websites and places to find work, but people in precarious situations without specific skills, who make up a large part of the employable population, have no way to connect with employers.',
          'Hence the need to solve a social problem: access to employment and financial inclusion.',
          'That is why Matchy+, with AI and built-in geolocation, offers a very intuitive app that connects precarious jobs with the people who need them (individuals or companies):',
          'Home helpers, gardeners, waiters, drivers, technicians, factory workers, textile workers and more.',
          'The need is real and sometimes urgent. Someone available is probably only a few kilometres away, yet bringing the two together remains difficult.',
          'The search becomes scattered across personal contacts, social media and recommendations. Information is incomplete, availability is not always clear and skills remain invisible.',
          'Meanwhile, craftspeople, service providers and experts have real know-how but still lack visibility.',
          'The problem was not a lack of skills.',
          { strong: 'The problem was finding them at the right time.' },
          'That observation is where the idea of Matchy+ began to take shape.',
          { strong: 'A popular, social and inclusive app.' },
        ],
      },
      {
        heading: 'The story is only beginning',
        blocks: [
          'Matchy+ has become a collective journey.',
          'Team members brought their ideas and energy to design, testing and marketing. The Dot-IT teams shared technical and entrepreneurial advice.',
          'My business partner, Mr Khalil ZAHOUANI, co-founder of Matchy+ and founder of Dot-IT, supported the structure and evolution of the project.',
          'Today, Matchy+ continues to grow as a Dot-IT spin-off, with its own identity, mission and a clear ambition:',
          {
            strong:
              'To make precarious work lasting and inclusive, and opportunities far more visible and accessible.',
          },
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
    subtitle: 'تطبيق شعبي واجتماعي ودامج',
    quotes: [
      {
        text: '« وراء كل حاجة شخص يبحث عن حل، ووراء كل ملف مهني موهبة تستحق أن تظهر. Matchy+\u200E تقرّب بينهما. »',
        name: 'راندا التواتي',
        role: 'المؤسسة المشاركة لـ Matchy+\u200E',
      },
      {
        text: '« إنشاء تطبيق شعبي، سهل الاستخدام، اجتماعي ودامج. »',
        name: 'خليل الزهواني',
        role: 'المؤسس المشارك لـ Matchy+\u200E',
      },
    ],
    discover: 'اكتشف Matchy+\u200E',
    sections: [
      {
        blocks: [
          'تبدأ الحكاية بملاحظة بسيطة: أصحاب المهارات والخبراء لديهم مواقعهم وأماكنهم للعثور على عمل، أما الأشخاص في وضعيات هشة ودون مهارات محددة، وهم يمثلون جزءاً كبيراً من الفئة القادرة على العمل، فلا يملكون أي وسيلة للتواصل مع أصحاب العمل.',
          'ومن هنا جاءت الحاجة إلى حل إشكالية اجتماعية تتعلق بالنفاذ إلى الشغل وبالإدماج المالي.',
          'لذلك تقدّم Matchy+\u200E، بفضل الذكاء الاصطناعي والتحديد الجغرافي المدمج، تطبيقاً سهل الاستخدام جداً يربط بين أصحاب المهن الهشة وطالبي الخدمات (أفراداً أو شركات):',
          'معينة منزلية، بستاني، نادل، سائق، تقني، عامل مصنع، عامل نسيج، وغيرها.',
          'الحاجة حقيقية، وأحياناً عاجلة. وقد يكون الشخص المتاح على بُعد بضعة كيلومترات فقط، لكن اللقاء بين الطرفين يبقى صعباً.',
          'يتوزع البحث بين جهات الاتصال الشخصية وشبكات التواصل الاجتماعي والتوصيات. تكون المعلومات غير مكتملة، ولا يكون التوفر واضحاً دائماً، وتبقى المهارات غير مرئية.',
          'في المقابل، يمتلك الحرفيون ومقدمو الخدمات والخبراء مهارات حقيقية، لكنهم ما زالوا يفتقرون إلى الظهور.',
          'لم تكن المشكلة في غياب المهارات.',
          { strong: 'كانت المشكلة في صعوبة العثور عليها في الوقت المناسب.' },
          'من هذه الملاحظة بدأت فكرة Matchy+\u200E تتشكل.',
          { strong: 'تطبيق شعبي واجتماعي ودامج.' },
        ],
      },
      {
        heading: 'القصة ما زالت في بدايتها',
        blocks: [
          'أصبحت Matchy+\u200E مغامرة جماعية.',
          'ساهم أعضاء الفريق بأفكارهم وطاقتهم في التصميم والاختبارات والتسويق. كما قدمت فرق Dot-IT نصائحها التقنية والريادية.',
          'وساهم شريكي، السيد خليل الزهواني، المؤسس المشارك لـ Matchy+\u200E ومؤسس Dot-IT، في هيكلة المشروع ودعم تطوره.',
          'واليوم، تواصل Matchy+\u200E تطورها باعتبارها شركة منبثقة عن Dot-IT، بهويتها الخاصة ورسالتها وطموح واضح:',
          { strong: 'جعل العمل الهش مستداماً ودامجاً، والفرص أكثر ظهوراً وسهولة في الوصول.' },
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
