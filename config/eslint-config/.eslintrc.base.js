/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['plugin:prettier/recommended'],
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      babelrc: false,
      configFile: false,
      cwd: __dirname,
      presets: ['@babel/preset-env', '@babel/preset-react'],
    },
  },
  plugins: ['babel'],
  ignorePatterns: [
    '**/*.d.ts',
    '**/__mocks__',
    '**/node_modules',
    '**/build',
    '**/dist',
    '**/es',
    '**/lib',
    '**/.codebase',
    '**/.changeset',
    '**/config',
    '**/common/scripts',
    '**/output',
    'error-log-str.js',
    '*.bundle.js',
    '*.min.js',
    '*.js.map',
    '**/output',
    '**/*.log',
    '**/tsconfig.tsbuildinfo',
    '**/vitest.config.ts',
    'package.json',
    '*.json',
  ],
  rules: {
    // eslint-disable-next-line global-require
    'prettier/prettier': [
      'warn',
      {
        semi: true,
        singleQuote: true,
        printWidth: 100,
        usePrettierrc: false,
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      settings: {
        'import/resolver': {
          node: {
            moduleDirectory: ['node_modules', 'src'],
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          },
        },
      },
      extends: [
        'plugin:prettier/recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
      ],
      plugins: ['@typescript-eslint', 'import'],

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'import/prefer-default-export': 'off',
        'lines-between-class-members': 'warn',
        'import/no-unresolved': 'warn',
        'react/jsx-no-useless-fragment': 'off',
        'no-unused-vars': 'off',
        'no-redeclare': 'off',
        'prefer-destructurin': 'off',
        'no-underscore-dangle': 'off',
        'no-empty-function': 'off',
        'no-multi-assign': 'off',
        'arrow-body-style': 'warn',
        'no-useless-constructor': 'off',
        'no-param-reassign': 'off',
        'max-classes-per-file': 'off',
        'grouped-accessor-pairs': 'off',
        'no-plusplus': 'off',
        'no-restricted-syntax': 'off',
        'react/destructuring-assignment': 'off',
        'import/extensions': 'off',
        'consistent-return': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'react/jsx-filename-extension': [1, { extensions: ['.jsx', '.tsx'] }],
        'no-use-before-define': 'off',
        'no-bitwise': 'off',
        'no-case-declarations': 'off',
        'react/no-array-index-key': 'off',
        'react/require-default-props': 'off',
        'no-dupe-class-members': 'off',
        'react/self-closing-comp': [
          'error',
          {
            component: true,
            html: false,
          },
        ],
        'react/jsx-props-no-spreading': 'off',
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'no-shadow': 'off',
        'class-methods-use-this': 'off',
        'default-param-last': 'off',
        'prettier/prettier': [
          'warn',
          {
            semi: true,
            singleQuote: true,
            printWidth: 100,
            usePrettierrc: false,
          },
        ],
        'import/no-cycle': 'error',
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: true,
          },
        ],
        'import/no-relative-packages': 'error',
        'import/order': [
          'warn',
          {
            groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index'], 'unknown'],
            pathGroups: [
              {
                pattern: 'react*',
                group: 'builtin',
                position: 'before',
              },
              {
                pattern: '@/**',
                group: 'internal',
                position: 'before',
              },
              {
                pattern: './*.+(css|sass|less|scss|pcss|styl)',
                patternOptions: { dot: true, nocomment: true },
                group: 'unknown',
                position: 'after',
              },
            ],
            alphabetize: {
              order: 'desc' /* sort in ascending order. Options: ['ignore', 'asc', 'desc'] */,
              caseInsensitive: true /* ignore case. Options: [true, false] */,
            },
            pathGroupsExcludedImportTypes: ['builtin'],
            'newlines-between': 'always',
          },
        ],
      },
    },
  ],
};
