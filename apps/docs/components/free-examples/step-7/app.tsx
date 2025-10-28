import '@flowgram.ai/free-layout-editor/index.css';

import { FreeLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/free-layout-editor';

import { useEditorProps } from './use-editor-props';
import { Tools } from './tools';
import { Minimap } from './minimap';
import { AddNode } from './add-node';

const FlowGramApp = () => {
  const editorProps = useEditorProps();
  return (
    <FreeLayoutEditorProvider {...editorProps}>
      <EditorRenderer />
      <Tools />
      <Minimap />
      <AddNode />
    </FreeLayoutEditorProvider>
  );
};

export default FlowGramApp;
