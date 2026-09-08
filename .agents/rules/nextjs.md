# Next.js 15 & React 19 Standards (Antigravity Rules)

## 1. Server-First Architecture & App Router

- **App Router Exclusively**: All routes reside in `src/app/` using route groups (`(auth)`, `(dashboard)`, `(public)`). Never use or reference legacy Pages Router patterns (`getServerSideProps`, `getStaticProps`, `_app.tsx`, `_document.tsx`).
- **Server Components by Default**:
  - Keep components as React Server Components (RSC) unless interactivity is explicitly required.
  - Server components handle cookie verification, redirect gates, metadata generation, and non-interactive layout structures.
  - Never import client-only hooks (`useState`, `useEffect`, `useRef`, `useSearchParams`, Redux hooks) in Server Components.

## 2. Client Components & `'use client'` Directive

- **Placement**: The `'use client'` directive MUST always be the very first statement on line 1 of the file, before any imports or comments.
- **Leaf-First Interactivity**:
  - Push `'use client'` down to the smallest interactive leaf components (e.g. form inputs, toggle switches, buttons, modals).
  - Do not mark top-level layouts or data wrappers as `'use client'` unless necessary.
- **Suspense Wrapping for Search Params**:
  - Any client component consuming `useSearchParams()` must be wrapped in a `<Suspense fallback={...}>` boundary to prevent de-opting parent route segments to client-side rendering.

## 3. Navigation & Routing

- **Import Source**: Always import navigation primitives from `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`, `redirect`, `notFound`). Never import from `next/router`.
- **Links & Performance**:
  - Use `next/link` for internal client-side transitions.
  - Use `next/image` with explicit `width`, `height`, or `fill` and descriptive `alt` text for optimized responsive images.

## 4. Error Handling & Streaming

- Co-locate `loading.tsx` for instant streaming transitions.
- Co-locate `error.tsx` (marked `'use client'`) with `reset` capability to isolate component errors without crashing the entire app shell.
- Provide `not-found.tsx` for clean 404 handling within route segments.
