/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLess } from '@rsbuild/plugin-less';
import { defineConfig } from '@rsbuild/core';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// 加载环境变量文件
const envFile = process.env.ENV_FILE || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development');
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  const envConfig = dotenv.config({ path: envPath });
  Object.assign(process.env, envConfig.parsed);
}

export default defineConfig({
  plugins: [pluginReact(), pluginLess()],
  source: {
    entry: {
      index: './src/main.tsx',
    },
    /**
     * support inversify @injectable() and @inject decorators
     */
    decorators: {
      version: 'legacy',
    },
    define: {
      'process.env.REACT_APP_SERVER_DOMAIN': JSON.stringify(process.env.REACT_APP_SERVER_DOMAIN ),
      'process.env.REACT_APP_SERVER_PORT': JSON.stringify(process.env.REACT_APP_SERVER_PORT ),
      'process.env.REACT_APP_SERVER_PROTOCOL': JSON.stringify(process.env.REACT_APP_SERVER_PROTOCOL ),
    },
  },
  html: {
    title: 'demo-free-layout',
    template: path.resolve(__dirname, './index.html'),
  },
  output: {
    assetPrefix: process.env.ASSET_PREFIX || './',
    distPath: {
      root: 'workflow-editor',
    },
  },
  tools: {
    rspack: {
      /**
       * ignore warnings from @coze-editor/editor/language-typescript
       */
      ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
    },
  },
});