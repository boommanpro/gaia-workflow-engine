/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EditorRenderer, FixedLayoutEditorProvider } from '@flowgram.ai/fixed-layout-editor';

import { FlowNodeRegistries } from './nodes';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks/use-editor-props';
import { DemoTools } from './components';

import '@flowgram.ai/fixed-layout-editor/index.css';

export const Editor = () => {
  /**
   * Editor Config
   */
  const editorProps = useEditorProps(initialData, FlowNodeRegistries);

  return (
    <div className="doc-feature-overview">
      <FixedLayoutEditorProvider {...editorProps}>
        <EditorRenderer />
        <DemoTools />
      </FixedLayoutEditorProvider>
    </div>
  );
};
