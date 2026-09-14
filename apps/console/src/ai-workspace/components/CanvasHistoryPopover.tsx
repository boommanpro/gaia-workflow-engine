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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popover, Spin, Tag, Toast } from '@douyinfe/semi-ui';
import { IconHistory, IconUndo, IconTick } from '@douyinfe/semi-icons';

import { useCanvasSnapshots, workflowDocumentStore } from '../../document';
import type { CanvasSnapshot } from '../../document';
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
  const [visible, setVisible] = useState(false);
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  const handleRollback = useCallback((snapshot: CanvasSnapshot) => {
    const ok = workflowDocumentStore.rollbackTo(snapshot.id);
    if (ok) Toast.success(t('chat.rollbackDone'));
    else Toast.error(t('chat.rollbackFailed'));
  }, []);

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

  const ordered = useMemo(() => snapshots.map((s, i) => ({ snapshot: s, versionNo: i + 1 })), [snapshots]);

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
