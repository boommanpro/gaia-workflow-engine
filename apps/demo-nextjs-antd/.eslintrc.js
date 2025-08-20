const { defineConfig } = require('@flowgram.ai/eslint-config');

module.exports = defineConfig({
  parser: '@babel/eslint-parser',
  preset: 'web',
  packageRoot: __dirname,
  parserOptions: {
    requireConfigFile: false,
  },
  rules: {
    'no-console': 'off',
    'react/prop-types': 'off',
  },
  plugins: ['json'],
  extends: ['next', 'next/core-web-vitals'],
  settings: {
    react: {
      version: 'detect',
    },
  },
});
