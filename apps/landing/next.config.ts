import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pages are served as /fr/, /en/faq/… — the URLs the canonical and hreflang tags declare.
  trailingSlash: true,
};

export default nextConfig;
