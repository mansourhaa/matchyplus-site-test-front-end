import type { Locale } from '@/features/i18n/messages';

import { numberLocale } from './community-map';

/** One part of an article: its heading, then its paragraph. */
export type PressSection = { heading: string; text: string };

/** The texts of one news item in one language. */
export type PressText = {
  /** Small label on the card: "Média", "Programme"… */
  tag: string;
  title: string;
  /** Shown with a pin on the card: a city, a channel or a region. */
  place: string;
  /** One or two sentences: the card on "all news", the meta description and social previews. */
  summary: string;
  /** The opening paragraph of the article, before the first heading. */
  intro: string;
  sections: PressSection[];
  /** Describes the cover image (when there is one). */
  coverAlt?: string;
};

/**
 * One Matchy+ Press item. To publish one: copy an entry, give it a new `slug` (its URL), the
 * date, the texts in the 3 languages, and optionally a cover image (in `public/matchy/press/`,
 * about 1200 × 800 px, .webp), a YouTube link and source links.
 */
export type PressItem = {
  /** URL name: /fr/actualites/<slug>/. Lowercase letters, numbers and dashes only. */
  slug: string;
  /**
   * Publication date: YYYY-MM-DD, or YYYY-MM / YYYY when only the month or the year is confirmed
   * (shown as "juin 2026" or "2026", never with an invented day).
   */
  date: string;
  /** Optional cover, e.g. '/matchy/press/salon-2026.webp'. Without it the card shows a brand gradient. */
  cover?: string;
  /** Optional YouTube link (watch, youtu.be or shorts link): the article shows the video. */
  video?: string;
  /** Optional link to the original LinkedIn post (the source; not shown on the site since 24 Nov 2026). */
  linkedin?: string;
  /** Optional official page: programme, show… (the source; not shown on the site since 24 Nov 2026). */
  website?: string;
  /** Example content: labelled on the site and kept out of Google. */
  sample: boolean;
  text: Record<Locale, PressText>;
};

/**
 * Texts: "Articles storytelling V4" from Matchy+ (French), translated for /en/ and /ar/.
 * Dates confirmed by Matchy+ on 24 Nov 2026; an unconfirmed date is written as the year only. Every article ends with
 * the same 3 buttons: find a professional, create a free profile, propose a collaboration.
 */
export const PRESS_ITEMS: PressItem[] = [
  {
    slug: 'matchy-plus-al-wataniya-1-jil-al-mostakbal',
    date: '2026-11-22',
    cover: '/matchy/press/al-wataniya-1-plateau-v2.webp',
    // the video on the Matchy+ YouTube channel (25 Nov 2026)
    video: 'https://www.youtube.com/watch?v=lsoz7VXc5ok',
    linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7526032162060521472/',
    sample: false,
    text: {
      fr: {
        tag: 'Média',
        title:
          'Matchy+ sur Al Wataniya 1 : quand l’innovation rapproche les talents des opportunités',
        place: 'Al Wataniya 1',
        summary:
          'Dans l’émission « جيل المستقبل », Matchy+ a partagé une conviction : la technologie peut rapprocher les besoins, les compétences et les opportunités.',
        intro:
          'Il y a des moments qui donnent une voix plus forte à une idée. Le passage de Matchy+ dans l’émission « جيل المستقبل » sur Al Wataniya 1 en fait partie. Sur le plateau, une conviction a guidé l’échange : la technologie peut devenir un véritable trait d’union entre les personnes qui cherchent un service, les professionnels qui veulent faire connaître leur savoir-faire et les entreprises qui recherchent les bonnes compétences.',
        sections: [
          {
            heading: 'Une idée née d’un besoin très humain',
            text: 'Trouver la bonne personne au bon moment ne devrait pas être un parcours compliqué. Pourtant, lorsqu’un besoin apparaît, une fuite d’eau, un jardin à entretenir, un trajet à organiser, une garde d’enfants ou une mission professionnelle, la recherche se disperse souvent entre recommandations, groupes sociaux et contacts personnels. Matchy+ part de cette réalité quotidienne pour proposer une expérience plus simple, plus locale et plus directe.',
          },
          {
            heading: 'La technologie comme point de rencontre',
            text: 'Au cœur de la vision Matchy+, la technologie n’efface pas le lien humain. Elle aide à le créer. Grâce à la recherche par service et localisation, ainsi qu’à une approche de matching assistée par l’intelligence artificielle, la plateforme vise à rapprocher un besoin précis d’un professionnel pertinent. Chaque recherche peut alors devenir une rencontre utile, et chaque compétence locale une opportunité visible.',
          },
          {
            heading: 'Rendre les compétences locales plus visibles',
            text: 'Derrière chaque profil, il y a un savoir-faire, une expérience et une volonté de travailler. Matchy+ souhaite donner à ces compétences un espace pour être découvertes par les particuliers comme par les entreprises. Plombiers, jardiniers, menuisiers, chauffeurs, spécialistes du ménage, de la garde d’enfants ou des services digitaux peuvent y présenter leur activité et leur zone d’intervention.',
          },
          {
            heading: 'Une ambition qui se partage',
            text: 'Cette présence sur Al Wataniya 1 représente plus qu’un passage média. Elle confirme la place de Matchy+ dans les conversations sur l’entrepreneuriat, l’intelligence artificielle et l’avenir des services locaux en Tunisie. Elle renforce aussi une ambition : construire une plateforme accessible, utile et capable de créer davantage de connexions entre besoins et compétences.',
          },
          {
            heading: 'Et maintenant ?',
            text: 'L’aventure continue, avec la même énergie : aider chacun à trouver le bon professionnel et permettre à davantage de talents locaux d’être vus, contactés et choisis.',
          },
        ],
        coverAlt:
          'Plateau télévisé de l’émission « جيل المستقبل » sur Al Wataniya 1 autour de la technologie et du travail',
      },
      en: {
        tag: 'Media',
        title: 'Matchy+ on Al Wataniya 1: when innovation brings talent closer to opportunities',
        place: 'Al Wataniya 1',
        summary:
          'On the show “جيل المستقبل”, Matchy+ shared a conviction: technology can bring needs, skills and opportunities closer together.',
        intro:
          'Some moments give an idea a stronger voice. Matchy+’s appearance on the show “جيل المستقبل” on Al Wataniya 1 was one of them. On set, one conviction guided the conversation: technology can become a real bridge between people looking for a service, professionals who want their know-how to be known, and businesses looking for the right skills.',
        sections: [
          {
            heading: 'An idea born from a very human need',
            text: 'Finding the right person at the right time should not be complicated. Yet when a need comes up, a water leak, a garden to look after, a trip to organise, childcare or a professional assignment, the search is often scattered between recommendations, social groups and personal contacts. Matchy+ starts from this everyday reality to offer a simpler, more local and more direct experience.',
          },
          {
            heading: 'Technology as a meeting point',
            text: 'At the heart of the Matchy+ vision, technology does not erase the human connection. It helps create it. With search by service and location, and an AI-assisted matching approach, the platform aims to bring a precise need together with a relevant professional. Every search can then become a useful encounter, and every local skill a visible opportunity.',
          },
          {
            heading: 'Making local skills more visible',
            text: 'Behind every profile there is know-how, experience and a will to work. Matchy+ wants to give these skills a space where individuals and businesses alike can discover them. Plumbers, gardeners, carpenters, drivers, and cleaning, childcare or digital specialists can present their business and their service area there.',
          },
          {
            heading: 'An ambition worth sharing',
            text: 'This appearance on Al Wataniya 1 is more than a media moment. It confirms Matchy+’s place in conversations about entrepreneurship, artificial intelligence and the future of local services in Tunisia. It also strengthens an ambition: to build a platform that is accessible, useful and able to create more connections between needs and skills.',
          },
          {
            heading: 'What’s next?',
            text: 'The adventure goes on, with the same energy: helping everyone find the right professional, and letting more local talent be seen, contacted and chosen.',
          },
        ],
        coverAlt: 'TV set of the show “جيل المستقبل” on Al Wataniya 1, about technology and work',
      },
      ar: {
        tag: 'إعلام',
        title: 'Matchy+\u200E على الوطنية الأولى: حين يقرّب الابتكار المواهب من الفرص',
        place: 'الوطنية الأولى',
        summary:
          'في برنامج «جيل المستقبل»، شاركت Matchy+\u200E قناعة راسخة: يمكن للتكنولوجيا أن تقرّب بين الاحتياجات والكفاءات والفرص.',
        intro:
          'هناك لحظات تمنح الفكرة صوتًا أقوى، وكان حضور Matchy+\u200E في برنامج «جيل المستقبل» على الوطنية الأولى واحدًا منها. على البلاتو، قادت قناعة واحدة الحوار: يمكن للتكنولوجيا أن تصبح جسرًا حقيقيًا بين من يبحث عن خدمة، والمهنيين الذين يريدون التعريف بمهاراتهم، والشركات التي تبحث عن الكفاءات المناسبة.',
        sections: [
          {
            heading: 'فكرة وُلدت من حاجة إنسانية',
            text: 'لا ينبغي أن يكون العثور على الشخص المناسب في الوقت المناسب أمرًا معقدًا. ومع ذلك، عندما تظهر حاجة ما، تسرّب مياه أو حديقة تحتاج إلى عناية أو تنقّل يجب تنظيمه أو رعاية أطفال أو مهمة مهنية، يتشتت البحث غالبًا بين التوصيات والمجموعات الاجتماعية والمعارف الشخصية. تنطلق Matchy+\u200E من هذا الواقع اليومي لتقدّم تجربة أبسط وأقرب وأكثر مباشرة.',
          },
          {
            heading: 'التكنولوجيا نقطة التقاء',
            text: 'في قلب رؤية Matchy+\u200E، لا تمحو التكنولوجيا الرابط الإنساني بل تساعد على خلقه. بفضل البحث حسب الخدمة والموقع، ومقاربة ربط يدعمها الذكاء الاصطناعي، تسعى المنصة إلى تقريب حاجة محددة من مهني مناسب. فيصبح كل بحث لقاءً مفيدًا، وكل كفاءة محلية فرصة مرئية.',
          },
          {
            heading: 'إبراز الكفاءات المحلية',
            text: 'وراء كل ملف مهارة وخبرة وإرادة للعمل. تريد Matchy+\u200E أن تمنح هذه الكفاءات فضاءً يكتشفها فيه الأفراد والشركات على حد سواء. يمكن للسبّاكين والبستانيين والنجارين والسائقين ومختصي التنظيف ورعاية الأطفال والخدمات الرقمية أن يعرضوا فيه نشاطهم ومنطقة عملهم.',
          },
          {
            heading: 'طموح نتقاسمه',
            text: 'يمثّل هذا الحضور على الوطنية الأولى أكثر من ظهور إعلامي. فهو يؤكد مكانة Matchy+\u200E في النقاشات حول ريادة الأعمال والذكاء الاصطناعي ومستقبل الخدمات المحلية في تونس، ويعزّز طموحًا واضحًا: بناء منصة متاحة ومفيدة وقادرة على خلق مزيد من الروابط بين الاحتياجات والكفاءات.',
          },
          {
            heading: 'وماذا بعد؟',
            text: 'تتواصل المغامرة بالحماس نفسه: مساعدة الجميع على العثور على المهني المناسب، وتمكين مزيد من المواهب المحلية من أن تُرى ويُتواصل معها وتُختار.',
          },
        ],
        coverAlt: 'بلاتو برنامج «جيل المستقبل» على الوطنية الأولى حول التكنولوجيا والعمل',
      },
    },
  },
  {
    slug: 'matchy-plus-afrique-innovante-2026',
    date: '2026-05-29',
    cover: '/matchy/press/afrique-innovante-2026-randa-touati.webp',
    website:
      'https://cpccaf.org/programme-et-appel-a-projet/appel-a-candidatures-2026-afrique-innovante-recrute-500-projets-feminins-a-fort-potentiel/',
    sample: false,
    text: {
      fr: {
        tag: 'Programme',
        title: 'Afrique Innovante 2026 : Matchy+ porte plus loin la voix des compétences locales',
        place: 'Afrique',
        summary:
          'La participation de Matchy+ à Afrique Innovante 2026 inscrit une solution née en Tunisie dans une dynamique panafricaine portée par des projets féminins à fort potentiel.',
        intro:
          'Certaines étapes ouvrent un nouveau chapitre. La participation de Matchy+ à Afrique Innovante 2026 en est une. Elle inscrit une solution née en Tunisie dans une dynamique plus large, portée par des projets féminins à fort potentiel et par une ambition commune : transformer des idées ancrées dans le réel en solutions capables de grandir et de créer de l’impact.',
        sections: [
          {
            heading: 'Partir du local pour penser plus grand',
            text: 'Matchy+ s’est construit autour d’un constat simple : de nombreuses compétences restent encore difficiles à découvrir, alors que les besoins sont là, chaque jour. En facilitant la mise en relation entre particuliers, entreprises et professionnels locaux, la plateforme veut rendre la recherche plus fluide et le savoir-faire plus visible. Afrique Innovante offre un cadre pour approfondir cette vision et réfléchir à son adaptation à d’autres marchés africains.',
          },
          {
            heading: 'Une ambition africaine, des réalités multiples',
            text: 'L’Afrique ne constitue pas un seul marché. Chaque territoire possède ses langues, ses usages numériques, ses besoins de proximité et ses propres mécanismes de confiance. Pour Matchy+, grandir signifie donc écouter, apprendre et adapter l’expérience. La recherche d’un professionnel doit rester simple, pertinente et accessible, qu’il s’agisse de services à domicile, de transport, de maintenance, d’événementiel ou de prestations pour les entreprises.',
          },
          {
            heading: 'Faire grandir les opportunités avec les talents',
            text: 'L’ambition de Matchy+ ne se limite pas à connecter une demande et une offre. La plateforme veut contribuer à une économie de proximité où les artisans, prestataires, indépendants et petites entreprises peuvent mieux présenter leur activité, toucher de nouveaux clients et développer leur réputation numérique.',
          },
          {
            heading: 'Un appel aux écosystèmes',
            text: 'Cette étape est aussi une invitation adressée aux incubateurs, entreprises, réseaux, structures de formation et partenaires qui partagent la même volonté : soutenir l’innovation, la visibilité des compétences et l’inclusion économique. Les collaborations peuvent prendre la forme de pilotes locaux, de programmes d’accompagnement, de partenariats sectoriels ou d’expérimentations territoriales.',
          },
          {
            heading: 'Et maintenant ?',
            text: 'Avec Afrique Innovante 2026, Matchy+ avance avec enthousiasme vers une ambition plus large, sans perdre son point de départ : les besoins réels, les talents locaux et les connexions qui peuvent changer un quotidien ou ouvrir une nouvelle opportunité.',
          },
        ],
        coverAlt:
          'Randa Touati, cofondatrice de Matchy+, présentée pour la Tunisie au programme Afrique Innovante 2026',
      },
      en: {
        tag: 'Programme',
        title: 'Afrique Innovante 2026: Matchy+ carries the voice of local skills further',
        place: 'Africa',
        summary:
          'By taking part in Afrique Innovante 2026, Matchy+ brings a solution born in Tunisia into a pan-African movement driven by high-potential women-led ventures.',
        intro:
          'Some steps open a new chapter. Matchy+’s participation in Afrique Innovante 2026 is one of them. It places a solution born in Tunisia within a wider movement, driven by high-potential women-led ventures and by a shared ambition: turning ideas rooted in real life into solutions able to grow and create impact.',
        sections: [
          {
            heading: 'Starting local to think bigger',
            text: 'Matchy+ was built on a simple observation: many skills are still hard to find, while the needs are there, every day. By making it easier for individuals, businesses and local professionals to connect, the platform wants to make searching smoother and know-how more visible. Afrique Innovante offers a framework to deepen this vision and think about adapting it to other African markets.',
          },
          {
            heading: 'One African ambition, many realities',
            text: 'Africa is not a single market. Each territory has its own languages, digital habits, local needs and ways of building trust. For Matchy+, growing therefore means listening, learning and adapting the experience. Finding a professional must stay simple, relevant and accessible, whether for home services, transport, maintenance, events or services for businesses.',
          },
          {
            heading: 'Growing opportunities together with talent',
            text: 'Matchy+’s ambition goes beyond matching demand with supply. The platform wants to contribute to a local economy where craftspeople, service providers, freelancers and small businesses can better present their activity, reach new clients and build their online reputation.',
          },
          {
            heading: 'A call to ecosystems',
            text: 'This step is also an invitation to incubators, businesses, networks, training organisations and partners who share the same will: to support innovation, the visibility of skills and economic inclusion. Collaborations can take the form of local pilots, support programmes, sector partnerships or regional experiments.',
          },
          {
            heading: 'What’s next?',
            text: 'With Afrique Innovante 2026, Matchy+ moves enthusiastically towards a wider ambition without losing its starting point: real needs, local talent and the connections that can change someone’s daily life or open a new opportunity.',
          },
        ],
        coverAlt:
          'Randa Touati, co-founder of Matchy+, presented for Tunisia in the Afrique Innovante 2026 programme',
      },
      ar: {
        tag: 'برنامج',
        title: 'Afrique Innovante 2026: Matchy+\u200E توصل صوت الكفاءات المحلية إلى أبعد',
        place: 'إفريقيا',
        summary:
          'بمشاركتها في Afrique Innovante 2026، تُدرج Matchy+\u200E حلًا وُلد في تونس ضمن ديناميكية إفريقية تحملها مشاريع نسائية ذات إمكانات عالية.',
        intro:
          'بعض المراحل تفتح فصلًا جديدًا، ومشاركة Matchy+\u200E في Afrique Innovante 2026 واحدة منها. فهي تُدرج حلًا وُلد في تونس ضمن ديناميكية أوسع، تحملها مشاريع نسائية ذات إمكانات عالية وطموح مشترك: تحويل أفكار نابعة من الواقع إلى حلول قادرة على النمو وإحداث الأثر.',
        sections: [
          {
            heading: 'الانطلاق من المحلي للتفكير بشكل أكبر',
            text: 'قامت Matchy+\u200E على ملاحظة بسيطة: كثير من الكفاءات ما زال من الصعب اكتشافها، بينما الاحتياجات موجودة كل يوم. ومن خلال تسهيل الربط بين الأفراد والشركات والمهنيين المحليين، تريد المنصة أن تجعل البحث أسلس والمهارة أكثر ظهورًا. ويوفّر برنامج Afrique Innovante إطارًا لتعميق هذه الرؤية والتفكير في تكييفها مع أسواق إفريقية أخرى.',
          },
          {
            heading: 'طموح إفريقي وواقع متعدد',
            text: 'إفريقيا ليست سوقًا واحدة. لكل منطقة لغاتها وعاداتها الرقمية واحتياجاتها القريبة وآليات الثقة الخاصة بها. لذلك يعني النمو بالنسبة إلى Matchy+\u200E الإصغاء والتعلّم وتكييف التجربة. يجب أن يبقى البحث عن مهني بسيطًا ومناسبًا ومتاحًا، سواء تعلّق الأمر بالخدمات المنزلية أو النقل أو الصيانة أو الفعاليات أو خدمات الشركات.',
          },
          {
            heading: 'تنمية الفرص مع المواهب',
            text: 'لا يقتصر طموح Matchy+\u200E على ربط الطلب بالعرض. فالمنصة تريد المساهمة في اقتصاد قرب يستطيع فيه الحرفيون ومقدّمو الخدمات والمستقلون والمؤسسات الصغيرة تقديم نشاطهم بشكل أفضل، والوصول إلى حرفاء جدد، وبناء سمعتهم الرقمية.',
          },
          {
            heading: 'دعوة إلى المنظومات',
            text: 'هذه المرحلة هي أيضًا دعوة إلى الحاضنات والشركات والشبكات وهياكل التكوين والشركاء الذين يتقاسمون الإرادة نفسها: دعم الابتكار وإبراز الكفاءات والإدماج الاقتصادي. ويمكن أن تأخذ الشراكات شكل تجارب محلية أو برامج مرافقة أو شراكات قطاعية أو تجارب جهوية.',
          },
          {
            heading: 'وماذا بعد؟',
            text: 'مع Afrique Innovante 2026، تتقدّم Matchy+\u200E بحماس نحو طموح أوسع دون أن تفقد نقطة انطلاقها: الاحتياجات الحقيقية، والمواهب المحلية، والروابط التي يمكن أن تغيّر يومًا أو تفتح فرصة جديدة.',
          },
        ],
        coverAlt:
          'رندة التواتي، الشريكة المؤسسة لـ Matchy+\u200E، ممثّلة تونس في برنامج Afrique Innovante 2026',
      },
    },
  },
  {
    slug: 'matchy-plus-express-fm-mundo-design',
    date: '2026-06-01',
    cover: '/matchy/press/express-fm-mundo-design.webp',
    // the video on the Matchy+ YouTube channel (25 Nov 2026)
    video: 'https://www.youtube.com/watch?v=MPJXj0HWO7A',
    sample: false,
    text: {
      fr: {
        tag: 'Média',
        title: 'Sur Express FM, Matchy+ raconte comment le design transforme un besoin en solution',
        place: 'Express FM',
        coverAlt:
          'Plateau d’Express FM en direct : l’application Matchy+ présentée à l’écran pendant l’émission Mundo Design',
        summary:
          'Dans Mundo Design sur Express FM, Matchy+ a parlé de design et d’entrepreneuriat : observer un problème, comprendre les usages et construire une solution utile.',
        intro:
          'Une idée peut être ambitieuse, mais c’est l’expérience vécue par l’utilisateur qui lui donne tout son sens. Lors du passage de Matchy+ dans Mundo Design sur Express FM, la discussion a commencé par le design et s’est naturellement prolongée vers l’entrepreneuriat : comment observer un problème, comprendre les usages et construire une solution qui trouve réellement sa place dans la vie des gens ?',
        sections: [
          {
            heading: 'Tout commence par une situation familière',
            text: 'Un besoin apparaît. Il faut trouver un plombier, un jardinier, une garde d’enfants, un chauffeur ou un prestataire pour une mission d’entreprise. Très vite, les recherches se multiplient et les informations deviennent difficiles à comparer. C’est dans cet instant concret que commence le travail de design de Matchy+ : réduire la confusion et guider l’utilisateur vers une réponse claire.',
          },
          {
            heading: 'Le design comme écoute',
            text: 'Avant les écrans, les couleurs et les boutons, le design consiste à écouter. Que cherche réellement l’utilisateur ? Quelles informations permettent de choisir ? Comment rassurer sans alourdir le parcours ? Comment donner au professionnel suffisamment d’espace pour présenter son savoir-faire ? Chaque réponse contribue à construire une expérience plus simple et plus humaine.',
          },
          {
            heading: 'Du parcours utilisateur à l’opportunité',
            text: 'Sur Matchy+, quelques actions doivent suffire pour exprimer un besoin : choisir un service, préciser une localisation, découvrir des profils et contacter le professionnel recherché. Pour le prestataire, le même parcours devient une opportunité de présenter son activité, d’être découvert localement et de développer sa présence numérique.',
          },
          {
            heading: 'Quand le design devient entrepreneurial',
            text: 'Créer une solution, c’est accepter de tester, d’apprendre et d’améliorer. Le design aide Matchy+ à rester proche des usages, tandis que l’entrepreneuriat transforme cette compréhension en produit, en modèle et en impact. Cette complémentarité permet de construire une plateforme qui évolue avec sa communauté.',
          },
          {
            heading: 'Et maintenant ?',
            text: 'Ce passage sur Express FM rappelle que les solutions les plus utiles commencent souvent par une question très simple : comment rendre la vie de l’utilisateur un peu plus facile ? Pour Matchy+, la réponse se construit chaque jour, au croisement du design, de la technologie et des talents locaux.',
          },
        ],
      },
      en: {
        tag: 'Media',
        title: 'On Express FM, Matchy+ explains how design turns a need into a solution',
        place: 'Express FM',
        coverAlt:
          'Express FM studio live: the Matchy+ app shown on screen during the Mundo Design show',
        summary:
          'On Mundo Design on Express FM, Matchy+ talked about design and entrepreneurship: observing a problem, understanding how people live and building a useful solution.',
        intro:
          'An idea can be ambitious, but it is the user’s experience that gives it its full meaning. When Matchy+ joined Mundo Design on Express FM, the conversation started with design and naturally moved on to entrepreneurship: how do you observe a problem, understand how people do things and build a solution that truly finds its place in their lives?',
        sections: [
          {
            heading: 'It all starts with a familiar situation',
            text: 'A need comes up. You have to find a plumber, a gardener, childcare, a driver or a provider for a business assignment. Very quickly, searches multiply and information becomes hard to compare. That concrete moment is where Matchy+’s design work begins: reducing confusion and guiding the user to a clear answer.',
          },
          {
            heading: 'Design as listening',
            text: 'Before screens, colours and buttons, design means listening. What is the user really looking for? What information helps them choose? How do you reassure without making the journey heavier? How do you give professionals enough room to present their know-how? Each answer helps build a simpler, more human experience.',
          },
          {
            heading: 'From user journey to opportunity',
            text: 'On Matchy+, a few steps should be enough to express a need: choose a service, set a location, discover profiles and contact the right professional. For the provider, the same journey becomes an opportunity to present their business, be discovered locally and grow their online presence.',
          },
          {
            heading: 'When design becomes entrepreneurial',
            text: 'Creating a solution means accepting to test, learn and improve. Design helps Matchy+ stay close to how people actually behave, while entrepreneurship turns that understanding into a product, a model and impact. Together, they make it possible to build a platform that grows with its community.',
          },
          {
            heading: 'What’s next?',
            text: 'This time on Express FM is a reminder that the most useful solutions often start with a very simple question: how can we make the user’s life a little easier? For Matchy+, the answer is built every day, where design, technology and local talent meet.',
          },
        ],
      },
      ar: {
        tag: 'إعلام',
        title: 'على Express FM، تروي Matchy+\u200E كيف يحوّل التصميم الحاجة إلى حل',
        place: 'Express FM',
        coverAlt:
          'استوديو Express FM مباشرة: تطبيق Matchy+\u200E معروض على الشاشة خلال برنامج Mundo Design',
        summary:
          'في برنامج Mundo Design على Express FM، تحدّثت Matchy+\u200E عن التصميم وريادة الأعمال: ملاحظة المشكلة وفهم الاستخدامات وبناء حل مفيد.',
        intro:
          'قد تكون الفكرة طموحة، لكن تجربة المستخدم هي ما يمنحها معناها الكامل. خلال حضور Matchy+\u200E في برنامج Mundo Design على Express FM، بدأ النقاش بالتصميم وامتد بشكل طبيعي إلى ريادة الأعمال: كيف نلاحظ مشكلة، ونفهم الاستخدامات، ونبني حلًا يجد مكانه فعلًا في حياة الناس؟',
        sections: [
          {
            heading: 'كل شيء يبدأ بموقف مألوف',
            text: 'تظهر حاجة ما: يجب العثور على سبّاك أو بستاني أو جليسة أطفال أو سائق أو مقدّم خدمة لمهمة في شركة. وسرعان ما تتكاثر عمليات البحث وتصبح المعلومات صعبة المقارنة. في هذه اللحظة الملموسة يبدأ عمل Matchy+\u200E في التصميم: تقليل الارتباك وتوجيه المستخدم نحو إجابة واضحة.',
          },
          {
            heading: 'التصميم إصغاء',
            text: 'قبل الشاشات والألوان والأزرار، التصميم هو الإصغاء. عمّ يبحث المستخدم حقًا؟ ما المعلومات التي تساعده على الاختيار؟ كيف نطمئنه دون إثقال المسار؟ كيف نمنح المهني مساحة كافية لعرض مهارته؟ كل إجابة تساهم في بناء تجربة أبسط وأكثر إنسانية.',
          },
          {
            heading: 'من مسار المستخدم إلى الفرصة',
            text: 'على Matchy+\u200E، يجب أن تكفي بضع خطوات للتعبير عن حاجة: اختيار خدمة، وتحديد موقع، واكتشاف الملفات، والتواصل مع المهني المطلوب. وبالنسبة إلى مقدّم الخدمة، يصبح المسار نفسه فرصة لعرض نشاطه، وأن يُكتشف محليًا، وأن يطوّر حضوره الرقمي.',
          },
          {
            heading: 'حين يصبح التصميم ريادة أعمال',
            text: 'إنشاء حل يعني قبول التجربة والتعلّم والتحسين. يساعد التصميم Matchy+\u200E على البقاء قريبة من الاستخدامات، بينما تحوّل ريادة الأعمال هذا الفهم إلى منتج ونموذج وأثر. ويسمح هذا التكامل ببناء منصة تتطوّر مع مجتمعها.',
          },
          {
            heading: 'وماذا بعد؟',
            text: 'يذكّرنا هذا الحضور على Express FM بأن أكثر الحلول فائدة تبدأ غالبًا بسؤال بسيط جدًا: كيف نجعل حياة المستخدم أسهل قليلًا؟ وبالنسبة إلى Matchy+\u200E، تُبنى الإجابة كل يوم عند تقاطع التصميم والتكنولوجيا والمواهب المحلية.',
          },
        ],
      },
    },
  },
];

/** All news, newest first; items with the same date keep their order in PRESS_ITEMS. */
export function pressItems(): PressItem[] {
  return [...PRESS_ITEMS].sort((a, b) => b.date.localeCompare(a.date));
}

export function pressItem(slug: string): PressItem | undefined {
  return PRESS_ITEMS.find((item) => item.slug === slug);
}

/**
 * The YouTube video id of a watch, youtu.be, shorts or embed link, or null if the link is not a
 * YouTube video (so a wrong link never embeds another site).
 */
export function youtubeId(link: string | undefined): string | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, value] = url.pathname.split('/');
    id =
      kind === 'watch'
        ? url.searchParams.get('v')
        : kind === 'shorts' || kind === 'embed'
          ? value
          : null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** The first day a (possibly partial) date can mean, at noon UTC: '2026' → 1 Jan 2026. */
export function pressDateValue(date: string): Date {
  const [year, month = '01', day = '01'] = date.split('-');
  // noon UTC: the same calendar day on the server and in every visitor's time zone
  return new Date(`${year}-${month}-${day}T12:00:00Z`);
}

/**
 * Date parts in the page language, e.g. { top: 'nov.', big: '22', full: '22 nov. 2026' }.
 * A month-only date (YYYY-MM) shows the year on top and the month big ({ top: '2026', big: 'juin' });
 * a year-only date (YYYY) shows just the year ({ top: '', big: '2026', full: '2026' }).
 */
export function pressDate(date: string, locale: Locale) {
  const value = pressDateValue(date);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(numberLocale(locale), { timeZone: 'UTC', ...options }).format(value);
  if (/^\d{4}$/.test(date)) {
    const yearOnly = format({ year: 'numeric' });
    return { top: '', big: yearOnly, full: yearOnly };
  }
  if (/^\d{4}-\d{2}$/.test(date)) {
    return {
      top: format({ year: 'numeric' }),
      big: format({ month: 'short' }),
      full: format({ month: 'long', year: 'numeric' }),
    };
  }
  return {
    top: format({ month: 'short' }),
    big: format({ day: '2-digit' }),
    full: format({ day: 'numeric', month: 'short', year: 'numeric' }),
  };
}
