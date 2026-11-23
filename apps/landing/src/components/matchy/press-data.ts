import type { Locale } from '@/features/i18n/messages';

import { numberLocale } from './community-map';

/** The texts of one news item in one language. */
export type PressText = {
  /** Small label on the card: "Interview", "Événement"… */
  tag: string;
  title: string;
  place: string;
  /** One or two sentences, shown on the "all news" page. */
  summary: string;
  /** The article, one paragraph per entry. */
  body: string[];
};

/**
 * One Matchy+ Press item. To publish a real one: copy an entry, give it a new `slug` (its URL),
 * the date, the texts in the 3 languages, and optionally a YouTube link and a cover image
 * (put the image in `public/matchy/press/`, about 1200 × 800 px, .webp). Set `sample` to false.
 */
export type PressItem = {
  /** URL name: /fr/actualites/<slug>/. Lowercase letters, numbers and dashes only. */
  slug: string;
  /** Publication date: YYYY-MM-DD, or YYYY-MM when only the month is known (shown as "juin 2026"). */
  date: string;
  /** Optional cover, e.g. '/matchy/press/salon-2026.webp'. Without it the card shows a brand gradient. */
  cover?: string;
  /** Optional YouTube link (watch, youtu.be or shorts link): the article shows the video. */
  video?: string;
  /** Optional link to the original LinkedIn post: the article shows a "Voir sur LinkedIn" button. */
  linkedin?: string;
  /** Example content until the real news arrives: labelled on the site and kept out of Google. */
  sample: boolean;
  text: Record<Locale, PressText>;
};

export const PRESS_ITEMS: PressItem[] = [
  {
    slug: 'meetup-pro-2026',
    // month only until the post's LinkedIn link gives the exact day
    date: '2026-11',
    // photos by Rayen Yahyaoui: add `cover: '/matchy/press/meetup-pro-2026.webp'` when received
    sample: false,
    text: {
      fr: {
        tag: 'Événement',
        title: 'Matchy+ au Meetup Pro 2026',
        place: 'Sousse',
        summary:
          'Randa Touati, cofondatrice et CEO de Matchy+, a pris la parole devant près de 600 participants sur les collaborations entre startups et grandes entreprises.',
        body: [
          'Randa Touati, cofondatrice et CEO de Matchy+, est intervenue au Meetup Pro 2026 à Sousse, aux côtés de Ghassen Dridi et Nizar Somrani, sous la modération d’Anizi Oumayma. L’édition a rassemblé près de 600 participants.',
          'Le panel portait sur le pouvoir des collaborations Startup × Corporate, avec une question centrale : comment les startups et les grandes entreprises peuvent-elles unir leurs forces pour créer davantage de valeur et d’impact ?',
          'Randa y a aussi partagé son parcours : trois métiers, une même volonté de transformer les défis en opportunités. De l’enseignement à son poste de cheffe de projet web chez Dot-IT, jusqu’à l’aventure entrepreneuriale de Matchy+.',
          'Merci à Amine Touati pour l’invitation, à toute l’équipe Meetup Pro pour l’organisation, et à Rayen Yahyaoui pour les photos.',
        ],
      },
      en: {
        tag: 'Event',
        title: 'Matchy+ at Meetup Pro 2026',
        place: 'Sousse',
        summary:
          'Randa Touati, co-founder and CEO of Matchy+, spoke to nearly 600 participants about collaboration between startups and large companies.',
        body: [
          'Randa Touati, co-founder and CEO of Matchy+, spoke at Meetup Pro 2026 in Sousse alongside Ghassen Dridi and Nizar Somrani, in a panel moderated by Anizi Oumayma. The event brought together nearly 600 participants.',
          'The panel explored the power of Startup × Corporate collaboration, around one central question: how can startups and large companies join forces to create more value and impact?',
          'Randa also shared her own path: three careers, one drive to turn challenges into opportunities. From teaching, to web project manager at Dot-IT, to the entrepreneurial adventure of Matchy+.',
          'Thanks to Amine Touati for the invitation, to the whole Meetup Pro team for the organisation, and to Rayen Yahyaoui for the photos.',
        ],
      },
      ar: {
        tag: 'فعالية',
        title: 'Matchy+‎ في Meetup Pro 2026',
        place: 'سوسة',
        summary:
          'تحدّثت رندة التواتي، الشريكة المؤسسة والرئيسة التنفيذية لـ Matchy+‎، أمام قرابة 600 مشارك عن التعاون بين الشركات الناشئة والشركات الكبرى.',
        body: [
          'شاركت رندة التواتي، الشريكة المؤسسة والرئيسة التنفيذية لـ Matchy+‎، في Meetup Pro 2026 بسوسة إلى جانب غسان الدريدي ونزار السمراني، في جلسة أدارتها أنيزي أميمة. وقد جمعت هذه الدورة قرابة 600 مشارك.',
          'تناولت الجلسة قوة التعاون بين الشركات الناشئة والشركات الكبرى، حول سؤال محوري: كيف يمكن لهما توحيد جهودهما لخلق قيمة وأثر أكبر؟',
          'كما شاركت رندة مسيرتها: ثلاث مهن ومسار واحد وإرادة واحدة لتحويل التحديات إلى فرص. من التعليم، إلى رئيسة مشاريع الويب في Dot-IT، وصولًا إلى مغامرة Matchy+‎ الريادية.',
          'شكرًا لأمين التواتي على الدعوة، ولكامل فريق Meetup Pro على التنظيم، ولريان اليحياوي على الصور.',
        ],
      },
    },
  },
  {
    slug: 'al-wataniya-jil-el-moustakbal',
    date: '2026-11-10',
    linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7526032162060521472/',
    // the TV extract: add `video: '<YouTube link>'` (or a cover photo) when received
    sample: false,
    text: {
      fr: {
        tag: 'Média',
        title: 'Matchy+ dans « جيل المستقبل » sur Al Wataniya TV',
        place: 'Al Wataniya TV',
        summary:
          'Randa Touati a présenté la vision de Matchy+ : transformer l’accès aux services locaux grâce à l’innovation et à l’intelligence artificielle.',
        body: [
          'Randa Touati, cofondatrice et CEO de Matchy+, était l’invitée de l’émission « جيل المستقبل » sur Al Wataniya TV. Elle y a partagé la vision et l’ambition de Matchy+, une plateforme qui veut transformer l’accès aux services locaux grâce à l’innovation et à l’intelligence artificielle.',
          'Les échanges ont porté sur l’entrepreneuriat, l’innovation et l’avenir des startups tunisiennes, avec les autres invités du plateau, dont Razi Miliani.',
          'Ces moments aident à mettre en lumière les initiatives qui construisent l’économie de demain et à encourager la nouvelle génération d’entrepreneurs.',
          'Merci à Fatma Ben Jemaa Ghorbel pour l’invitation et l’accueil, et à toute l’équipe d’Al Wataniya TV.',
        ],
      },
      en: {
        tag: 'Media',
        title: 'Matchy+ on “جيل المستقبل” on Al Wataniya TV',
        place: 'Al Wataniya TV',
        summary:
          'Randa Touati presented the Matchy+ vision: changing access to local services through innovation and artificial intelligence.',
        body: [
          'Randa Touati, co-founder and CEO of Matchy+, was a guest on the show “جيل المستقبل” on Al Wataniya TV. She shared the vision and ambition of Matchy+, a platform that aims to change access to local services through innovation and artificial intelligence.',
          'The discussion covered entrepreneurship, innovation and the future of Tunisian startups, with the other guests on set, including Razi Miliani.',
          'Moments like this help highlight the initiatives building tomorrow’s economy and encourage the next generation of entrepreneurs.',
          'Thanks to Fatma Ben Jemaa Ghorbel for the invitation and the welcome, and to the whole Al Wataniya TV team.',
        ],
      },
      ar: {
        tag: 'إعلام',
        title: 'Matchy+‎ في برنامج «جيل المستقبل» على الوطنية',
        place: 'التلفزة الوطنية',
        summary:
          'قدّمت رندة التواتي رؤية Matchy+‎: تغيير طريقة الوصول إلى الخدمات المحلية بفضل الابتكار والذكاء الاصطناعي.',
        body: [
          'كانت رندة التواتي، الشريكة المؤسسة والرئيسة التنفيذية لـ Matchy+‎، ضيفة برنامج «جيل المستقبل» على قناة الوطنية. وقدّمت رؤية Matchy+‎ وطموحها، وهي منصة تهدف إلى تغيير طريقة الوصول إلى الخدمات المحلية بفضل الابتكار والذكاء الاصطناعي.',
          'تناول النقاش ريادة الأعمال والابتكار ومستقبل الشركات الناشئة التونسية، مع بقية ضيوف البرنامج ومنهم رازي المِلياني.',
          'تساعد مثل هذه اللحظات على إبراز المبادرات التي تبني اقتصاد الغد وعلى تشجيع الجيل الجديد من رواد الأعمال.',
          'شكرًا لفاطمة بن جمعة غربال على الدعوة وحسن الاستقبال، ولكامل فريق التلفزة الوطنية.',
        ],
      },
    },
  },
  {
    slug: 'afrique-innovante-2026',
    // posted about 5 months before 23 Nov 2026: month only until the exact day is known
    date: '2026-06',
    sample: false,
    text: {
      fr: {
        tag: 'Programme',
        title: 'Matchy+ rejoint le programme Afrique Innovante 2026',
        place: 'Afrique',
        summary:
          'Une expérience enrichissante, faite de rencontres inspirantes et d’échanges autour de l’innovation et de l’entrepreneuriat africain.',
        body: [
          'Randa Touati, cofondatrice et CEO de Matchy+, participe au programme Afrique Innovante 2026.',
          'Une expérience enrichissante, faite de rencontres inspirantes et d’échanges autour de l’innovation et de l’entrepreneuriat africain.',
        ],
      },
      en: {
        tag: 'Programme',
        title: 'Matchy+ joins the Afrique Innovante 2026 programme',
        place: 'Africa',
        summary:
          'An enriching experience of inspiring encounters and exchanges on innovation and African entrepreneurship.',
        body: [
          'Randa Touati, co-founder and CEO of Matchy+, is taking part in the Afrique Innovante 2026 programme.',
          'An enriching experience of inspiring encounters and exchanges on innovation and African entrepreneurship.',
        ],
      },
      ar: {
        tag: 'برنامج',
        title: 'Matchy+‎ تنضمّ إلى برنامج Afrique Innovante 2026',
        place: 'إفريقيا',
        summary: 'تجربة ثرية مليئة بلقاءات ملهمة وتبادلات حول الابتكار وريادة الأعمال الإفريقية.',
        body: [
          'تشارك رندة التواتي، الشريكة المؤسسة والرئيسة التنفيذية لـ Matchy+‎، في برنامج Afrique Innovante 2026.',
          'تجربة ثرية مليئة بلقاءات ملهمة وتبادلات حول الابتكار وريادة الأعمال الإفريقية.',
        ],
      },
    },
  },
];

/** All news, newest first. */
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

/**
 * Date parts in the page language, e.g. { top: 'nov.', big: '12', full: '12 nov. 2026' }.
 * A month-only date (YYYY-MM) shows the year on top and the month big: { top: '2026', big: 'juin' }.
 */
export function pressDate(date: string, locale: Locale) {
  const monthOnly = /^\d{4}-\d{2}$/.test(date);
  // noon UTC: the same calendar day on the server and in every visitor's time zone
  const value = new Date(`${monthOnly ? `${date}-01` : date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(numberLocale(locale), { timeZone: 'UTC', ...options }).format(value);
  return monthOnly
    ? {
        top: format({ year: 'numeric' }),
        big: format({ month: 'short' }),
        full: format({ month: 'long', year: 'numeric' }),
      }
    : {
        top: format({ month: 'short' }),
        big: format({ day: '2-digit' }),
        full: format({ day: 'numeric', month: 'short', year: 'numeric' }),
      };
}
