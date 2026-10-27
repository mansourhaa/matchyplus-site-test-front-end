import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('coming-soon');

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
