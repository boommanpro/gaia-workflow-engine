/**
 * 节点 Schema 全屏对照视图（2026-11-05）：左栏类型契约（node-schemas 派生只读树）、
 * 右栏当前节点实例 JSON——替代旧「导出 JSON」单一实例视角。
 * 入口：节点卡片头部 ⤢（查看 Schema）。
 */
import React from 'react';

import { FlowNodeEntity } from '@flowgram.ai/free-layout-editor';
import { Modal } from '@douyinfe/semi-ui';

import { t, useLanguage } from '../../i18n';
import { SchemaTreeView } from './index';

export const NodeSchemaModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  node: FlowNodeEntity;
}> = ({ visible, onClose, node }) => {
  useLanguage();
  let instanceJson = '';
  try {
    instanceJson = JSON.stringify(node.toJSON(), null, 2);
  } catch {
    instanceJson = '';
  }
  const type = String(node.flowNodeType ?? '');
  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={880}
      title={
        <span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{type}</span>
          <span style={{ color: 'var(--ge-text-2, #7b8090)', fontWeight: 400, marginLeft: 8 }}>
            {' · '}
            {t('nodeSchema.tabSchema')}
          </span>
        </span>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 12,
          maxHeight: '64vh',
        }}
      >
        <div style={{ overflow: 'auto', minHeight: 0 }}>
          <SchemaTreeView type={type} />
        </div>
        <div style={{ overflow: 'auto', minHeight: 0 }}>
          <pre className="gaia-json-pane">{instanceJson}</pre>
        </div>
      </div>
    </Modal>
  );
};
