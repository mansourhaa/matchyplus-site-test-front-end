# Matchy+ landing site (`apps/landing`)

Public website of Matchy+ (`matchyplus.com`): home page, services, about, contact, FAQ, partners
and legal pages, in **French, English and Arabic** (right-to-left).

This README documents the **home page redesign** done on the branch
`feature/landing-animations-v2`: what changed, where the code lives, why each choice was made,
how it is tested, and what must still be decided before production.

---

## Run it

```bash
pnpm install                                   # from the repo root
pnpm --filter @saas-boilerplate/landing dev    # http://localhost:3002/fr/
```

| Command (in `apps/landing`) | What it checks                                     |
| --------------------------- | -------------------------------------------------- |
| `pnpm typecheck`            | TypeScript                                         |
| `pnpm lint`                 | ESLint (0 errors; 5 old `no-img-element` warnings) |
| `pnpm test`                 | Vitest + Testing Library: **146 tests**            |
| `pnpm build`                | Production build (36 pages)                        |

**Windows tip:** if `/fr/services/` and the other pages return 404 in dev while `/fr/` works, look
for a stray `package.json` / `package-lock.json` in a parent folder (for example your user folder).
Next.js then takes that folder as the project root and does not see the other routes. Rename or
delete it. The build warning _"inferred your workspace root"_ is the same problem.

The sign-up and login buttons point to the app (`apps/app`) through `NEXT_PUBLIC_APP_URL`
(`src/lib/constants.ts`), exactly as before: set it at build time in each environment.

---

## Home page: sections in order

Defined in `src/app/[lang]/page.tsx`. Sections marked **new** or **changed** are part of this work.

| #   | Section                                | File(s) in `src/components/matchy/`                                                                                                                                     | Status  |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Hero: live phone + search              | `hero.tsx`, `hero-live-phone.tsx`, `hero-phone-overlay.tsx`, `hero-phone-bubble.tsx`, `hero-mini-card.tsx`, `hero-search.tsx`                                           | changed |
| 2   | Matchy+ Press (latest 3 news)          | `press.tsx`, `press-card.tsx`, `press-data.ts`                                                                                                                          | new     |
| 3   | Services belt (10 trades)              | `services-belt.tsx`, `belt-person.tsx`, `belt-floor.tsx`, `belt-service-info.tsx`, `belt-geometry.ts`, `belt-profile-card.tsx`, `belt-match-dialog.tsx`, `belt-data.ts` | new     |
| 4   | Without / with Matchy+                 | `why-matchy.tsx`                                                                                                                                                        | new     |
| 5   | Pro storefront card + referral         | `pro-branding.tsx`, `referral.tsx`                                                                                                                                      | new     |
| 6   | Pan-African ambition map               | `live-community.tsx`, `community-marker.tsx`, `community-arcs.tsx`, `community-tooltip.tsx`, `community-map.ts`                                                         | new     |
| 7   | Nos partenaires (DOT-IT, GoPayzi, TCA) | `partner-logos.tsx`                                                                                                                                                     | new     |
| 8   | Company story                          | `company-story.tsx`                                                                                                                                                     | new     |
| 9   | Roadmap                                | `roadmap.tsx`                                                                                                                                                           | new     |

## Other pages added

| Page                  | Files                                                                       | What it shows                                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/utilisation/`       | `app/[lang]/utilisation/page.tsx`, `usage-hero.tsx`                         | How Matchy+ works: the 5 sections that left the home page, unchanged and in the same order: `features.tsx`, `steps.tsx` (`#how`), `security.tsx` (wallet), `explore.tsx`, `cta.tsx`. The menu's "Utilisation" opens it. In the sitemap. |
| `/actualites/`        | `app/[lang]/actualites/`, `press-pages.tsx` (`PressList`)                   | Every news item, newest first. In the sitemap.                                                                                                                                                                                          |
| `/actualites/<slug>/` | `app/[lang]/actualites/[slug]/page.tsx`, `press-pages.tsx` (`PressArticle`) | One news item: date, tag, title, place, the YouTube video (if any), the text. One static page per item and language; any other slug is a 404.                                                                                           |
| `/recherche/`         | `app/[lang]/recherche/`, `search-results.tsx`                               | Results of the hero search (see the hero section below).                                                                                                                                                                                |

All texts live in `src/features/i18n/messages.ts` under `landing.*`, in `fr`, `en` and `ar`.

---

## What each new section does, and why

### 1. Hero: live phone and search

- **`hero-live-phone.tsx`:** the app screenshot in a phone frame, with sample profiles swiping
  on it (the same 10 pros as the belt), floating bubbles ("available", distance, % match) and a
  slight parallax.
  - The screenshot has French buttons and tabs baked in. They are redrawn on top of it in the page
    language, with the app's own labels (key `heroPhoneTabs`). Without this, the English and
    Arabic pages showed French. The tab labels sit on the label row only (below the icons) and
    are clipped to the screen's rounded corners, so they never spill onto the phone frame.
  - Split into small files: `hero-phone-overlay.tsx` (the redrawn buttons and tabs, with their
    positions), `hero-phone-bubble.tsx` (a floating bubble), `hero-mini-card.tsx` (the swiping
    card). `hero-live-phone.tsx` keeps the timer, the swipes and the tilt.
- **`hero-search.tsx`:** "I'm looking for a pro / I'm a professional / Business" toggles, plus
  "what service?" and "where?". A search opens the **results page** (`/recherche/`, see below),
  which then leads to sign-up with the search in the URL.
- **Under the search:** a second button "Créer mon profil gratuitement" (sign-up) and the
  reassurance line (proximity, profiles and skills, direct contact, individuals and businesses).
- **Results page** (`app/[lang]/recherche/`, `search-results.tsx`, `search-results-data.ts`): the
  site's blue sub-page band with "Trouvez le bon professionnel pour votre besoin", the search
  (service, city or "Près de chez vous") and a "Créer mon compte gratuit" button to the app's
  sign-up page (`buildSearchUrl` adds `service` and `ville`). **No count**: the content brief
  allows only sourced figures, so a number comes back only with a real search API. The page is
  `noindex` and stays out of the sitemap.
  - The navbar has no login link, so the hero keeps "Déjà membre ? Connexion".

### 2. Services belt

- **What it is:** a 3D carousel of 10 professionals (plumber, electrician, driver, nanny,
  cleaner, delivery, cook, seamstress, gardener, waiter) on a white stage with no box: the floor
  fades out on every side into the white page (`EDGE_FADE` in `motion.tsx`). You can drag it, click a person, or use the keyboard. At the manager's request there is no
  numbered index on the side.
- **Hover tag:** before the click, hovering a person shows a small white tag beside them with their
  name and daily price range ("Youssef B. · 25 à 30 DT/jour", built by `personTag` in
  `belt-data.ts`). It opens towards the middle of the belt, so it is never cut at the edges, and it
  is hidden on phones (no mouse; a tap opens the card). The same text is part of the person's
  accessible name, so screen readers hear it too.
- **Picking a pro:** clicking one opens their profile card (`belt-profile-card.tsx`) with
  app-style "Passer" / "Connecter" buttons.
  - "Connecter" opens a match screen (`belt-match-dialog.tsx`). It has a focus trap, and Escape
    or a click outside closes it. Its main button leads to sign-up.
- **Positions:** computed by pure functions in `belt-geometry.ts` (slots and stage size), which
  are tested on their own.
- **Files:** `services-belt.tsx` keeps the rotation, drag and keyboard. One person on the belt is
  `belt-person.tsx` (with the hover tag), the coloured floor is `belt-floor.tsx`, the text and
  button beside the belt are `belt-service-info.tsx`.
- **Data:** in `belt-data.ts`. Each trade (code `PLB`, `ELC`…) maps to a photo in
  `public/matchy/belt/`. Names, prices, ratings and skills come from `messages.ts`, in the 3
  languages.
- **Photos:** WebP with a transparent background, about 55–115 KB each. The `sizes` attribute
  matches their real on-screen width (about 130 px on phones, 210 px on computers), so the
  browser downloads small versions.
- **Accessibility:** each person is a button named after their trade ("Afficher : Électricien"),
  so screen readers and keyboards can pick any trade.

### 3. Without / with Matchy+ (`why-matchy.tsx`)

Two columns comparing finding a pro today (asking family for a number, unanswered calls, no
reviews, no idea of availability) with Matchy+.

### 4. Pro storefront card + referral (`pro-branding.tsx`, `referral.tsx`)

- **Left side:** what a professional gets (complete profile, reviews, "Disponible" badge,
  visibility).
- **Right side:** a sample pro card. Following the manager's request, it has **no photo**. On
  top is the referral block: the code with a copy button, a QR code to the sign-up page
  (`?ref=CODE`), and the member's points ("10 points pour vous"). Below come the name, trade,
  daily price range, rating, "Disponible", area, 3 stats and, at the bottom of the card, the
  "Créez votre profil pro" button. At the manager's request the card shows no "Profil d'exemple"
  line (the belt still does).
- **Why there is no separate referral section:** the manager wanted the code and points inside
  the card, so that section was removed with its texts and tests.
- **Dependency:** the QR code uses `qrcode.react` (same version as `apps/app`).

### 5. Live community map (`live-community.tsx`, `community-map.ts`)

`live-community.tsx` keeps the layout and the phone scroll. One city point is
`community-marker.tsx`, the lines from Tunis are `community-arcs.tsx` and the city tooltip is
`community-tooltip.tsx`.

**No figures on the map** (content brief: "no number without a definition and a source"): the
counters, the visitor counts in the tooltips and the "+1" arrivals were removed. Show a figure
again only with a real, defined KPI (registered professionals, active users, countries really
represented, connections made) and its source.

Based on the manager's reference (a live visitors map), rebuilt in the site's theme:

- **Layout:** the same centered, animated heading as the other sections. No card around it: the
  light world map sits directly on a white section and fades out on all four sides
  (`EDGE_FADE`, the same fade as the belt floor). Tunisia, France, Russia,
  Algeria and Morocco are in brand blue (the manager's choice).
- **Texts (content brief):** kicker "Une ambition panafricaine", title "Matchy+ connecte les
  talents locaux aux opportunités".
- **Cities:** 9 cities pulse on the map (`CITY_POINTS`). Hovering or tapping one shows its name.
- **Animations:**
  - curved lines drawn from Tunis (where Matchy+ was born) to each city;
  - a soft light sweep across the map.
  - All of it stops for "reduce motion": CSS `motion-reduce:` for the lines and sweep, and
    `MotionConfig reducedMotion="user"` for the floating and sliding.
- **Phones:** the map keeps a readable width and scrolls sideways. It starts on Tunis, and a
  tapped city slides to the middle so its tooltip is never cut off.

**Why our own map:** the reference image looked like a screenshot from an analytics tool, with
unclear rights, and weighed 264 KB. `public/matchy/community/world-map.svg` is generated from
Natural Earth data (public domain, `world-atlas` countries-110m) with d3-geo's `geoNaturalEarth1`
projection, without Antarctica (about 50 KB over the network). Only mainland France is
highlighted (not French Guiana), and Russia's far-east tip beyond the 180° line is flattened so it
does not show as a stray spot next to Alaska. The city positions in
`community-map.ts` come from **the same projection**, so they land exactly on the cities. If the
map is regenerated, recompute them the same way.

**Why not 3D:** a 3D globe (three.js) was tried and not kept. It added heavy JavaScript for a
smaller benefit.

### 6. Matchy+ Press (`press.tsx`, `press-card.tsx`, `press-data.ts`, `press-pages.tsx`)

- **The news live in one file, `press-data.ts`** (`PRESS_ITEMS`): slug (the URL), date, the
  texts in fr/en/ar (tag, title, place, summary, paragraphs), and optionally a YouTube link, a
  cover image and the LinkedIn post. **To add a news item:** copy an entry and fill it in. No
  other code changes. The home page shows the 3 newest; `/actualites/` shows all.
- **The 3 current news are real**, rewritten from Randa Touati's LinkedIn posts: Meetup Pro 2026
  (Sousse), the Al Wataniya TV show "جيل المستقبل" (10 Nov 2026) and the Afrique Innovante 2026
  programme. Their photos and videos are not in yet: each entry has a comment where the cover or
  the YouTube link goes. A date can be a month only (`2026-06`, shown "juin 2026") when the day is
  unknown; Meetup Pro's exact day comes from its LinkedIn link.
- **LinkedIn:** an item with a `linkedin` link shows a "Voir la publication sur LinkedIn" button
  (new tab, `rel="noopener noreferrer"`).
- **Card** (`press-card.tsx`, same on the home page and on `/actualites/`): date badge, tag, big
  title, place and a Matchy+ footer on a cover. Without a cover image the card uses a brand
  gradient. On phones the home cards are a swipeable row.
- **Video:** `youtubeId()` accepts watch, youtu.be, shorts and embed links and refuses any other
  site. The article embeds `youtube-nocookie.com` (no YouTube cookies until the visitor plays it),
  loaded lazily.
- **SEO:** each article has its own title, description, canonical, hreflang and
  `og:type=article` (`pressMetadata` in `lib/seo.ts`), and is listed in the sitemap. An item marked `sample: true` is labelled
  "Exemple" and gets `noindex`.

### 7. Nos partenaires (`partner-logos.tsx`)

The 3 real partners (logos in `public/matchy/partners/`, 320 px .webp, 2 to 7 KB each), each
opening the partner's website in a new tab (`rel="noopener noreferrer"`). GoPayzi links to its
PitchBook profile until it has a website. To add a partner: one line in `PARTNERS`.

### 8. Company story and roadmap

- **`company-story.tsx`:** Randa Touati's photo (`public/showcase/founder.webp`), her quote from
  the content brief (« Chaque compétence mérite d'être visible… ») and her path (teaching, web
  project manager at Dot-IT, co-founder of Matchy+, from her own LinkedIn post).
- **`roadmap.tsx`** (replaces the partners strip and its `[Logo partenaire]` placeholders): "Matchy+
  avance avec sa communauté" and the 5 steps of the brief, in order, with no status or date (the
  brief gives none), then a "Rejoindre Matchy+" button.

---

## Example data: where it is, how to plug the real data

| What                                        | Where                                   | Status on screen          |
| ------------------------------------------- | --------------------------------------- | ------------------------- |
| Pros in the belt, the hero and the pro card | `belt-data.ts` + `landing.beltProfiles` | "Profil d'exemple" (belt) |
| Referral code `MP-7K2Q9`, 10 points         | `landing.referral*`                     | sample code and points    |

**Map figures, going live:** only with **aggregated**, defined and sourced KPIs (API or
analytics). Never send visitor IPs to the browser.

---

## Before production: content to decide

No `[placeholder]` is left in any text (a test in `messages.test.ts` fails if one comes back).
Still to decide:

1. **Referral:** Matchy+ has **no referral system yet**. The code, the QR code and the
   "10 points" should go live only once the programme exists. Otherwise, hide the block.
2. **Example data:** the sample pros of the belt are labelled "Profil d'exemple". The map and the
   search page show no figures.

Older issues, not caused by this work but worth a separate ticket:

- **Brand teal as text:** `#49b8ad` used for text on white has a 2.4:1 contrast (WCAG asks for
  4.5:1). Headings and the footer use it too. This is a brand decision.
- **Arabic brand name:** "Matchy+" followed by Arabic text displays as "+Matchy". Every Arabic
  home text now has `\u200E` right after the "+"; other pages (FAQ, legal) were not checked.
- **Old unused files:** `components/landing/landing-page.tsx`, `matchy/navbar.tsx`,
  `matchy/footer.tsx`, `phone-frame.tsx` and `screens.tsx` are not imported anywhere.

---

## Conventions used (please keep them)

- **Texts:**
  - Every text goes in `messages.ts`, in `fr`, `en` and `ar`. Reuse the app's labels when they
    exist.
  - Messages accept text, lists and tables only (no objects), so maps are stored as rows
    `[id, label]`.
  - Remove keys that become unused.
  - Read lists and tables with `tList(key)` / `tRows(key)` from `useI18n()`: they check the data
    and return `[]` when a key is missing. Never cast `t(...)` with `as unknown as string[]`.
- **Reduce motion, one rule:**
  - The whole home page is wrapped in `<ReducedMotion>` (`motion.tsx`, framer-motion's
    `MotionConfig reducedMotion="user"`): movement is skipped for visitors who ask for it, fades
    stay. Components never pick their markup or animation props from `useReducedMotion()`.
  - Effects framer-motion cannot stop (CSS `animate-ping`, an element moving `top`) use Tailwind
    `motion-reduce:` / `motion-safe:`.
  - JavaScript checks it only for logic: the belt's auto-rotation and spin, the hero's timer and
    pointer tilt, the card's instant swipe.
  - First states must equal the server's. Otherwise React throws hydration error #418.
- **Section headings, two styles from the original site** (no small bar above the title: the
  manager had it removed everywhere):
  - Centred (like `features`): optional teal kicker (`text-sm font-semibold tracking-wide`),
    `h2` `text-brand-blue text-3xl font-bold md:text-4xl`.
  - Beside a visual (like `steps`, `security`, `explore`): `h2` `font-extrabold`, aligned to the
    text side.
- **Phones:** hover handlers react only to `pointerType === 'mouse'`, so content that slides
  under a finger does not close a tooltip.
- **Images:**
  - When replacing a photo, give it a **new file name** (for example `plumber-v2.webp`).
    Otherwise Next.js' image cache and CDNs keep serving the old one.
  - Set `sizes` to the real displayed width.
- **Layering:** a section placed right above the wallet section (`security.tsx`) needs
  `relative z-10` and an opaque background.
- **`Reveal` (`motion.tsx`)** renders a `<div>`, so never wrap an `<li>` with it.
- **Heavy client libraries** load with `next/dynamic` only when their section is near the screen.

---

## Tests

Vitest with jsdom (`vitest.config.ts`, `src/test/setup.ts`: cleanup and an IntersectionObserver
stub), and the same Testing Library setup as `apps/app`.

| File                          | What it covers                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `belt-geometry.test.ts`       | Front / back slots (size, blur, depth), even spacing, nearest slot, shortest turn, stage size                                                                                                                    |
| `messages.test.ts`            | `tList` / `tRows` helpers: only strings kept, the real belt and city tables; no `[placeholder]` in any language                                                                                                  |
| `belt-data.test.ts`           | Profile rows from the texts, invalid data ignored, a photo for every trade, pass / connect sequence                                                                                                              |
| `belt-profile-card.test.tsx`  | Same match thresholds as the app (75 / 55), card content, Passer / Connecter / close                                                                                                                             |
| `belt-match-dialog.test.tsx`  | Focus trap, Escape, click outside, continue                                                                                                                                                                      |
| `referral.test.tsx`           | Sign-up link with code, texts in 3 languages, copy button                                                                                                                                                        |
| `community-map.test.ts`       | Positions on the map, curves, tooltip placement, number format, city names                                                                                                                                       |
| `search-results-data.test.ts` | Search in the URL (site and sign-up)                                                                                                                                                                             |
| `search-results.test.tsx`     | Results page: no count, search, sign-up link with the search, "near you", back link                                                                                                                              |
| `press-data.test.ts`          | News: unique URL-safe slugs, dates (day or month only), texts in 3 languages, LinkedIn links, newest first, YouTube links (accepted / refused), dates per language                                               |
| `home-sections.test.tsx`      | Every new section renders in fr/en/ar, labels, links, search opens the results page, map tooltip (mouse vs touch), news cards and article (video, unknown slug), partner links, new texts exist in all languages |

---

## Checks done before pushing

The new home page was compared with the old one (`origin/dev`), both built the same way:

|                                               | Old           | New           |
| --------------------------------------------- | ------------- | ------------- |
| First load, computer                          | 439 KB        | 622 KB        |
| First load, phone                             | 330 KB        | 413 KB        |
| JavaScript                                    | 291 KB        | 329 KB        |
| Largest element shown (LCP), computer / phone | 1.3 s / 1.2 s | 1.1 s / 1.4 s |
| Layout shift (CLS)                            | 0             | 0             |

Other checks:

- No browser errors and no hydration errors, with and without "reduce motion".
- No broken internal links, and one `<h1>` per page.
- Checked visually in French, English and Arabic, on computer and phone.
- The axe accessibility check shows no new issue apart from the brand teal contrast above.
- Nothing outside `apps/landing` changed, except the lockfile, which has only `apps/landing`
  lines.
