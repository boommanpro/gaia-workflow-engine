/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { WorkflowStatus } from '@flowgram.ai/runtime-interface';
import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { CommandService, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button } from '@douyinfe/semi-ui';
import { IconClose, IconMaximize2 } from '@douyinfe/semi-icons';

import { FlowCommandId } from '../../shortcuts';
import { useLanguage, t } from '../../i18n';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { useNodeReport } from '../../components/testrun/node-status-bar';
import { nodeFormPanelFactory } from '../../components/sidebar';
import { NodeSchemaModal } from '../../components/node-schema-view/modal';
import { NodeMenu } from '../../components/node-menu';
import { getIcon, getSubtitle } from './utils';
import { TitleInput } from './title-input';
import { Header, Operators, Subtitle } from './styles';

/** 运行状态点（试运行时）：成功绿 / 失败红 / 运行中蓝（旋转由 NodeStatusBar 承担，这里只给一眼可读的常驻点） */
const statusDotColor = (status?: WorkflowStatus): string | null => {
  if (!status) return null;
  if (status === WorkflowStatus.Succeeded) return 'var(--g-nodecat-data, #0e9384)';
  if (status === WorkflowStatus.Failed) return '#e5404e';
  if (status === WorkflowStatus.Processing) return 'var(--g-nodecat-flow, #2f7df6)';
  if (status === WorkflowStatus.Cancelled) return 'var(--ge-text-2, #7b8090)';
  return null;
};

export function FormHeader() {
  const { node, readonly } = useNodeRenderContext();
  const [titleEdit, setTitleEdit] = useState<boolean>(false);
  const [schemaModalOpen, setSchemaModalOpen] = useState<boolean>(false);
  const ctx = useClientContext();
  const isSidebar = useIsSidebar();
  const panelManager = usePanelManager();
  const report = useNodeReport();
  useLanguage();

  const handleDelete = () => {
    ctx.get<CommandService>(CommandService).executeCommand(FlowCommandId.DELETE, [node]);
  };
  const handleClose = () => {
    panelManager.close(nodeFormPanelFactory.key);
  };

  const dot = statusDotColor(report?.status);

  // 2026-11-07 用户反馈恢复：侧栏顶部带 logo 芯片 + 标题（太丑），标题单击即可编辑；
  // ⤢ 查看 Schema / ··· 菜单仍只在画布卡片上，页签不回归。
  if (isSidebar) {
    return (
      <Header style={{ cursor: 'default' }}>
        {getIcon(node)}
        <TitleInput
          readonly={readonly}
          titleEdit={titleEdit}
          updateTitleEdit={setTitleEdit}
          singleClickEdit
        />
        {dot && (
          <span
            title={String(report?.status ?? '')}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dot,
              flex: 'none',
            }}
          />
        )}
        <Button
          type="primary"
          icon={<IconClose />}
          size="small"
          theme="borderless"
          aria-label={t('nodeForm.close')}
          onClick={handleClose}
        />
      </Header>
    );
  }

  return (
    <>
      <Header>
        {getIcon(node)}
        <TitleInput readonly={readonly} titleEdit={titleEdit} updateTitleEdit={setTitleEdit} />
        {dot && (
          <span
            title={String(report?.status ?? '')}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dot,
              flex: 'none',
            }}
          />
        )}
        <Operators>
          {/* ⤢ 查看 Schema：类型契约 ⇄ 实例 JSON 对照（2026-11-05，替代旧「导出 JSON」单一实例视角） */}
          <Button
            type="primary"
            icon={<IconMaximize2 />}
            size="small"
            theme="borderless"
            aria-label={t('nodeSchema.view')}
            onClick={() => setSchemaModalOpen(true)}
          />
          {!readonly && (
            <NodeMenu node={node} deleteNode={handleDelete} updateTitleEdit={setTitleEdit} />
          )}
        </Operators>
      </Header>
      {getSubtitle(node) && <Subtitle>{getSubtitle(node)}</Subtitle>}
      <NodeSchemaModal
        visible={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
        node={node}
      />
    </>
  );
}
