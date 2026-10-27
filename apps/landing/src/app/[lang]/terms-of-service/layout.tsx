import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('terms-of-service');

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
