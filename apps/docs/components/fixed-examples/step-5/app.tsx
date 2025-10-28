/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/fixed-layout-editor/index.css';

import { FixedLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/fixed-layout-editor';

import { useEditorProps } from './use-editor-props';

const FlowGramApp = () => {
  const editorProps = useEditorProps();
  return (
    <FixedLayoutEditorProvider {...editorProps}>
      <EditorRenderer />
    </FixedLayoutEditorProvider>
  );
};

export default FlowGramApp;
