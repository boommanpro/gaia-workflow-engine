/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import styled from 'styled-components';

import { CodeEditor, type CodeEditorPropsType } from '@/components/code-editor';

const UIMini = styled.div`
  .ͼ1 .cm-content {
  }
`;

/**
 * @deprecated use mini in CodeEditorPropsType instead
 */
export function CodeEditorMini(props: CodeEditorPropsType) {
  return (
    <UIMini>
      <CodeEditor
        {...props}
        options={{
          lineNumbersGutter: false,
          foldGutter: false,
          minHeight: 24,
          ...(props.options || {}),
        }}
      />
    </UIMini>
  );
}
