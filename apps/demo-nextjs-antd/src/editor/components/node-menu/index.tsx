import { FC, type MouseEvent, useCallback, useState } from 'react';

import { Button, Dropdown } from 'antd';
import {
  WorkflowDragService,
  WorkflowNodeEntity,
  WorkflowSelectService,
  delay,
  useClientContext,
  useService,
} from '@flowgram.ai/free-layout-editor';
import { NodeIntoContainerService } from '@flowgram.ai/free-container-plugin';
import { EllipsisOutlined } from '@ant-design/icons';

import { FlowNodeRegistry } from '@editor/typings';
import { PasteShortcut } from '@editor/shortcuts/paste';
import { CopyShortcut } from '@editor/shortcuts/copy';

interface NodeMenuProps {
  node: WorkflowNodeEntity;
  updateTitleEdit: (setEditing: boolean) => void;
  deleteNode: () => void;
}

export const NodeMenu: FC<NodeMenuProps> = ({ node, deleteNode, updateTitleEdit }) => {
  const [visible, setVisible] = useState(true);
  const clientContext = useClientContext();
  const registry = node.getNodeRegistry<FlowNodeRegistry>();
  const nodeIntoContainerService = useService(NodeIntoContainerService);
  const selectService = useService(WorkflowSelectService);
  const dragService = useService(WorkflowDragService);
  const canMoveOut = nodeIntoContainerService.canMoveOutContainer(node);

  const rerenderMenu = useCallback(() => {
    // force destroy component - 强制销毁组件触发重新渲染
    setVisible(false);
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, []);

  const handleMoveOut = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      const sourceParent = node.parent;
      // move out of container - 移出容器
      nodeIntoContainerService.moveOutContainer({ node });
      // clear invalid lines - 清除非法线条
      await nodeIntoContainerService.clearInvalidLines({
        dragNode: node,
        sourceParent,
      });
      rerenderMenu();
      await delay(16);
      // select node - 选中节点
      selectService.selectNode(node);
      // start drag node - 开始拖拽
      dragService.startDragSelectedNodes(e);
    },
    [nodeIntoContainerService, node, rerenderMenu]
  );

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      const copyShortcut = new CopyShortcut(clientContext);
      const pasteShortcut = new PasteShortcut(clientContext);
      const data = copyShortcut.toClipboardData([node]);
      pasteShortcut.apply(data);
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
    },
    [clientContext, node]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      deleteNode();
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
    },
    [clientContext, node]
  );
  const handleEditTitle = useCallback(() => {
    updateTitleEdit(true);
  }, [updateTitleEdit]);

  if (!visible) {
    return <></>;
  }

  return (
    <Dropdown
      trigger={['hover']}
      placement="bottomRight"
      menu={{
        items: [
          {
            label: <a onClick={handleEditTitle}>Edit Title</a>,
            key: 'editTitle',
          },
          {
            label: <a onClick={handleMoveOut}>Move out</a>,
            key: 'moveOut',
            disabled: !canMoveOut,
          },
          {
            label: <a onClick={handleCopy}>Create Copy</a>,
            key: 'createCopy',
            disabled: registry.meta!.copyDisable === true,
          },
          {
            label: <a onClick={handleDelete}>Delete</a>,
            key: 'delete',
            disabled: !!(registry.canDelete?.(clientContext, node) || registry.meta!.deleteDisable),
          },
        ],
      }}
    >
      <Button
        size="small"
        type="text"
        icon={<EllipsisOutlined />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
};
