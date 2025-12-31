/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { CommandService, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button } from '@douyinfe/semi-ui';
import {
  IconClose,
  IconExport,
  IconSmallTriangleDown,
  IconSmallTriangleLeft,
} from '@douyinfe/semi-icons';

import { toggleLoopExpanded } from '../../utils';
import { FlowCommandId } from '../../shortcuts';
import { useModal } from '../../hooks/use-code-editor-modal';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { nodeFormPanelFactory } from '../../components/sidebar';
import { NodeMenu } from '../../components/node-menu';
import { getIcon } from './utils';
import { TitleInput } from './title-input';
import { Header, Operators } from './styles';

export function FormHeader() {
  const { openModal, modal } = useModal('', 'json');
  const { node, expanded, toggleExpand, readonly } = useNodeRenderContext();
  const [titleEdit, setTitleEdit] = useState<boolean>(false);
  const ctx = useClientContext();
  const isSidebar = useIsSidebar();
  const panelManager = usePanelManager();
  const handleExpand = (e: React.MouseEvent) => {
    toggleExpand();
    e.stopPropagation(); // Disable clicking prevents the sidebar from opening
  };
  const handleDelete = () => {
    ctx.get<CommandService>(CommandService).executeCommand(FlowCommandId.DELETE, [node]);
  };
  const handleClose = () => {
    panelManager.close(nodeFormPanelFactory.key);
  };
  useEffect(() => {
    // 折叠 loop 子节点
    if (node.flowNodeType === 'loop') {
      toggleLoopExpanded(node, expanded);
    }
  }, [expanded]);

  const handleExport = () => {
    const jsonData = JSON.stringify(node.toJSON(), null, 2);
    openModal(jsonData);
  };

  return (
    <>
      <Header>
        {getIcon(node)}
        <TitleInput readonly={readonly} titleEdit={titleEdit} updateTitleEdit={setTitleEdit} />
        {node.renderData.expandable && !isSidebar && (
          <Button
            type="primary"
            icon={expanded ? <IconSmallTriangleDown /> : <IconSmallTriangleLeft />}
            size="small"
            theme="borderless"
            onClick={handleExpand}
          />
        )}
        {readonly ? undefined : (
          <Operators>
            <Button
              type="primary"
              icon={<IconExport />}
              size="small"
              theme="borderless"
              onClick={handleExport}
            />
            <NodeMenu node={node} deleteNode={handleDelete} updateTitleEdit={setTitleEdit} />
          </Operators>
        )}
        {isSidebar && (
          <Button
            type="primary"
            icon={<IconClose />}
            size="small"
            theme="borderless"
            onClick={handleClose}
          />
        )}
      </Header>
      {modal}
    </>
  );
}
