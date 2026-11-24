import type { Locale } from '@/features/i18n/messages';

/** A founder's quote, signed with the name (bold) and the role (italic). */
export type StoryQuote = { text: string; name: string; role: string };

/**
 * One block of a story part:
 * - a paragraph, where words between `**` are bold (as in the document);
 * - `{ quote }`: a stand-out sentence, bold, with a bar on its side;
 * - `{ founder }`: a founder's quote, signed.
 */
export type StoryBlock = string | { quote: string } | { founder: StoryQuote };

/** One part of the story; parts are separated by a thin line, as in the document. */
export type StoryPart = { heading?: string; blocks: StoryBlock[] };

export type StoryText = {
  /** Small label above the title. */
  eyebrow: string;
  title: string;
  parts: StoryPart[];
  nextTitle: string;
  /** The 3 questions of "Écrivez la suite avec nous", each with its button. */
  next: { find: [string, string]; profile: [string, string]; build: [string, string] };
};

/**
 * "Découvrez l'histoire de Matchy+" (/a-propos/histoire-matchy-plus/): the texts, order and bold
 * words of the "Story Matchy 3" document (24 Nov 2026), translated for /en/ and /ar/.
 */
export const STORY: Record<Locale, StoryText> = {
  fr: {
    eyebrow: 'Notre histoire',
    title: 'Découvrez l’histoire de Matchy+',
    parts: [
      {
        blocks: [
          {
            founder: {
              text: '« Derrière chaque besoin, il y a une personne qui cherche une solution. Derrière chaque profil, il y a un talent qui mérite d’être visible. Matchy+ rapproche les deux. »',
              name: 'Randa TOUATI',
              role: 'Cofondatrice de Matchy+',
            },
          },
        ],
      },
      {
        blocks: [
          'Tout commence par un constat simple.',
          'Les profils qualifiés et les experts disposent de plateformes, de réseaux et de sites spécialisés pour trouver des opportunités. Pourtant, de nombreux travailleurs exerçant des métiers de proximité, parfois sans diplôme ou qualification formelle, restent peu visibles et rencontrent des difficultés pour entrer en relation avec des employeurs ou des clients.',
          'C’est de cette problématique sociale, liée à l’accès à l’emploi, à la visibilité professionnelle et à l’inclusion financière, qu’est née **Matchy+**.',
          'Grâce à l’intelligence artificielle et à la géolocalisation, Matchy+ propose une application intuitive qui facilite la mise en relation entre les professionnels locaux et les donneurs d’ordre, qu’il s’agisse de particuliers ou d’entreprises.',
          'Aide-ménagère, jardinier, serveur, chauffeur, technicien, agent d’usine, ouvrier textile… Chaque compétence mérite d’être visible et chaque personne doit pouvoir accéder plus facilement aux opportunités proches de chez elle.',
        ],
      },
      {
        blocks: [
          {
            founder: {
              text: '« Créer une application populaire, intuitive, sociale et inclusive. »',
              name: 'Khalil ZAHOUANI',
              role: 'Cofondateur de Matchy+ et fondateur de Dot-IT',
            },
          },
        ],
      },
      {
        heading: 'Une application populaire, sociale et inclusive',
        blocks: [
          'Le besoin est réel, parfois urgent. Le professionnel disponible se trouve probablement à quelques kilomètres, mais la rencontre reste encore compliquée.',
          'La recherche se disperse entre les contacts personnels, les réseaux sociaux et les recommandations. Les informations sont souvent incomplètes, les disponibilités peu claires et les compétences difficiles à comparer.',
          'Pendant ce temps, des artisans, des prestataires et des travailleurs expérimentés possèdent un véritable savoir-faire, mais manquent de visibilité.',
          'Le problème n’est donc pas l’absence de compétences.',
          { quote: 'Le problème est la difficulté à les découvrir au bon moment.' },
          'C’est pour créer ce lien que Matchy+ a vu le jour.',
        ],
      },
      {
        heading: 'L’histoire ne fait que commencer',
        blocks: [
          'Matchy+ est devenue une aventure collective.',
          'Les membres d’équipe ont apporté leurs idées et leur énergie dans le design, les tests et le marketing. Les équipes de **Dot-IT** ont partagé leurs conseils techniques et entrepreneuriaux.',
          'Mon associé, **M. Khalil ZAHOUANI**, cofondateur de Matchy+ et fondateur de Dot-IT, a accompagné la structuration et l’évolution du projet.',
          'Aujourd’hui, Matchy+ poursuit son développement comme **spin-off de Dot-IT**, avec sa propre identité, sa mission et une ambition claire :',
          {
            quote:
              'Rendre les métiers de proximité plus visibles, faciliter l’accès à des opportunités durables et contribuer à une inclusion professionnelle et financière plus accessible.',
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
    parts: [
      {
        blocks: [
          {
            founder: {
              text: '“Behind every need is someone looking for a solution. Behind every profile is a talent that deserves to be seen. Matchy+ brings the two together.”',
              name: 'Randa TOUATI',
              role: 'Co-founder of Matchy+',
            },
          },
        ],
      },
      {
        blocks: [
          'It all starts with a simple observation.',
          'Qualified profiles and experts have platforms, networks and specialised websites to find opportunities. Yet many workers in local trades, sometimes without a diploma or formal qualification, remain hard to find and struggle to connect with employers or clients.',
          'It is from this social problem, linked to access to employment, professional visibility and financial inclusion, that **Matchy+** was born.',
          'Using artificial intelligence and geolocation, Matchy+ offers an intuitive app that makes it easier to connect local professionals with the people who hire them, whether individuals or companies.',
          'Home helper, gardener, waiter, driver, technician, factory worker, textile worker… Every skill deserves to be seen, and everyone should be able to reach opportunities close to home more easily.',
        ],
      },
      {
        blocks: [
          {
            founder: {
              text: '“To create a popular, intuitive, social and inclusive app.”',
              name: 'Khalil ZAHOUANI',
              role: 'Co-founder of Matchy+ and founder of Dot-IT',
            },
          },
        ],
      },
      {
        heading: 'A popular, social and inclusive app',
        blocks: [
          'The need is real, sometimes urgent. An available professional is probably only a few kilometres away, yet meeting them is still complicated.',
          'The search is scattered across personal contacts, social media and recommendations. Information is often incomplete, availability unclear and skills hard to compare.',
          'Meanwhile, craftspeople, service providers and experienced workers have real know-how but lack visibility.',
          'So the problem is not a lack of skills.',
          { quote: 'The problem is finding them at the right time.' },
          'Matchy+ was created to build that link.',
        ],
      },
      {
        heading: 'The story is only beginning',
        blocks: [
          'Matchy+ has become a collective adventure.',
          'Team members brought their ideas and energy to design, testing and marketing. The **Dot-IT** teams shared their technical and entrepreneurial advice.',
          'My business partner, **Mr Khalil ZAHOUANI**, co-founder of Matchy+ and founder of Dot-IT, supported the structuring and growth of the project.',
          'Today, Matchy+ continues to grow as a **Dot-IT spin-off**, with its own identity, its mission and a clear ambition:',
          {
            quote:
              'To make local trades more visible, open the way to lasting opportunities and help make professional and financial inclusion more accessible.',
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
    parts: [
      {
        blocks: [
          {
            founder: {
              text: '« وراء كل حاجة شخص يبحث عن حل، ووراء كل ملف مهني موهبة تستحق أن تظهر. Matchy+\u200E تقرّب بينهما. »',
              name: 'راندا التواتي',
              role: 'المؤسسة المشاركة لـ Matchy+\u200E',
            },
          },
        ],
      },
      {
        blocks: [
          'تبدأ الحكاية بملاحظة بسيطة.',
          'يملك أصحاب الكفاءات والخبراء منصات وشبكات ومواقع متخصصة للعثور على الفرص. في المقابل، يبقى كثير من العاملين في مهن القرب، وأحياناً دون شهادة أو تأهيل رسمي، قليلي الظهور ويجدون صعوبة في التواصل مع أصحاب العمل أو الحرفاء.',
          'من هذه الإشكالية الاجتماعية، المرتبطة بالنفاذ إلى الشغل والظهور المهني والإدماج المالي، وُلدت **Matchy+\u200E**.',
          'بفضل الذكاء الاصطناعي والتحديد الجغرافي، تقدّم Matchy+\u200E تطبيقاً سهل الاستخدام يسهّل التواصل بين المهنيين المحليين وطالبي الخدمات، سواء كانوا أفراداً أو شركات.',
          'معينة منزلية، بستاني، نادل، سائق، تقني، عامل مصنع، عامل نسيج… كل مهارة تستحق أن تظهر، وكل شخص يجب أن يتمكن بسهولة أكبر من الوصول إلى الفرص القريبة منه.',
        ],
      },
      {
        blocks: [
          {
            founder: {
              text: '« إنشاء تطبيق شعبي، سهل الاستخدام، اجتماعي ودامج. »',
              name: 'خليل الزهواني',
              role: 'المؤسس المشارك لـ Matchy+\u200E ومؤسس Dot-IT',
            },
          },
        ],
      },
      {
        heading: 'تطبيق شعبي واجتماعي ودامج',
        blocks: [
          'الحاجة حقيقية، وأحياناً عاجلة. والمهني المتاح يوجد على الأرجح على بُعد بضعة كيلومترات، لكن اللقاء بينهما ما زال معقداً.',
          'يتوزع البحث بين جهات الاتصال الشخصية وشبكات التواصل الاجتماعي والتوصيات. وغالباً ما تكون المعلومات ناقصة، والتوفر غير واضح، والمهارات صعبة المقارنة.',
          'في المقابل، يمتلك الحرفيون ومقدمو الخدمات والعمال ذوو الخبرة مهارات حقيقية، لكنهم يفتقرون إلى الظهور.',
          'إذن، المشكلة ليست في غياب المهارات.',
          { quote: 'المشكلة هي صعوبة العثور عليها في الوقت المناسب.' },
          'ولبناء هذا الرابط وُلدت Matchy+\u200E.',
        ],
      },
      {
        heading: 'القصة ما زالت في بدايتها',
        blocks: [
          'أصبحت Matchy+\u200E مغامرة جماعية.',
          'ساهم أعضاء الفريق بأفكارهم وطاقتهم في التصميم والاختبارات والتسويق. كما قدمت فرق **Dot-IT** نصائحها التقنية والريادية.',
          'وساهم شريكي، **السيد خليل الزهواني**، المؤسس المشارك لـ Matchy+\u200E ومؤسس Dot-IT، في هيكلة المشروع ودعم تطوره.',
          'واليوم، تواصل Matchy+\u200E تطورها باعتبارها **شركة منبثقة عن Dot-IT**، بهويتها الخاصة ورسالتها وطموح واضح:',
          {
            quote:
              'جعل مهن القرب أكثر ظهوراً، وتسهيل الوصول إلى فرص مستدامة، والمساهمة في إدماج مهني ومالي في متناول الجميع.',
          },
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
