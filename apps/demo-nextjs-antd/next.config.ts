import path from 'path';

import type { NextConfig } from 'next';

const __dirname = new URL('.', import.meta.url).pathname;

const nextConfig: NextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@app': path.resolve(__dirname, 'src/app'),
      '@editor': path.resolve(__dirname, 'src/editor'),
    };
    return config;
  },
};

export default nextConfig;
