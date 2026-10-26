/**
 * AiPendingBanner —— 专家模式的「AI 待应用变更」条（阶段 2.2 / Case 4）。
 *
 * AI 在专家模式下提交的画布修改不再静默丢弃，也不直接覆盖画布，
 * 而是浮出这条：查看差异（字段级 before→after）→ 应用 / 忽略。
 * 应用前若检测到用户手改过画布（相对捕获时刻的基准），强制弹冲突确认，
 * 不静默覆盖 —— 这是「手工修改受到保护」的落点。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Toast } from '@douyinfe/semi-ui';
import { IconTick, IconClose, IconEyeOpened } from '@douyinfe/semi-icons';

import { t } from '../../i18n';
import { useRunStreaming } from '../../agent/AgentContext';
import { aiPendingChangeStore, useAiPendingChange } from '../../agent/ai-pending-change';
import {
  WorkflowDocument,
  computeDslChangeDetails,
  workflowDocumentStore,
  type DslChangeDetails,
} from '../../document';
import { DeltaDetailsView } from '../../document/DeltaDetailsView';

const ACCENT = '#4d53e8';

export const AiPendingBanner: React.FC = () => {
  const pending = useAiPendingChange();
  const streaming = useRunStreaming();
  const [diffOpen, setDiffOpen] = useState(false);
  const [conflict, setConflict] = useState<DslChangeDetails | null>(null);
  const [applying, setApplying] = useState(false);

  // 离开编辑器页面时清掉未处理的待应用变更（它是编辑器现场的附属物）
  useEffect(() => () => aiPendingChangeStore.clear(), []);

  /** 当前画布内容 */
  const currentDslText = useMemo(() => {
    if (!pending) return '';
    return JSON.stringify(workflowDocumentStore.getSnapshot().doc.toJSON());
  }, [pending]);

  const summaryText = useCallback((details: DslChangeDetails): string => {
    const parts: string[] = [];
    const added = details.nodes.filter((n) => n.change === 'added').length;
    const updated = details.nodes.filter((n) => n.change === 'updated').length;
    const removed = details.nodes.filter((n) => n.change === 'removed').length;
    const edges = details.edges.length;
    if (added) parts.push(t('chat.snapshotAddedNodes', { count: added }));
    if (updated) parts.push(t('chat.snapshotUpdatedNodes', { count: updated }));
    if (removed) parts.push(t('chat.snapshotRemovedNodes', { count: removed }));
    if (edges) parts.push(t('chat.diffEdgesCount', { count: edges }));
    return parts.join(' · ') || t('chat.snapshotNoDelta');
  }, []);

  const details = useMemo(() => {
    if (!pending) return null;
    try {
      const current = JSON.parse(currentDslText);
      return computeDslChangeDetails(pending.dsl, current);
    } catch {
      return null;
    }
  }, [pending, currentDslText]);

  const doApply = useCallback(() => {
    const p = aiPendingChangeStore.getSnapshot();
    if (!p) return;
    setApplying(true);
    try {
      // source 用 system：编辑器的 store 订阅只对非 user 变更做画布重挂
      // （user 变更被认为是「画布→store」方向，回写会造成循环）
      workflowDocumentStore.replace(WorkflowDocument.fromJSON(p.dsl), {
        kind: 'replace',
        source: 'system',
        reason: 'ai-edit',
      });
      aiPendingChangeStore.clear();
      setDiffOpen(false);
      setConflict(null);
      Toast.success(t('editor.aiPendingApplied'));
    } catch (e) {
      Toast.error(`${t('editor.aiPendingApplyFailed')}${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  }, []);

  /** 应用前冲突检测：相对 baseDsl（捕获时刻）有手改就必须显式确认 */
  const applyWithConflictCheck = useCallback(() => {
    const p = aiPendingChangeStore.getSnapshot();
    if (!p) return;
    try {
      const current = workflowDocumentStore.getSnapshot().doc.toJSON();
      const manual = computeDslChangeDetails(current, p.baseDsl);
      if (manual.nodes.length + manual.edges.length > 0) {
        setConflict(manual);
        setDiffOpen(false);
        return;
      }
      doApply();
    } catch {
      doApply();
    }
  }, [doApply]);

  if (!pending || !details) return null;

  return (
    <>
      <div
        className="chat-fade"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 16px',
          background: '#f0f0ff',
          borderBottom: '1px solid #dcdcf5',
          flexShrink: 0,
          zIndex: 9,
        }}
      >
        {streaming && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: ACCENT,
              animation: 'chat-typing 1.2s infinite ease-in-out',
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: 12.5, color: '#333', fontWeight: 600, flexShrink: 0 }}>
          {streaming ? t('editor.aiPendingStreaming') : t('editor.aiPendingTitle')}
        </span>
        <span style={{ fontSize: 12, color: '#666', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {summaryText(details)}
        </span>
        <Button
          size="small"
          theme="borderless"
          icon={<IconEyeOpened size="small" />}
          onClick={() => setDiffOpen(true)}
          style={{ color: ACCENT, flexShrink: 0 }}
        >
          {t('editor.aiPendingView')}
        </Button>
        <Button
          size="small"
          theme="solid"
          icon={<IconTick size="small" />}
          loading={applying}
          onClick={applyWithConflictCheck}
          style={{ background: ACCENT, flexShrink: 0 }}
        >
          {t('editor.aiPendingApply')}
        </Button>
        <Button
          size="small"
          theme="borderless"
          type="tertiary"
          icon={<IconClose size="small" />}
          onClick={() => aiPendingChangeStore.clear()}
          style={{ color: '#888', flexShrink: 0 }}
        >
          {t('editor.aiPendingIgnore')}
        </Button>
      </div>

      {/* 差异预览：当前画布 → AI 的草稿 */}
      <Modal
        title={t('editor.aiPendingDiffTitle')}
        visible={diffOpen}
        onCancel={() => setDiffOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDiffOpen(false)}>{t('Cancel')}</Button>,
          <Button key="apply" theme="solid" type="primary" loading={applying} onClick={applyWithConflictCheck} style={{ background: ACCENT }}>
            {t('editor.aiPendingApply')}
          </Button>,
        ]}
        width={Math.min(680, typeof window !== 'undefined' ? window.innerWidth - 80 : 680)}
        bodyStyle={{ maxHeight: '58vh', overflow: 'auto' }}
      >
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>{t('editor.aiPendingDiffDesc')}</div>
        <DeltaDetailsView details={details} />
      </Modal>

      {/* 冲突确认：用户手改过画布，不静默覆盖 */}
      <Modal
        title={t('editor.aiPendingConflictTitle')}
        visible={!!conflict}
        onCancel={() => setConflict(null)}
        footer={[
          <Button key="cancel" onClick={() => setConflict(null)}>{t('Cancel')}</Button>,
          <Button key="apply" theme="solid" type="primary" loading={applying} onClick={doApply} style={{ background: ACCENT }}>
            {t('editor.aiPendingConflictApply')}
          </Button>,
        ]}
        width={Math.min(680, typeof window !== 'undefined' ? window.innerWidth - 80 : 680)}
        bodyStyle={{ maxHeight: '58vh', overflow: 'auto' }}
      >
        <div style={{ fontSize: 12.5, color: '#b76e00', background: '#fffaf0', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.6 }}>
          {t('editor.aiPendingConflictDesc')}
        </div>
        {conflict && <DeltaDetailsView details={conflict} />}
      </Modal>
    </>
  );
};

export default AiPendingBanner;
