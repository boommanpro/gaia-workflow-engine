/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 150],
    'subject-full-stop': [0, 'never'],
    'subject-case': [
      2,
      'never',
      [
        'upper-case', // UPPERCASE
      ],
    ],
  },
};
