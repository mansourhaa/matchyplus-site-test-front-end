import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@saas-boilerplate/ui'],
};

export default nextConfig;
