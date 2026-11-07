/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { WorkflowStatus } from '@flowgram.ai/runtime-interface';
import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { CommandService, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';

import { FlowCommandId } from '../../shortcuts';
import { useNodeCompact } from '../../node-compact-store';
import { useLanguage, t } from '../../i18n';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { useNodeReport } from '../../components/testrun/node-status-bar';
import { nodeFormPanelFactory } from '../../components/sidebar';
import { NodeMenu } from '../../components/node-menu';
import { getIcon } from './utils';
import { TitleInput } from './title-input';
import { Header, Operators } from './styles';

/** 运行状态点（试运行时）：成功绿 / 失败红 / 运行中蓝（旋转由 NodeStatusBar 承担，这里只给一眼可读的常驻点） */
const statusDotColor = (status?: WorkflowStatus): string | null => {
  if (!status) return null;
  if (status === WorkflowStatus.Succeeded) return 'var(--g-nodecat-data, #0e9384)';
  if (status === WorkflowStatus.Failed) return '#e5404e';
  if (status === WorkflowStatus.Processing) return 'var(--g-nodecat-flow, #2f7df6)';
  if (status === WorkflowStatus.Cancelled) return 'var(--ge-text-2, #7b8090)';
  return null;
};

/** 收起图标（线描，几何取自 Lucide minimize-2）——「框按钮」固定在卡片头右侧 */
const FoldIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 14h6v6" />
    <path d="M20 10h-6V4" />
    <path d="m14 10 7-7" />
    <path d="m3 21 7-7" />
  </svg>
);

export function FormHeader() {
  const { node, readonly } = useNodeRenderContext();
  const [titleEdit, setTitleEdit] = useState<boolean>(false);
  const ctx = useClientContext();
  const isSidebar = useIsSidebar();
  const panelManager = usePanelManager();
  const report = useNodeReport();
  // 节点级紧凑（2026-11-07）：收起按钮固定在卡片头（原 ⤢ 查看 Schema 位置，Schema 入口移入 ⋯ 菜单）
  const { toggle } = useNodeCompact(node);
  const isContainer = Boolean(node.getNodeMeta().isContainer);
  const canFold = Boolean(toggle) && !isContainer && !readonly;
  useLanguage();

  const handleDelete = () => {
    ctx.get<CommandService>(CommandService).executeCommand(FlowCommandId.DELETE, [node]);
  };
  const handleClose = () => {
    panelManager.close(nodeFormPanelFactory.key);
  };

  const dot = statusDotColor(report?.status);

  // 2026-11-07 用户反馈恢复：侧栏顶部带 logo 芯片 + 标题，标题单击即可编辑；
  // 收起/⋯ 菜单只在画布卡片头部，页签不回归。
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
        {/* 收起为紧凑方卡（2026-11-07 固定入口，替代原 ⤢）；展开走双击紧凑卡 */}
        {canFold && (
          <Button
            type="primary"
            icon={<FoldIcon />}
            size="small"
            theme="borderless"
            aria-label={t('nodeCompact.collapse')}
            onClick={(e) => {
              e.stopPropagation();
              toggle?.();
            }}
          />
        )}
        {!readonly && (
          <NodeMenu node={node} deleteNode={handleDelete} updateTitleEdit={setTitleEdit} />
        )}
      </Operators>
      {/* 2026-11-07 副标题不再展示（「输入 input · score」类参数摘要用户不要；摘要仍在悬停 tooltip） */}
    </Header>
  );
}
