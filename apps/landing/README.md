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
| `pnpm test`                 | Vitest + Testing Library: **126 tests**            |
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

| #   | Section                        | File(s) in `src/components/matchy/`                                                                                                                                     | Status    |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Hero: live phone + search      | `hero.tsx`, `hero-live-phone.tsx`, `hero-phone-overlay.tsx`, `hero-phone-bubble.tsx`, `hero-mini-card.tsx`, `hero-search.tsx`                                           | changed   |
| 2   | Features                       | `features.tsx`                                                                                                                                                          | unchanged |
| 3   | Services belt (10 trades)      | `services-belt.tsx`, `belt-person.tsx`, `belt-floor.tsx`, `belt-service-info.tsx`, `belt-geometry.ts`, `belt-profile-card.tsx`, `belt-match-dialog.tsx`, `belt-data.ts` | new       |
| 4   | Without / with Matchy+         | `why-matchy.tsx`                                                                                                                                                        | new       |
| 5   | How it works (`#how`)          | `steps.tsx`                                                                                                                                                             | unchanged |
| 6   | Pro storefront card + referral | `pro-branding.tsx`, `referral.tsx`                                                                                                                                      | new       |
| 7   | Live community map             | `live-community.tsx`, `community-marker.tsx`, `community-arcs.tsx`, `community-tooltip.tsx`, `community-counters.tsx`, `community-map.ts`                               | new       |
| 8   | Wallet / security              | `security.tsx`                                                                                                                                                          | unchanged |
| 9   | Explore                        | `explore.tsx`                                                                                                                                                           | unchanged |
| 10  | Company story                  | `company-story.tsx`                                                                                                                                                     | new       |
| 11  | Partnerships                   | `partnerships.tsx`                                                                                                                                                      | new       |
| 12  | Call to action                 | `cta.tsx`                                                                                                                                                               | unchanged |

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
- **Results page** (`app/[lang]/recherche/`, `search-results.tsx`, `search-results-data.ts`): the
  site's blue sub-page band with "37 professionnels disponibles", the search (service, city or
  "Près de chez vous") and a "Créer mon compte gratuit" button to the app's sign-up page
  (`buildSearchUrl` adds `service` and `ville`). The number is a **sample** (same search, same
  number, 12 to 48) and the page says "Chiffre indicatif" until a search API exists. The page is
  `noindex` and stays out of the sitemap.
  - The navbar has no login link, so the hero keeps "Déjà membre ? Connexion".

### 2. Services belt

- **What it is:** a 3D carousel of 10 professionals (plumber, electrician, driver, nanny,
  cleaner, delivery, cook, seamstress, gardener, waiter) on a white stage with no box: the floor
  fades out on every side into the white page (`EDGE_FADE` in `motion.tsx`). You can drag it, click a person, or use the keyboard. At the manager's request there is no
  numbered index on the side.
- **Hover tag:** before the click, hovering a person shows a small white tag beside them with their
  name and daily price range ("Youssef B. · 25 à 30 DT/jour", built by `personTag` in `belt-data.ts`). The same
  text is part of the person's accessible name, so screen readers hear it too.
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

`live-community.tsx` keeps the layout, the sample updates and the phone scroll. One city point
is `community-marker.tsx`, the lines from Tunis are `community-arcs.tsx`, the city tooltip is
`community-tooltip.tsx` and the two counters (over the map, or in a row on phones) are
`community-counters.tsx`.

Based on the manager's reference (a live visitors map), rebuilt in the site's theme:

- **Layout:** the same centered, animated heading as the other sections. No card around it: the
  light world map sits directly on a white section and fades out on all four sides
  (`EDGE_FADE`, the same fade as the belt floor). Tunisia, France, Russia,
  Algeria and Morocco are in brand blue (the manager's choice).
- **Texts (manager's wording):** badge "Acquisition & visibilité internationale", title
  "Matchy+ attire des professionnels dans plusieurs pays". No "active now" wording anywhere.
- **Counters in the map:** "Présence internationale", the headline number, floats over the South
  Pacific on the left; "Audience Matchy+" over the Indian Ocean (positions in `STAT_SPOTS`). No
  city is under them. They appear one after another, then float gently. On phones, they sit in a row
  under the map instead, so they never hide a city.
- **Cities:** 9 cities pulse on the map. Hovering or tapping one shows its name and number of
  visitors.
- **Animations:**
  - curved lines drawn from Tunis (where Matchy+ was born) to each city;
  - a ring and a "+1" when a visitor arrives;
  - numbers that slide when they change;
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

### 6. Company story and partnerships

- **`company-story.tsx`:** the story behind Matchy+: the founder's photo
  (`public/showcase/founder.webp`), quote and story. The quote and name are still placeholders
  (see below).
- **`partnerships.tsx`:** the heading, a sliding strip of big cards that alternates partner logos
  (white cards, placeholders for now) with free places ("Votre marque ici" with a "+", linking
  to `/devenir-partenaire/`), and the "Devenir partenaire" button. The strip fades out at both
  ends. The 3 benefit cards were removed at the manager's request.

---

## Example data: where it is, how to plug the real data

| What                                        | Where                                                      | Status on screen          |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| Pros in the belt, the hero and the pro card | `belt-data.ts` + `landing.beltProfiles`                    | "Profil d'exemple" (belt) |
| Community map: cities, counts, audience     | `community-map.ts` (`SAMPLE_LOCATIONS`, `SAMPLE_AUDIENCE`) | "Données d'exemple"       |
| Referral code `MP-7K2Q9`, 10 points         | `landing.referral*`                                        | sample code and points    |
| Search results count                        | `search-results-data.ts` (`sampleResultCount`)             | "Chiffre indicatif"       |

**Community map, going live:** replace the sample data with **aggregated** numbers from the API
or Google Analytics: city, approximate position and active visitors. Never send visitor IPs to
the browser.

The sample updates only run while the section is on screen and the tab is visible.

---

## Before production: content to decide

These placeholders are visible on the page today:

1. **Company story:** `[Prénom Nom]` and `[Phrase forte de la fondatrice…]` (the photo is in place).
2. **Partnerships:** `[Logo partenaire]` in the white cards of the strip.
3. **Referral:** Matchy+ has **no referral system yet**. The code, the QR code and the
   "10 points" should go live only once the programme exists. Otherwise, hide the block.
4. **Example data:** the community map, the sample pros and the search results count are
   labelled as examples. Real data makes them much stronger.

Older issues, not caused by this work but worth a separate ticket:

- **Brand teal as text:** `#49b8ad` used for text on white has a 2.4:1 contrast (WCAG asks for
  4.5:1). Headings and the footer use it too. This is a brand decision.
- **Arabic brand name:** "Matchy+" followed by Arabic text displays as "+Matchy". It is fixed in
  the community texts with `‎` after the "+"; the other sections still need it.
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
- **Section headings, two styles from the original site:**
  - Centred (like `features`): teal bar `h-1 w-10 rounded`, optional teal kicker
    (`text-sm font-semibold tracking-wide`), `h2` `text-brand-blue text-3xl font-bold md:text-4xl`.
  - Beside a visual (like `steps`, `security`, `explore`): blue bar `h-1 w-14 rounded-full`
    aligned to the text side, `h2` `font-extrabold`.
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

| File                          | What it covers                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `belt-geometry.test.ts`       | Front / back slots (size, blur, depth), even spacing, nearest slot, shortest turn, stage size                                                       |
| `messages.test.ts`            | `tList` / `tRows` helpers: only strings kept, the real belt and city tables                                                                         |
| `belt-data.test.ts`           | Profile rows from the texts, invalid data ignored, a photo for every trade, pass / connect sequence                                                 |
| `belt-profile-card.test.tsx`  | Same match thresholds as the app (75 / 55), card content, Passer / Connecter / close                                                                |
| `belt-match-dialog.test.tsx`  | Focus trap, Escape, click outside, continue                                                                                                         |
| `referral.test.tsx`           | Sign-up link with code, texts in 3 languages, copy button                                                                                           |
| `community-map.test.ts`       | Totals, positions on the map, curves, tooltip placement, number format, city names                                                                  |
| `search-results-data.test.ts` | Search in the URL (site and sign-up), sample count range and stability                                                                              |
| `search-results.test.tsx`     | Results page: count, search, sign-up link with the search, "near you", back link                                                                    |
| `home-sections.test.tsx`      | Every new section renders in fr/en/ar, labels, links, search opens the results page, map tooltip (mouse vs touch), new texts exist in all languages |

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
