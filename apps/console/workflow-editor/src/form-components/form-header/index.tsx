/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { CommandService, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button } from '@douyinfe/semi-ui';
import { IconClose, IconExport } from '@douyinfe/semi-icons';

import { FlowCommandId } from '../../shortcuts';
import { useModal } from '../../hooks/use-code-editor-modal';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { nodeFormPanelFactory } from '../../components/sidebar';
import { NodeMenu } from '../../components/node-menu';
import { getIcon } from './utils';
import { TitleInput } from './title-input';
import { Header, Operators } from './styles';
import {useState} from "react";

export function FormHeader() {
  const { openModal, modal } = useModal('', 'json');
  const { node, readonly } = useNodeRenderContext();
  const [titleEdit, setTitleEdit] = useState<boolean>(false);
  const ctx = useClientContext();
  const isSidebar = useIsSidebar();
  const panelManager = usePanelManager();

  const handleDelete = () => {
    ctx.get<CommandService>(CommandService).executeCommand(FlowCommandId.DELETE, [node]);
  };
  const handleClose = () => {
    panelManager.close(nodeFormPanelFactory.key);
  };

  const handleExport = () => {
    const jsonData = JSON.stringify(node.toJSON(), null, 2);
    openModal(jsonData);
  };

  return (
    <>
      <Header>
        {getIcon(node)}
        <TitleInput readonly={readonly} titleEdit={titleEdit} updateTitleEdit={setTitleEdit} />
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
