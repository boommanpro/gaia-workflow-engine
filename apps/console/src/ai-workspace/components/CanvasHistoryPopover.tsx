/**
 * CanvasHistoryPopover —— 画布历史的统一入口。
 *
 * 一条时间线，两层含义：
 *   会话内快照：AI 每一轮 / 你每一次手动编辑留下的存档，随时可以回到任意一版。
 *   落版版本：写进后端的那几个正式版本，可以切换「哪个生效」。
 *
 * 两层的分工要讲清楚，否则用户会问「这两个有什么区别」：
 *   快照 = 工作台的撤销深度（不出这个会话）
 *   版本 = 交付物（别人跑的是这个）
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popover, Spin, Tag, Toast } from '@douyinfe/semi-ui';
import { IconHistory, IconUndo, IconTick } from '@douyinfe/semi-icons';

import { useCanvasSnapshots } from '../../document';
import type { CanvasSnapshot } from '../../document';
import { useAgent } from '../../agent/AgentContext';
import { rollbackCanvasTo } from '../../agent/canvas-draft-sync';
import { agentApi } from '../../agent/api';
import { workflowApi, type GaiaWorkflowVersion } from '../../services/workflow-api';
import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';

interface CanvasHistoryPopoverProps {
  workflowCode?: string;
  /** 发布新版本：交给外层打开落版弹窗 */
  onPublish?: () => void;
  /** 把画布切到某个落版版本查看（专家模式里用） */
  onViewVersion?: (versionId: number) => void;
  /** 当前正在查看的落版版本 id */
  viewingVersionId?: number;
  /** 「设为生效」成功后通知外层刷新它自己的版本列表 */
  onVersionsChanged?: () => void;
  children: React.ReactNode;
}

function reasonLabel(snapshot: CanvasSnapshot): string {
  switch (snapshot.reason) {
    case 'ai-generate':
      return t('chat.snapshotReasonGenerate');
    case 'ai-edit':
      return t('chat.snapshotReasonAiEdit');
    case 'user-edit':
      return t('chat.snapshotReasonUserEdit');
    case 'user-layout':
      return t('chat.snapshotReasonLayout');
    case 'rollback':
      return t('chat.snapshotReasonRollback');
    case 'import':
      return t('chat.snapshotReasonImport');
    default:
      return t('chat.snapshotReasonInit');
  }
}

function formatWhen(at: number): string {
  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

/** 规则摘要兜底：AI 摘要未就绪/失败时，从变更明细拼一句可读的话 */
function baselineSummary(snapshot: CanvasSnapshot): string {
  const d = snapshot.delta;
  const details = d.details;
  const parts: string[] = [];
  if (details?.nodes?.length) {
    const titlesOf = (c: 'added' | 'removed' | 'updated') =>
      details.nodes.filter((n) => n.change === c).map((n) => n.title);
    const added = titlesOf('added');
    const removed = titlesOf('removed');
    const updated = titlesOf('updated');
    if (added.length) parts.push(`${t('chat.historySumNodeAdded')}${added.slice(0, 2).join('、')}${added.length > 2 ? '…' : ''}`);
    if (removed.length) parts.push(`${t('chat.historySumNodeRemoved')}${removed.slice(0, 2).join('、')}${removed.length > 2 ? '…' : ''}`);
    if (updated.length) parts.push(`${t('chat.historySumNodeUpdated')}${updated.slice(0, 2).join('、')}${updated.length > 2 ? '…' : ''}`);
  }
  if (parts.length === 0 && (d.addedEdges || d.removedEdges)) {
    parts.push(`${t('chat.historySumEdges')} +${d.addedEdges || 0}/-${d.removedEdges || 0}`);
  }
  if (parts.length === 0) {
    if (snapshot.reason === 'ai-generate') return t('chat.historySumGenerate');
    if (snapshot.reason === 'rollback') return t('chat.historySumRollback');
    return t('chat.historySumTweak');
  }
  return parts.join(t('chat.historySumJoin'));
}

/** AI 摘要缓存（模块级）：面板关开不重拉，同会话同快照只总结一次 */
const summaryCache = new Map<string, string>();

export const CanvasHistoryPopover: React.FC<CanvasHistoryPopoverProps> = ({
  workflowCode,
  onPublish,
  onViewVersion,
  viewingVersionId,
  onVersionsChanged,
  children,
}) => {
  useLanguage();
  const { snapshots, cursor } = useCanvasSnapshots();
  const { currentSessionKey } = useAgent();
  const [visible, setVisible] = useState(false);
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  /** AI 摘要（snapshot.id → 一句话）：懒加载，打开面板时才批量总结 */
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const summarizingRef = useRef(new Set<string>());

  const loadVersions = useCallback(async () => {
    if (!workflowCode) {
      setVersions([]);
      return;
    }
    setLoading(true);
    try {
      const list = await workflowApi.listVersions(workflowCode);
      setVersions(list || []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [workflowCode]);

  useEffect(() => {
    if (visible) void loadVersions();
  }, [visible, loadVersions]);

  const ordered = useMemo(() => snapshots.map((s, i) => ({ snapshot: s, versionNo: i + 1 })), [snapshots]);

  // AI 摘要懒加载：面板打开时把缺摘要的条目（最多 30 条）批量发给模型总结。
  // 失败静默 —— 条目退回 baselineSummary 的规则摘要，不阻塞历史面板使用。
  useEffect(() => {
    if (!visible || !currentSessionKey) return;
    const pending = ordered
      .filter(({ snapshot }) => snapshot.outcome !== 'failed')
      .slice(-30)
      .filter(({ snapshot }) => {
        const key = `${currentSessionKey}:${snapshot.id}`;
        return !summaryCache.has(key) && !summarizingRef.current.has(key);
      })
      .map(({ snapshot, versionNo }) => ({
        id: snapshot.id,
        no: versionNo,
        reason: snapshot.reason,
        baseline: baselineSummary(snapshot),
        delta: snapshot.delta,
        nodeCount: snapshot.nodeCount,
        edgeCount: snapshot.edgeCount,
      }));
    if (pending.length === 0) return;
    pending.forEach((p) => summarizingRef.current.add(p.id));
    let cancelled = false;
    void (async () => {
      try {
        const res = await agentApi.snapshotSummaries(currentSessionKey, pending);
        if (cancelled || !res?.success || !res.summaries) return;
        const next: Record<string, string> = {};
        for (const p of pending) {
          const s = res.summaries[p.id];
          if (s) {
            summaryCache.set(`${currentSessionKey}:${p.id}`, s);
            next[p.id] = s;
          }
        }
        if (Object.keys(next).length > 0) setAiSummaries((prev) => ({ ...prev, ...next }));
      } catch { /* 静默：保留规则摘要 */ }
    })();
    return () => { cancelled = true; };
  }, [visible, ordered, currentSessionKey]);

  const handleRollback = useCallback((snapshot: CanvasSnapshot) => {
    // 回滚同时同步服务端草稿（阶段 1.1）：只改本地的话，之后的提问与「保存为版本」
    // 都还基于回滚前的内容
    const ok = rollbackCanvasTo(snapshot.id, currentSessionKey, (err) =>
      Toast.error(`${t('chat.rollbackSyncFailed')}${err}`)
    );
    if (ok) Toast.success(t('chat.rollbackDone'));
    else Toast.error(t('chat.rollbackFailed'));
  }, [currentSessionKey]);

  const handleSetEffective = useCallback(
    async (versionId: number) => {
      setBusyId(versionId);
      try {
        await workflowApi.setCurrentVersion(versionId);
        Toast.success(t('editor.versionSetCurrent'));
        await loadVersions();
        onVersionsChanged?.();
      } catch (error) {
        Toast.error(`${t('editor.versionSetCurrentFailed')}${(error as Error).message}`);
      } finally {
        setBusyId(null);
      }
    },
    [loadVersions, onVersionsChanged]
  );

  const content = (
    <div style={{ width: 320, maxHeight: 420, overflow: 'auto' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: CHAT.textMuted,
          letterSpacing: '0.05em',
          marginBottom: 8,
        }}
      >
        {t('chat.historySnapshots')}
      </div>

      {ordered.length === 0 ? (
        <div style={{ fontSize: 12, color: CHAT.textFaint, padding: '6px 0 12px' }}>
          {t('chat.historyEmpty')}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {ordered
            .slice()
            .reverse()
            .map(({ snapshot, versionNo }) => {
              const isCurrent = snapshots[cursor]?.id === snapshot.id;
              const failed = snapshot.outcome === 'failed';
              return (
                <div
                  key={snapshot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 8,
                    marginBottom: 3,
                    background: isCurrent ? CHAT.accentSoft : 'transparent',
                    opacity: snapshot.superseded && !isCurrent ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isCurrent ? CHAT.accent : failed ? CHAT.danger : CHAT.text,
                        }}
                      >
                        {t('chat.snapshotVersion', { n: versionNo })}
                      </span>
                      <span style={{ fontSize: 11.5, color: failed ? CHAT.danger : CHAT.textSub }}>
                        {failed ? t('chat.snapshotFailedShort') : reasonLabel(snapshot)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: CHAT.textFaint, marginTop: 2 }}>
                      {formatWhen(snapshot.at)}
                      {failed
                        ? ''
                        : ` · ${t('chat.snapshotNodes', {
                            nodes: snapshot.nodeCount,
                            edges: snapshot.edgeCount,
                          })}`}
                    </div>
                    {!failed && (() => {
                      const cached = currentSessionKey
                        ? summaryCache.get(`${currentSessionKey}:${snapshot.id}`) : undefined;
                      const summary = aiSummaries[snapshot.id] || cached || baselineSummary(snapshot);
                      return (
                        <div
                          style={{
                            fontSize: 11,
                            color: CHAT.textSub,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={summary}
                        >
                          {summary}
                        </div>
                      );
                    })()}
                  </div>
                  {isCurrent ? (
                    <span style={{ fontSize: 11, color: CHAT.accent, flexShrink: 0 }}>
                      {t('chat.snapshotCurrent')}
                    </span>
                  ) : (
                    !failed && (
                      <Button
                        size="small"
                        theme="borderless"
                        type="tertiary"
                        icon={<IconUndo size="small" />}
                        onClick={() => handleRollback(snapshot)}
                        style={{ borderRadius: 7, flexShrink: 0 }}
                      >
                        {t('chat.snapshotRollback')}
                      </Button>
                    )
                  )}
                </div>
              );
            })}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: CHAT.textMuted,
          letterSpacing: '0.05em',
          marginBottom: 8,
          paddingTop: 10,
          borderTop: `1px solid ${CHAT.lineSoft}`,
        }}
      >
        {t('chat.historyVersions')}
      </div>

      {!workflowCode ? (
        <div style={{ fontSize: 12, color: CHAT.textFaint, paddingBottom: 6 }}>
          {t('chat.historyNoWorkflow')}
        </div>
      ) : loading ? (
        <div style={{ padding: '8px 0', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : versions.length === 0 ? (
        <div style={{ fontSize: 12, color: CHAT.textFaint, paddingBottom: 6 }}>
          {t('chat.historyNoVersion')}
        </div>
      ) : (
        versions.map((version) => (
          <div
            key={version.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 8,
              marginBottom: 3,
              background: version.id === viewingVersionId ? CHAT.accentSoft : 'transparent',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: version.id === viewingVersionId ? CHAT.accent : CHAT.text,
              }}
            >
              {version.versionNumber}
            </span>
            {version.isCurrent === 1 && (
              <Tag size="small" color="green" shape="circle">
                {t('editor.effective')}
              </Tag>
            )}
            {version.id === viewingVersionId && version.isCurrent !== 1 && (
              <span style={{ fontSize: 11, color: CHAT.accent }}>{t('editor.viewing')}</span>
            )}
            <span style={{ fontSize: 11, color: CHAT.textFaint, marginLeft: 'auto' }}>
              {formatDate(version.createdAt)}
            </span>
            {onViewVersion && version.id !== viewingVersionId && (
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                onClick={() => version.id && onViewVersion(version.id)}
                style={{ borderRadius: 7, flexShrink: 0 }}
              >
                {t('chat.snapshotView')}
              </Button>
            )}
            {version.isCurrent !== 1 && (
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                icon={<IconTick size="small" />}
                loading={busyId === version.id}
                onClick={() => version.id && handleSetEffective(version.id)}
                style={{ borderRadius: 7, flexShrink: 0 }}
              >
                {t('editor.setEffective')}
              </Button>
            )}
          </div>
        ))
      )}

      {onPublish && (
        <Button
          block
          theme="light"
          type="primary"
          onClick={() => {
            setVisible(false);
            onPublish();
          }}
          style={{ borderRadius: 9, marginTop: 10 }}
        >
          {t('chat.publishVersion')}
        </Button>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      position="bottomRight"
      visible={visible}
      onVisibleChange={setVisible}
    >
      {children}
    </Popover>
  );
};

export default CanvasHistoryPopover;

/** 直接给一个「历史」按钮形态，省得每个调用点各写一遍 */
export const CanvasHistoryButton: React.FC<{
  workflowCode?: string;
  onPublish?: () => void;
}> = ({ workflowCode, onPublish }) => (
  <CanvasHistoryPopover workflowCode={workflowCode} {...(onPublish ? { onPublish } : {})}>
    <Button
      size="small"
      theme="borderless"
      type="tertiary"
      icon={<IconHistory size="small" />}
      aria-label={t('chat.historyTitle')}
    />
  </CanvasHistoryPopover>
);
