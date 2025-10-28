import '@flowgram.ai/fixed-layout-editor/index.css';

import { FC } from 'react';

import { defaultFixedSemiMaterials } from '@flowgram.ai/fixed-semi-materials';
import {
  FixedLayoutEditorProvider,
  EditorRenderer,
  FlowNodeEntity,
  useNodeRender,
  FlowNodeJSON,
  FlowOperationService,
  usePlayground,
  useService,
  FlowRendererKey,
  useClientContext,
} from '@flowgram.ai/fixed-layout-editor';

export const NodeRender = ({ node }: { node: FlowNodeEntity }) => {
  const {
    onMouseEnter,
    onMouseLeave,
    startDrag,
    form,
    dragging,
    isBlockOrderIcon,
    isBlockIcon,
    activated,
  } = useNodeRender();
  const ctx = useClientContext();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => {
        startDrag(e);
        e.stopPropagation();
      }}
      style={{
        width: 280,
        minHeight: 88,
        height: 'auto',
        background: '#fff',
        border: '1px solid rgba(6, 7, 9, 0.15)',
        borderColor: activated ? '#82a7fc' : 'rgba(6, 7, 9, 0.15)',
        borderRadius: 8,
        boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.04), 0 4px 12px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        padding: 12,
        cursor: 'move',
        opacity: dragging ? 0.3 : 1,
        ...(isBlockOrderIcon || isBlockIcon ? { width: 260 } : {}),
      }}
    >
      {form?.render()}
      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          ctx.operation.deleteNode(node);
        }}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          border: 'none',
          borderRadius: '50%',
          background: '#fff',
          color: '#666',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'all 0.2s',
        }}
      >
        ×
      </button>
    </div>
  );
};

const useAddNode = () => {
  const playground = usePlayground();
  const flowOperationService = useService(FlowOperationService) as FlowOperationService;

  const handleAdd = (addProps: FlowNodeJSON, dropNode: FlowNodeEntity) => {
    const blocks = addProps.blocks ? addProps.blocks : undefined;
    const entity = flowOperationService.addFromNode(dropNode, {
      ...addProps,
      blocks,
    });
    setTimeout(() => {
      playground.scrollToView({
        bounds: entity.bounds,
        scrollToCenter: true,
      });
    }, 10);
    return entity;
  };

  const handleAddBranch = (addProps: FlowNodeJSON, dropNode: FlowNodeEntity) => {
    const index = dropNode.index + 1;
    const entity = flowOperationService.addBlock(dropNode.originParent!, addProps, {
      index,
    });
    return entity;
  };

  return {
    handleAdd,
    handleAddBranch,
  };
};

const Adder: FC<{
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}> = ({ from, hoverActivated }) => {
  const playground = usePlayground();

  const { handleAdd } = useAddNode();

  if (playground.config.readonlyOrDisabled) return null;

  return (
    <div
      style={{
        width: hoverActivated ? 15 : 6,
        height: hoverActivated ? 15 : 6,
        backgroundColor: hoverActivated ? '#fff' : 'rgb(143, 149, 158)',
        color: '#fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={() => {
        handleAdd({ type: 'custom', id: `custom_${Date.now()}` }, from);
      }}
    >
      {hoverActivated ? (
        <span
          style={{
            color: '#3370ff',
            fontSize: 12,
          }}
        >
          +
        </span>
      ) : null}
    </div>
  );
};

const FlowGramApp = () => (
  <FixedLayoutEditorProvider
    nodeRegistries={[
      {
        type: 'custom',
      },
    ]}
    initialData={{
      nodes: [
        {
          id: 'start_0',
          type: 'start',
        },
        {
          id: 'custom_1',
          type: 'custom',
        },
        {
          id: 'end_2',
          type: 'end',
        },
      ],
    }}
    onAllLayersRendered={(ctx) => {
      setTimeout(() => {
        ctx.playground.config.fitView(ctx.document.root.bounds.pad(30));
      }, 10);
    }}
    materials={{
      renderDefaultNode: NodeRender,
      components: {
        ...defaultFixedSemiMaterials,
        [FlowRendererKey.ADDER]: Adder,
      },
    }}
  >
    <EditorRenderer />
  </FixedLayoutEditorProvider>
);

export default FlowGramApp;
