import '@flowgram.ai/free-layout-editor/index.css';

import { FreeLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/free-layout-editor';

import { useEditorProps } from './use-editor-props';

const FlowGramApp = () => {
  const editorProps = useEditorProps();
  return (
    <FreeLayoutEditorProvider {...editorProps}>
      <EditorRenderer />
    </FreeLayoutEditorProvider>
  );
};

export default FlowGramApp;
