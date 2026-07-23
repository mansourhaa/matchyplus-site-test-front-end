import '@/app/globals.css';
import { ClientProvider } from '@/components/shared/providers/client-provider';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';
import { Baloo_2, Inter } from 'next/font/google';

import { Toaster } from '@saas-boilerplate/ui/components/sonner';
import { TooltipProvider } from '@saas-boilerplate/ui/components/tooltip';

const inter = Inter({ subsets: ['latin'] });

// Registers the "Baloo 2" font-face app-wide so the auth screens' inline
// `fontFamily: "'Baloo 2', sans-serif"` (matching the old app's branding) resolves to the
// real font instead of silently falling back to a generic sans-serif.
const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo-2',
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={baloo2.variable}>
      <body className={inter.className}>
        <TooltipProvider>
          <ClientProvider>{children}</ClientProvider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
