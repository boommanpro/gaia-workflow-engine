/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable import/no-unresolved */

import tryCatch from '@flowgram.ai/demo-fixed-layout-simple/src/data/tryCatch.ts?raw';
import slot from '@flowgram.ai/demo-fixed-layout-simple/src/data/slot.ts?raw';
import multiOutputs from '@flowgram.ai/demo-fixed-layout-simple/src/data/multiOutputs.ts?raw';
import multiInputs from '@flowgram.ai/demo-fixed-layout-simple/src/data/multiInputs.ts?raw';
import loop from '@flowgram.ai/demo-fixed-layout-simple/src/data/loop.ts?raw';
import dynamicSplit from '@flowgram.ai/demo-fixed-layout-simple/src/data/dynamicSplit.ts?raw';

import { PreviewEditor } from '../preview-editor.tsx';
import { FixedLayoutSimple } from './fixed-layout-simple.tsx';

export function CompositeNodesPreview(props: { cellHeight?: number }) {
  const previewWidth = '50%';
  const editorWidth = '50%';
  const cellHeight = props.cellHeight || 300;
  return (
    <table
      className=""
      style={{
        width: '100%',
        border: '1px solid var(--rp-c-divider-light)',
        zIndex: 1,
        position: 'relative',
      }}
    >
      <tr>
        <td style={{ textAlign: 'center' }}>dynamicSplit</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: dynamicSplit,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              width: editorWidth,
              height: cellHeight,
            }}
          >
            <FixedLayoutSimple hideTools demo="dynamicSplit" />
          </PreviewEditor>
        </td>
      </tr>
      <tr>
        <td style={{ textAlign: 'center' }}>loop</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: loop,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              height: cellHeight,
              width: editorWidth,
            }}
          >
            <FixedLayoutSimple hideTools demo="loop" />
          </PreviewEditor>
        </td>
      </tr>
      <tr>
        <td style={{ textAlign: 'center' }}>tryCatch</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: tryCatch,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              height: cellHeight,
              width: editorWidth,
            }}
          >
            <FixedLayoutSimple hideTools demo="tryCatch" />
          </PreviewEditor>
        </td>
      </tr>
      <tr>
        <td style={{ textAlign: 'center' }}>multiInputs</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: multiInputs,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              height: cellHeight,
              width: editorWidth,
            }}
          >
            <FixedLayoutSimple hideTools demo="multiInputs" />
          </PreviewEditor>
        </td>
      </tr>
      <tr>
        <td style={{ textAlign: 'center' }}>multiOutputs</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: multiOutputs,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              height: cellHeight,
              width: editorWidth,
            }}
          >
            <FixedLayoutSimple hideTools demo="multiOutputs" />
          </PreviewEditor>
        </td>
      </tr>
      <tr>
        <td style={{ textAlign: 'center' }}>slot</td>
        <td>
          <PreviewEditor
            codeInRight
            files={{
              'index.tsx': {
                code: slot,
                active: true,
              },
            }}
            previewStyle={{
              width: previewWidth,
              height: cellHeight,
              position: 'relative',
            }}
            editorStyle={{
              height: cellHeight,
              width: editorWidth,
            }}
          >
            <FixedLayoutSimple hideTools demo="slot" />
          </PreviewEditor>
        </td>
      </tr>
    </table>
  );
}
