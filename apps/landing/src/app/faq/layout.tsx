import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foire Aux Questions (FAQ)',
  description:
    'Trouvez les réponses aux questions les plus fréquentes sur Matchy+, notre fonctionnement, nos abonnements et la sécurité de notre plateforme.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ | Matchy+',
    description:
      'Trouvez les réponses aux questions les plus fréquentes sur Matchy+, notre fonctionnement et la sécurité de notre plateforme.',
    url: '/faq',
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
