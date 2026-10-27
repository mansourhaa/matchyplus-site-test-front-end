import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// The layout's `dynamicParams = false` would reject these paths during routing, before the
// localized not-found boundary of `[lang]` can render.
export const dynamicParams = true;

export const metadata: Metadata = {
  title: '404',
  robots: { index: false, follow: true },
};

// Unknown paths under a valid locale render the localized not-found page with a 404 status.
export default function CatchAll() {
  notFound();
}
