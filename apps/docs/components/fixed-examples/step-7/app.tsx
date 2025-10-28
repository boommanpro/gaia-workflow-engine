/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/fixed-layout-editor/index.css';

import { FixedLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/fixed-layout-editor';

import { useEditorProps } from './use-editor-props';
import { Tools } from './tools';
import { Minimap } from './minimap';

const FlowGramApp = () => {
  const editorProps = useEditorProps();
  return (
    <FixedLayoutEditorProvider {...editorProps}>
      <EditorRenderer />
      <Tools />
      <Minimap />
    </FixedLayoutEditorProvider>
  );
};

export default FlowGramApp;
