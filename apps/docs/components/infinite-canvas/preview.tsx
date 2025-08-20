/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable import/no-unresolved */

import editorCode from '@flowgram.ai/demo-playground/src/editor.tsx?raw';
import toolCode from '@flowgram.ai/demo-playground/src/components/playground-tools.tsx?raw';
import cardCode from '@flowgram.ai/demo-playground/src/components/card.tsx?raw';

import { InfiniteCanvas } from './infinite-canvas.tsx';
import { PreviewEditor } from '../preview-editor';

export const InfiniteCanvasPreview = () => {
  const files = {
    'editor.tsx': {
      active: true,
      code: editorCode,
    },
    'playground-tools.tsx': {
      code: toolCode,
    },
    'card.tsx': {
      code: cardCode,
    },
  };
  return (
    <PreviewEditor
      files={files}
      previewStyle={{ height: 500, position: 'relative' }}
      editorStyle={{ height: 500 }}
    >
      <InfiniteCanvas className="doc-infinite-canvas-preview" />
    </PreviewEditor>
  );
};
