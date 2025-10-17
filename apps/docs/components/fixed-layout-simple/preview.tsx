/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable import/no-unresolved */

import nodeRegistriesCode from '@flowgram.ai/demo-fixed-layout-simple/src/node-registries.ts?raw';
import initialDataCode from '@flowgram.ai/demo-fixed-layout-simple/src/initial-data.ts?raw';
import indexCssCode from '@flowgram.ai/demo-fixed-layout-simple/src/index.css?raw';
import useEditorPropsCode from '@flowgram.ai/demo-fixed-layout-simple/src/hooks/use-editor-props.tsx?raw';
import editorCode from '@flowgram.ai/demo-fixed-layout-simple/src/editor.tsx?raw';
import toolsCode from '@flowgram.ai/demo-fixed-layout-simple/src/components/tools.tsx?raw';
import nodeAdderCode from '@flowgram.ai/demo-fixed-layout-simple/src/components/node-adder.tsx?raw';
import miniMapCode from '@flowgram.ai/demo-fixed-layout-simple/src/components/minimap.tsx?raw';
import branchAdderCode from '@flowgram.ai/demo-fixed-layout-simple/src/components/branch-adder.tsx?raw';
import baseNodeCode from '@flowgram.ai/demo-fixed-layout-simple/src/components/base-node.tsx?raw';

import { FixedLayoutSimple } from './index';
import { PreviewEditor } from '../preview-editor';

const indexCode = {
  code: editorCode,
  active: true,
};

export const FixedLayoutSimplePreview = () => (
  <div
    style={{
      zIndex: 1,
      position: 'relative',
    }}
  >
    <PreviewEditor
      files={{
        'editor.tsx': indexCode,
        'index.css': indexCssCode,
        'initial-data.ts': initialDataCode,
        'node-registries.ts': nodeRegistriesCode,
        'use-editor-props.tsx': useEditorPropsCode,
        'base-node.tsx': baseNodeCode,
        'branch-adder.tsx': branchAdderCode,
        'minimap.tsx': miniMapCode,
        'node-adder.tsx': nodeAdderCode,
        'tools.tsx': toolsCode,
      }}
      previewStyle={{
        height: 500,
      }}
      editorStyle={{
        height: 500,
      }}
    >
      <FixedLayoutSimple />
    </PreviewEditor>
  </div>
);
