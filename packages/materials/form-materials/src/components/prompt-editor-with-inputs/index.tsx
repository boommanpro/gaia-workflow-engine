/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { lazySuspense } from '@/shared';

export const PromptEditorWithInputs = lazySuspense(() =>
  import('./editor').then((module) => ({ default: module.PromptEditorWithInputs }))
);

export type { PromptEditorWithInputsProps } from './editor';
