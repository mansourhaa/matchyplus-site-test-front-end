import '@/app/globals.css';
import { ClientProvider } from '@/components/shared/providers/client-provider';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';
import { Baloo_2, Cairo } from 'next/font/google';

import { Toaster } from '@saas-boilerplate/ui/components/sonner';
import { TooltipProvider } from '@saas-boilerplate/ui/components/tooltip';

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
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={`${baloo.variable} ${cairo.variable} ${baloo.className}`}>
        <TooltipProvider>
          <ClientProvider>{children}</ClientProvider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
