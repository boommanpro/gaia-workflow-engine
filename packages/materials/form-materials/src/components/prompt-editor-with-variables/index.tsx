/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { PromptEditor, PromptEditorPropsType } from '@/components/prompt-editor';

import { VariableTree } from './extensions/variable-tree';
import { VariableTagInject } from './extensions/variable-tag';

export function PromptEditorWithVariables(props: PromptEditorPropsType) {
  return (
    <PromptEditor {...props}>
      <VariableTree />
      <VariableTagInject />
    </PromptEditor>
  );
}
