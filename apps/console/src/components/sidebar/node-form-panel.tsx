/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, startTransition } from 'react';

import { type PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import {
  PlaygroundEntityContext,
  useRefresh,
  useClientContext,
} from '@flowgram.ai/free-layout-editor';
import { IconPlay } from '@douyinfe/semi-icons';

import { FlowNodeMeta } from '../../typings';
import { useLanguage, t } from '../../i18n';
import { IsSidebarContext } from '../../context';
import { SidebarNodeRenderer } from './sidebar-node-renderer';

export interface NodeFormPanelProps {
  nodeId: string;
}

export const NodeFormPanel: React.FC<NodeFormPanelProps> = ({ nodeId }) => {
  const panelManager = usePanelManager();
  const { selection, playground, document } = useClientContext();
  const refresh = useRefresh();
  useLanguage();
  const handleClose = useCallback(() => {
    // Sidebar delayed closing
    startTransition(() => {
      panelManager.close(nodeFormPanelFactory.key);
    });
  }, []);

  const node = document.getNode(nodeId);
  const sidebarDisabled = node?.getNodeMeta<FlowNodeMeta>()?.sidebarDisabled === true;
  /**
   * Listen readonly
   */
  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => {
      handleClose();
      refresh();
    });
    return () => disposable.dispose();
  }, [playground]);
  /**
   * Listen selection
   */
  useEffect(() => {
    const toDispose = selection.onSelectionChanged(() => {
      /**
       * 如果没有选中任何节点，则自动关闭侧边栏
       * If no node is selected, the sidebar is automatically closed
       */
      if (selection.selection.length === 0) {
        handleClose();
      } else if (selection.selection.length === 1 && selection.selection[0] !== node) {
        handleClose();
      }
    });
    return () => toDispose.dispose();
  }, [selection, node, handleClose]);
  /**
   * Close when node disposed
   */
  useEffect(() => {
    if (node) {
      const toDispose = node.onDispose(() => {
        panelManager.close(nodeFormPanelFactory.key);
      });
      return () => toDispose.dispose();
    }
    return () => {};
  }, [node, sidebarDisabled, handleClose]);
  /**
   * Cloze when sidebar disabled
   */
  useEffect(() => {
    if (!node || sidebarDisabled || playground.config.readonly) {
      handleClose();
    }
  }, [node, sidebarDisabled, playground.config.readonly]);

  if (!node || sidebarDisabled || playground.config.readonly) {
    return null;
  }

  return (
    <IsSidebarContext.Provider value={true}>
      <PlaygroundEntityContext.Provider key={node.id} value={node}>
        <div
          style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          {/*
            2026-11-06 侧边栏仅保留表单（用户决策）：
            - 删除「表单 / 参数 Schema / 实例 JSON」页签——Schema 对照仍在画布卡片 ⤢，
              实例 JSON 改由节点「··· → 导出 JSON」承担；
            - 2026-11-07 用户反馈恢复：FormHeader 在侧栏态渲染精简头
              （logo 芯片 + 可编辑标题 + 状态点 + 关闭，单击标题编辑），关闭按钮在头部右侧；
            - 点击空白画布仍自动关闭（选中联动，原有行为）。
          */}
          <SidebarFormWithTestBar
            key={node.id}
            nodeId={node.id}
            readonly={playground.config.readonly}
          />
        </div>
      </PlaygroundEntityContext.Provider>
    </IsSidebarContext.Provider>
  );
};

/** 表单主体 + 底部「测试此节点」操作条 */
const SidebarFormWithTestBar = ({ nodeId, readonly }: { nodeId: string; readonly: boolean }) => {
  const panelManager = usePanelManager();
  const node = useClientContext().document.getNode(nodeId);
  if (!node) return null;

  const handleTestNode = () => {
    panelManager.open('single-node-test-panel', 'right', {
      props: { nodeId },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <SidebarNodeRenderer node={node} />
      </div>
      {!readonly && (
        <div
          style={{
            flexShrink: 0,
            height: 62,
            background: 'var(--ge-node-body, #fbfbfb)',
            borderTop: '1px solid rgba(82,100,154,0.13)',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={handleTestNode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(0, 178, 60, 1)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <IconPlay size="small" />
            {t('singleNode.testThisNode')}
          </button>
        </div>
      )}
    </div>
  );
};

export const nodeFormPanelFactory: PanelFactory<NodeFormPanelProps> = {
  key: 'node-form-panel',
  defaultSize: 500,
  render: (props: NodeFormPanelProps) => <NodeFormPanel {...props} />,
};
