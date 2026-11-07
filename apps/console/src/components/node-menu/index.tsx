/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC, useCallback, useState, type MouseEvent } from 'react';

import {
  delay,
  useClientContext,
  usePlaygroundTools,
  useService,
  WorkflowDragService,
  WorkflowNodeEntity,
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-editor';
import { NodeIntoContainerService } from '@flowgram.ai/free-container-plugin';
import { IconButton, Dropdown } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';

import { FlowNodeRegistry } from '../../typings';
import { PasteShortcut } from '../../shortcuts/paste';
import { CopyShortcut } from '../../shortcuts/copy';
import { useLanguage, t } from '../../i18n';

interface NodeMenuProps {
  node: WorkflowNodeEntity;
  updateTitleEdit?: (setEditing: boolean) => void;
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
  const tools = usePlaygroundTools();
  useLanguage();

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
      await delay(16);
      // clear invalid lines - 清除非法线条
      await nodeIntoContainerService.clearInvalidLines({
        dragNode: node,
        sourceParent,
      });
      rerenderMenu();
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

  /** 导出该节点实例 JSON（2026-11-06）：侧边栏页签退役后实例 JSON 的唯一出口 */
  const handleExportJson = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const json = JSON.stringify(node.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${node.id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        // 导出失败只静默记录：菜单动作不应打断画布交互
        console.warn('[node-menu] export json failed', err);
      }
    },
    [node]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      deleteNode();
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
    },
    [clientContext, node]
  );

  const handleAutoLayout = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
      tools.autoLayout({
        containerNode: node,
        enableAnimation: true,
        animationDuration: 1000,
        disableFitView: true,
      });
    },
    [tools]
  );

  if (!visible) {
    return <></>;
  }

  return (
    <Dropdown
      trigger="hover"
      position="bottomRight"
      render={
        <Dropdown.Menu>
          {canMoveOut && (
            <Dropdown.Item onClick={handleMoveOut}>{t('nodeMenu.moveOut')}</Dropdown.Item>
          )}
          <Dropdown.Item onClick={handleCopy} disabled={registry.meta!.copyDisable === true}>
            {t('nodeMenu.createCopy')}
          </Dropdown.Item>
          <Dropdown.Item onClick={handleExportJson}>{t('nodeMenu.exportJson')}</Dropdown.Item>
          {registry.meta.isContainer && (
            <Dropdown.Item onClick={handleAutoLayout}>{t('nodeMenu.autoLayout')}</Dropdown.Item>
          )}
          {/* 2026-11-06 修复反向逻辑：原 `!!(canDelete?.() || deleteDisable)` 在 canDelete
              返回真值时反而禁用。语义应为：目录声明不可删，或 canDelete 明确返回 false 才禁用 */}
          <Dropdown.Item
            onClick={handleDelete}
            disabled={
              registry.meta!.deleteDisable === true ||
              registry.canDelete?.(clientContext, node) === false
            }
          >
            {t('nodeMenu.delete')}
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <IconButton
        color="secondary"
        size="small"
        theme="borderless"
        icon={<IconMore />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
};
