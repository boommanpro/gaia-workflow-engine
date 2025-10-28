import '@flowgram.ai/free-layout-editor/index.css';
import { FreeLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/free-layout-editor';

const FlowGramApp = () => (
  <FreeLayoutEditorProvider>
    <EditorRenderer />
  </FreeLayoutEditorProvider>
);

export default FlowGramApp;
