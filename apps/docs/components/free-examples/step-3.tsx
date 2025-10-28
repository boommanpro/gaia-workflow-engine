import '@flowgram.ai/free-layout-editor/index.css';

import {
  FreeLayoutEditorProvider,
  EditorRenderer,
  useNodeRender,
  WorkflowNodeProps,
  WorkflowNodeRenderer,
} from '@flowgram.ai/free-layout-editor';

const NodeRender = (props: WorkflowNodeProps) => {
  const { form, selected } = useNodeRender();
  return (
    <WorkflowNodeRenderer
      style={{
        width: 280,
        minHeight: 88,
        height: 'auto',
        background: '#fff',
        border: '1px solid rgba(6, 7, 9, 0.15)',
        borderColor: selected ? '#4e40e5' : 'rgba(6, 7, 9, 0.15)',
        borderRadius: 8,
        boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.04), 0 4px 12px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        padding: 12,
        cursor: 'move',
      }}
      node={props.node}
    >
      {form?.render()}
    </WorkflowNodeRenderer>
  );
};

const FlowGramApp = () => (
  <FreeLayoutEditorProvider
    onAllLayersRendered={(ctx) => {
      ctx.tools.fitView(false);
    }}
    materials={{
      renderDefaultNode: NodeRender,
    }}
    nodeRegistries={[
      {
        type: 'custom',
      },
    ]}
    canDeleteNode={() => true}
    canDeleteLine={() => true}
    initialData={{
      nodes: [
        {
          id: '1',
          type: 'custom',
          meta: {
            position: { x: 0, y: 0 },
          },
        },
        {
          id: '2',
          type: 'custom',
          meta: {
            position: { x: 400, y: 0 },
          },
        },
      ],
      edges: [
        {
          sourceNodeID: '1',
          targetNodeID: '2',
        },
      ],
    }}
  >
    <EditorRenderer />
  </FreeLayoutEditorProvider>
);

export default FlowGramApp;
