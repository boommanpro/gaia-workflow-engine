/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { languages } from '@coze-editor/editor/preset-code';
import { typescript } from '@coze-editor/editor/language-typescript';
import { shell } from '@coze-editor/editor/language-shell';
import { python } from '@coze-editor/editor/language-python';
import { json } from '@coze-editor/editor/language-json';
import { mixLanguages } from '@coze-editor/editor';

languages.register('python', python);
languages.register('shell', shell);
languages.register('typescript', typescript);

languages.register('json', {
  // mixLanguages is used to solve the problem that interpolation also uses parentheses, which causes incorrect highlighting
  language: mixLanguages({
    outerLanguage: json.language,
  }),
  languageService: json.languageService,
});

let tsWorkerInit = false;

export const initTsWorker = () => {
  if (tsWorkerInit) {
    return;
  }
  tsWorkerInit = true;

  const tsWorker = new Worker(
    new URL(`@coze-editor/editor/language-typescript/worker`, import.meta.url),
    { type: 'module' }
  );
  typescript.languageService.initialize(tsWorker, {
    compilerOptions: {
      // eliminate Promise error
      lib: ['es2015', 'dom'],
      noImplicitAny: false,
    },
  });
};
