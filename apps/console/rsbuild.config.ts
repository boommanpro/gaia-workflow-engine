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
      'process.env.ASSET_PREFIX': JSON.stringify(process.env.ASSET_PREFIX || ''),
    },
  },
  html: {
    title: 'Gaia — AI Workflow Editor',
    template: path.resolve(__dirname, './index.html'),
    templateParameters: {
      // 供 index.html 模板拼接 public 资源路径（favicon 等）
      assetPrefix: process.env.ASSET_PREFIX || './',
    },
  },
  output: {
    assetPrefix: process.env.ASSET_PREFIX || './',
    distPath: {
      root: 'dist',
    },
  },
  server: {
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:48080',
        changeOrigin: true,
      },
    },
  },
  tools: {
    rspack: (config) => {
      // GitHub Pages SPA fallback: 构建完成后复制 dist/index.html 为 dist/404.html
      // 当直接访问 /admin/workflows 等深链时，GitHub Pages 返回 404.html，
      // 其内容与构建后的 index.html 完全相同（含注入的 JS/CSS），从而让 React Router 接管路由
      const fs = require('fs');
      class CopyIndexTo404Plugin {
        apply(compiler: any) {
          compiler.hooks.afterEmit.tap('CopyIndexTo404Plugin', () => {
            const src = path.resolve(__dirname, './dist/index.html');
            const dest = path.resolve(__dirname, './dist/404.html');
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          });
        }
      }
      config.plugins = config.plugins || [];
      config.plugins.push(new CopyIndexTo404Plugin());
      /**
       * ignore warnings from @coze-editor/editor/language-typescript
       */
      config.ignoreWarnings = [/Critical dependency: the request of a dependency is an expression/];
    },
  },
});