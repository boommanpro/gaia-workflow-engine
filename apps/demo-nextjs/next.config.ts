/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

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
      '@runtime': path.resolve(__dirname, 'src/runtime'),
    };
    return config;
  },
};

export default nextConfig;
