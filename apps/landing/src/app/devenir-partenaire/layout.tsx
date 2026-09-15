import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Devenir Partenaire',
  description:
    'Rejoignez le réseau Matchy+ en tant que partenaire. Développez votre activité et collaborez avec un écosystème de professionnels qualifiés.',
  alternates: {
    canonical: '/devenir-partenaire',
  },
  openGraph: {
    title: 'Devenir Partenaire | Matchy+',
    description:
      'Rejoignez le réseau Matchy+ en tant que partenaire et collaborez avec un écosystème de professionnels qualifiés.',
    url: '/devenir-partenaire',
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
