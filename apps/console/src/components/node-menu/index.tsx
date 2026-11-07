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
import { IconButton, Dropdown, Toast } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../code-editor-modal';
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

  /**
   * 查看节点 Schema（2026-11-07 用户确认）：DSL 编辑器同款 Monaco 弹窗（非全屏 960px 居中），
   * 展示该节点实例 JSON，可编辑；确定后写回——整份 document JSON 中替换本节点再 reload
   * （与 DSL 编辑器同一验证路径）。id/type 不允许改（结构变更走正规入口）。
   */
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schemaJson, setSchemaJson] = useState('');
  const handleViewSchema = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        setSchemaJson(JSON.stringify(node.toJSON(), null, 2));
      } catch {
        setSchemaJson('');
      }
      setSchemaOpen(true);
    },
    [node]
  );
  const applyNodeJson = useCallback(
    (raw: string) => {
      let parsed: { id?: string; type?: string } | undefined;
      try {
        parsed = JSON.parse(raw);
      } catch {
        Toast.error(t('nodeSchema.jsonInvalid'));
        throw new Error('invalid json'); // 抛出以中止 CodeEditorModal 的「确定即关闭」链
      }
      if (!parsed || parsed.id !== node.id || parsed.type !== node.flowNodeType) {
        Toast.error(t('nodeSchema.mismatch'));
        throw new Error('node id/type mismatch');
      }
      const docJson = clientContext.document.toJSON();
      const idx = docJson.nodes.findIndex((n: { id: string }) => n.id === node.id);
      if (idx < 0) {
        Toast.error(t('nodeSchema.mismatch'));
        throw new Error('node missing');
      }
      docJson.nodes[idx] = parsed as (typeof docJson.nodes)[number];
      clientContext.document.reload(docJson);
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
    <>
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
            <Dropdown.Item onClick={handleViewSchema}>{t('nodeMenu.viewSchema')}</Dropdown.Item>
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
      <CodeEditorModal
        value={schemaJson}
        language="json"
        visible={schemaOpen}
        onVisibleChange={setSchemaOpen}
        onChange={applyNodeJson}
        fullScreen={false}
        title={`${t('nodeMenu.viewSchema')} · ${
          (node.toJSON().data as { title?: string } | undefined)?.title || node.flowNodeType
        }`}
      />
    </>
  );
};
