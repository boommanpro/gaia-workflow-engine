import '@flowgram.ai/fixed-layout-editor/index.css';
import { defaultFixedSemiMaterials } from '@flowgram.ai/fixed-semi-materials';
import { FixedLayoutEditorProvider, EditorRenderer } from '@flowgram.ai/fixed-layout-editor';

const FlowGramApp = () => (
  <FixedLayoutEditorProvider
    materials={{
      components: defaultFixedSemiMaterials,
    }}
  >
    <EditorRenderer />
  </FixedLayoutEditorProvider>
);

export default FlowGramApp;
