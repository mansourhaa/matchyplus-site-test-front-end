import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('devenir-partenaire');

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
