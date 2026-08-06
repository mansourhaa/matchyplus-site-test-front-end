import type { Metadata } from 'next';
import { Baloo_2, Cairo } from 'next/font/google';

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
  description:
    "Tunisia's leading geolocation-based platform for finding reliable nannies, gardeners, drivers, and more.",
  icons: {
    icon: '/logo-matchy.svg',
    apple: '/logo-matchy.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${baloo.variable} ${cairo.variable} ${baloo.className}`}>{children}</body>
    </html>
  );
}
