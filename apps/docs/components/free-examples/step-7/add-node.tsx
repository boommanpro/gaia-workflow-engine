import {
  useService,
  WorkflowDocument,
  WorkflowNodeEntity,
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-editor';

export const AddNode = () => {
  const workflowDocument = useService(WorkflowDocument);
  const selectService = useService(WorkflowSelectService);

  return (
    <div style={{ position: 'absolute', zIndex: 10, bottom: 16, left: 8, display: 'flex', gap: 8 }}>
      <button
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '50%',
          cursor: 'pointer',
          padding: '4px',
          color: '#ffffff',
          background: '#7e72e8',
          width: 70,
          height: 70,
          fontSize: 14,
        }}
        onClick={() => {
          const node: WorkflowNodeEntity = workflowDocument.createWorkflowNodeByType(
            'custom',
            undefined, // position undefined means create node in center of canvas - position undefined 可以在画布中间创建节点
            {
              data: {
                title: 'New Node',
              },
            }
          );
          selectService.selectNode(node);
        }}
      >
        + Node
      </button>
    </div>
  );
};
