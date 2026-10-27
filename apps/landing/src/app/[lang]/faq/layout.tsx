import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('faq');

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
