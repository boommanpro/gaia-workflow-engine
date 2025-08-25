/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const { excludeIgnoredFiles } = require('./utils');
const micromatch = require('micromatch');
const path = require('path');
const fs = require('fs');

module.exports = {
  '**/*.{js,ts,tsx,jsx,mjs,cjs,scss,less,css,sh}': async files => {
    return [
      `rush license-header`,
      `git add ${files.join(' ')}`,
    ];
  },
  '**/*.{ts,tsx,js,jsx,mjs}': async files => {
    const match = micromatch.not(files, [
      '**/common/_templates/!(_*)/**/(.)?*',
    ]);
    const filesToLint = await excludeIgnoredFiles(match);
    return [
      `eslint --fix --cache ${filesToLint} --no-error-on-unmatched-pattern`,
    ];
  },
  '**/package.json': async files => {
    const match = micromatch.not(files, [
      '**/common/_templates/!(_*)/**/(.)?*',
    ]);
    const filesToLint = await excludeIgnoredFiles(match);
    return [`eslint --cache ${filesToLint}`];
  },
};
