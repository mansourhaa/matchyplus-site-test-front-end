import { DEFAULT_LOCALE } from '@/features/i18n/messages';
import { localizePath } from '@/features/i18n/routing';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Page introuvable | Matchy+',
  robots: { index: false, follow: true },
};

// Only reached by URLs the proxy does not localize (file-like paths); everything else gets the
// localized page in `[lang]/not-found.tsx`.
export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <main className="inner-page">
          <div className="narrow container flex flex-col items-center justify-center py-20 text-center">
            <span className="eyebrow">404</span>
            <h1 className="mt-2">Page introuvable</h1>
            <p className="lead mx-auto mt-4 max-w-md">
              La page que vous recherchez n’existe pas ou a été déplacée.
            </p>
            <div className="mt-8">
              <a href={localizePath(DEFAULT_LOCALE, '/')} className="button button-primary">
                Retour à l’accueil
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
