import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('recherche');

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
