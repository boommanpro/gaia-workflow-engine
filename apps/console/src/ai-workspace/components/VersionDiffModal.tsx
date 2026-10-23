/**
 * VersionDiffModal —— 正式落版版本间的差异对比（第一档 D 项）。
 *
 * 数据来自后端 GET /workflow-version/diff/{id}：落版时算好的结构化 diff
 * （nodes/edges 的 id 级 added/removed/changed）+ nodeTitles 标题映射。
 * 渲染复用 DeltaDetailsView（会话快照对比同款），映射函数把后端 id 列表
 * 转成它要的 DslChangeDetails。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Spin } from '@douyinfe/semi-ui';

import { workflowApi, type WorkflowVersionDiffResponse } from '../../services/workflow-api';
import { DeltaDetailsView } from '../../document/DeltaDetailsView';
import { backendDiffToChangeDetails } from './version-diff-mapping';
import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';

export interface VersionDiffModalProps {
  versionId: number | null;
  versionNumber?: string;
  visible: boolean;
  onClose: () => void;
}

export const VersionDiffModal: React.FC<VersionDiffModalProps> = ({
  versionId,
  versionNumber,
  visible,
  onClose,
}) => {
  useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<WorkflowVersionDiffResponse | null>(null);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const data = await workflowApi.getVersionDiff(id);
      if (data?.error) {
        setError(String(data.error));
      } else {
        setRes(data);
      }
    } catch (e) {
      setError((e as Error).message || 'load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && versionId) {
      void load(versionId);
    }
    if (!visible) {
      setRes(null);
      setError(null);
    }
  }, [visible, versionId, load]);

  const isFirstVersion = res && !res.previousVersionNumber;

  return (
    <Modal
      title={t('editor.versionDiffTitle')}
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      bodyStyle={{ maxHeight: 480, overflow: 'auto' }}
    >
      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : error ? (
        <div style={{ fontSize: 12.5, color: CHAT.danger }}>{error}</div>
      ) : res ? (
        <>
          <div style={{ fontSize: 12, color: CHAT.textSub, marginBottom: 8 }}>
            {isFirstVersion
              ? t('editor.versionDiffFirst')
              : t('editor.versionDiffOf', { v: res.versionNumber || versionNumber })}
          </div>
          <DeltaDetailsView details={backendDiffToChangeDetails(res)} />
        </>
      ) : null}
    </Modal>
  );
};

export default VersionDiffModal;
