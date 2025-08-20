/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import styled from 'styled-components';

import { CodeEditor, CodeEditorPropsType } from '@/components/code-editor';

const UIMini = styled.div`
  .ͼ1 .cm-content {
    padding: 0;
  }
`;

export function CodeEditorMini(props: CodeEditorPropsType) {
  return (
    <UIMini>
      <CodeEditor
        {...props}
        options={{
          lineNumbersGutter: false,
          foldGutter: false,
          ...(props.options || {}),
        }}
      />
    </UIMini>
  );
}
