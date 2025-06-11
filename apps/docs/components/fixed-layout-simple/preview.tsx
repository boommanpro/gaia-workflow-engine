/* eslint-disable import/no-unresolved */
import { PreviewEditor } from '../preview-editor';
import { FixedLayoutSimple } from './index';

import nodeRegistriesCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/node-registries.ts';
import initialDataCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/initial-data.ts';
import indexCssCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/index.css';
import useEditorPropsCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/hooks/use-editor-props.tsx';
import editorCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/editor.tsx';
import toolsCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/components/tools.tsx';
import nodeAdderCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/components/node-adder.tsx';
import miniMapCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/components/minimap.tsx';
import branchAdderCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/components/branch-adder.tsx';
import baseNodeCode from '!!raw-loader!@flowgram.ai/demo-fixed-layout-simple/src/components/base-node.tsx';

const indexCode = {
  code: editorCode,
  active: true,
};

export const FixedLayoutSimplePreview = () => (
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
);
