import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bientôt Disponible',
  description:
    'Matchy+ arrive très bientôt. Inscrivez-vous pour être parmi les premiers informés du lancement.',
  alternates: {
    canonical: '/coming-soon',
  },
  openGraph: {
    title: 'Bientôt Disponible | Matchy+',
    description: 'Matchy+ arrive très bientôt.',
    url: '/coming-soon',
  },
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
