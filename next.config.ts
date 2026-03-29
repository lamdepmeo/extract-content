import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['app', 'lib', 'netlify'],
  },
};

export default nextConfig;
