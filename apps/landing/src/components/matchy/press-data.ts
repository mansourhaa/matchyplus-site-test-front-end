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
  /** Publication date, YYYY-MM-DD. */
  date: string;
  /** Optional cover, e.g. '/matchy/press/salon-2026.webp'. Without it the card shows a brand gradient. */
  cover?: string;
  /** Optional YouTube link (watch, youtu.be or shorts link): the article shows the video. */
  video?: string;
  /** Example content until the real news arrives: labelled on the site and kept out of Google. */
  sample: boolean;
  text: Record<Locale, PressText>;
};

export const PRESS_ITEMS: PressItem[] = [
  {
    slug: 'salon-entrepreneuriat-2026',
    date: '2026-11-12',
    sample: true,
    text: {
      fr: {
        tag: 'Événement',
        title: "Matchy+ au Salon de l'entrepreneuriat",
        place: 'Tunis',
        summary:
          'Deux jours de rencontres avec des artisans, des indépendants et des entreprises de la région.',
        body: [
          "Matchy+ était présent au Salon de l'entrepreneuriat de Tunis pour présenter la plateforme aux professionnels et aux entreprises de la région.",
          'Sur le stand, les visiteurs ont pu tester la recherche par service et par ville, créer leur profil pro et découvrir le score de compatibilité.',
        ],
      },
      en: {
        tag: 'Event',
        title: 'Matchy+ at the Entrepreneurship Fair',
        place: 'Tunis',
        summary: 'Two days of meetings with craftspeople, freelancers and local businesses.',
        body: [
          'Matchy+ took part in the Tunis Entrepreneurship Fair to present the platform to local professionals and businesses.',
          'At the stand, visitors tried the search by service and city, created their pro profile and discovered the compatibility score.',
        ],
      },
      ar: {
        tag: 'فعالية',
        title: 'Matchy+‎ في صالون ريادة الأعمال',
        place: 'تونس',
        summary: 'يومان من اللقاءات مع الحرفيين والمستقلين والشركات في المنطقة.',
        body: [
          'شاركت Matchy+‎ في صالون ريادة الأعمال بتونس لتقديم المنصة للمهنيين والشركات في المنطقة.',
          'في الجناح، جرّب الزوار البحث حسب الخدمة والمدينة، وأنشؤوا ملفاتهم المهنية واكتشفوا نسبة التوافق.',
        ],
      },
    },
  },
  {
    slug: 'interview-artisans-clients',
    date: '2026-10-29',
    sample: true,
    text: {
      fr: {
        tag: 'Interview',
        title: 'Rapprocher les artisans de leurs clients',
        place: 'Sfax',
        summary:
          "L'équipe Matchy+ explique comment la plateforme aide les pros à être trouvés près de chez eux.",
        body: [
          "Comment un plombier ou une couturière peut-il être trouvé par les bonnes personnes, au bon moment ? C'est la question à laquelle Matchy+ répond.",
          "Dans cet entretien, l'équipe revient sur la mise en relation locale, les profils vérifiés et la place des avis clients.",
        ],
      },
      en: {
        tag: 'Interview',
        title: 'Bringing craftspeople closer to their clients',
        place: 'Sfax',
        summary: 'The Matchy+ team explains how the platform helps pros get found near them.',
        body: [
          'How can a plumber or a seamstress be found by the right people at the right time? That is the question Matchy+ answers.',
          'In this interview, the team talks about local matching, verified profiles and the role of client reviews.',
        ],
      },
      ar: {
        tag: 'حوار',
        title: 'تقريب الحرفيين من حرفائهم',
        place: 'صفاقس',
        summary: 'فريق Matchy+‎ يشرح كيف تساعد المنصة المهنيين على أن يُعثر عليهم بالقرب منهم.',
        body: [
          'كيف يمكن لسبّاك أو خيّاطة أن يجده الأشخاص المناسبون في الوقت المناسب؟ هذا هو السؤال الذي تجيب عنه Matchy+‎.',
          'في هذا الحوار، يتحدث الفريق عن الربط المحلي والملفات الموثّقة ودور تقييمات الحرفاء.',
        ],
      },
    },
  },
  {
    slug: 'programme-partenaires',
    date: '2026-10-09',
    sample: true,
    text: {
      fr: {
        tag: 'Annonce',
        title: 'Lancement du programme partenaires',
        place: 'Tunis',
        summary:
          'Entreprises, associations et marques locales peuvent désormais rejoindre le réseau Matchy+.',
        body: [
          'Matchy+ ouvre son programme partenaires aux entreprises, associations et marques locales qui veulent soutenir les services de proximité.',
          'Les partenaires gagnent en visibilité auprès des utilisateurs de leur région et construisent des actions avec l’équipe Matchy+.',
        ],
      },
      en: {
        tag: 'Announcement',
        title: 'Launch of the partner programme',
        place: 'Tunis',
        summary: 'Businesses, associations and local brands can now join the Matchy+ network.',
        body: [
          'Matchy+ opens its partner programme to businesses, associations and local brands that want to support local services.',
          'Partners gain visibility with users in their region and build actions together with the Matchy+ team.',
        ],
      },
      ar: {
        tag: 'إعلان',
        title: 'إطلاق برنامج الشركاء',
        place: 'تونس',
        summary: 'يمكن الآن للشركات والجمعيات والعلامات المحلية الانضمام إلى شبكة Matchy+‎.',
        body: [
          'تفتح Matchy+‎ برنامج الشركاء أمام الشركات والجمعيات والعلامات المحلية التي تريد دعم خدمات القرب.',
          'يكسب الشركاء ظهورًا لدى مستخدمي منطقتهم ويبنون مبادرات مع فريق Matchy+‎.',
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

/** Date parts in the page language, e.g. { day: '12', month: 'nov.', full: '12 nov. 2026' }. */
export function pressDate(date: string, locale: Locale) {
  // noon UTC: the same calendar day on the server and in every visitor's time zone
  const value = new Date(`${date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(numberLocale(locale), { timeZone: 'UTC', ...options }).format(value);
  return {
    day: format({ day: '2-digit' }),
    month: format({ month: 'short' }),
    full: format({ day: 'numeric', month: 'short', year: 'numeric' }),
  };
}
