/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/free-layout-editor/index.css';

import { FreeLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/free-layout-editor';

import './index.less';

import { useEditorProps } from './use-editor-props';
import { FlowGramLogoMask } from './musk';

export const FlowGramLogo = () => {
  const editorProps = useEditorProps();
  return (
    <div className="flowgram-logo-container">
      <FlowGramLogoMask />
      <FreeLayoutEditorProvider {...editorProps}>
        <EditorRenderer />
      </FreeLayoutEditorProvider>
    </div>
  );
};
