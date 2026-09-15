import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d’Utilisation',
  description:
    'Consultez les conditions générales d’utilisation de Matchy+, vos droits et obligations sur notre plateforme de mise en relation.',
  alternates: {
    canonical: '/terms-of-service',
  },
  openGraph: {
    title: 'Conditions Générales d’Utilisation | Matchy+',
    description:
      'Consultez les conditions générales d’utilisation de Matchy+, vos droits et obligations.',
    url: '/terms-of-service',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
