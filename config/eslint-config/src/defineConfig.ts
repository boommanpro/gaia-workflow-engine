/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import path from 'path';

import type { ESLintConfig, Rules } from 'eslint-define-config';

type ESLintConfigMode = 'web' | 'node' | 'base';

export interface EnhanceESLintConfig extends ESLintConfig {
  /**
   * project root dir
   */
  packageRoot?: string;
  /**
   * config mode
   */
  preset: ESLintConfigMode;
}

/**
 * Define an ESLint config.
 *
 * @param config ESLint config.
 * @returns ESLint config.
 */
export const defineConfig = (config: EnhanceESLintConfig): ESLintConfig => {
  const {
    packageRoot,
    preset,
    settings,
    extends: _extends = [],
    rules = {},
    ...userConfig
  } = config;

  const defaultRules: Rules = {};

  return {
    extends: [path.resolve(__dirname, `../.eslintrc.${preset}.js`), ..._extends],
    settings: {
      ...settings,
      'import/resolver': {
        typescript: {
          project: packageRoot,
        },
      },
    },
    rules: {
      ...defaultRules,
      ...rules,
    },
    ...userConfig,
  };
};
