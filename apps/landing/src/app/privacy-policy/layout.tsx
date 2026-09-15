import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description:
    'Découvrez comment Matchy+ protège, traite et respecte la confidentialité de vos données personnelles conformément aux standards internationaux.',
  alternates: {
    canonical: '/privacy-policy',
  },
  openGraph: {
    title: 'Politique de Confidentialité | Matchy+',
    description:
      'Découvrez comment Matchy+ protège, traite et respecte la confidentialité de vos données personnelles.',
    url: '/privacy-policy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
