/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { lazySuspense } from '@/shared';

export const PromptEditorWithVariables = lazySuspense(() =>
  import('./editor').then((module) => ({ default: module.PromptEditorWithVariables }))
);

export type { PromptEditorWithVariablesProps } from './editor';
