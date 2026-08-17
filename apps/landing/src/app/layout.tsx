import { I18nProvider } from '@/features/i18n/i18n-provider';
import 'flag-icons/css/flag-icons.min.css';
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Baloo_2 } from 'next/font/google';

import './globals.css';

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'Matchy+',
  description: 'Connect with trusted professionals near you',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={`${baloo.variable} ${cairo.variable} ${baloo.className}`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
