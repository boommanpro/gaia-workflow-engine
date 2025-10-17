/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { StorybookConfig } from 'storybook-react-rsbuild'

const config: StorybookConfig = {
  stories: [
    '../src/**/stories/**/*.stories.tsx',
    '../src/**/stories/**/*.story.tsx',
    '../src/**/stories/**/*.mdx',
  ],
  framework: 'storybook-react-rsbuild',
  rsbuildFinal: (config) => {
    // Customize the final Rsbuild config here
    return config
  },
}

export default config
