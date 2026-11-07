/**
 * CanvasHistoryPopover —— 版本历史的唯一入口。
 *
 * 2026-11-04 收敛（用户决策）：时间线只展示落版版本里程碑。
 * 快照（AI 每轮 / 手动编辑 / 回滚 / 载入留下的本地撤销记录）是引擎内部的撤销深度，
 * 不再进入历史 UI——撤销走 Ctrl+Z 或重新载入版本；「回滚 / 修改节点」这类前端变动
 * 引起的记录一律不可见。版本只由「发布」产生：时间线上每个里程碑 = 一次用户显式
 * 发布的交付物，线上跑的是「生效中」的那个。
 *
 * 里程碑的「当前」按内容键判定（canvasContentKey，含节点坐标——2026-11-04 用户
 * 决策 B「完全按直觉」）：画布内容与哪个版本相同，哪个就是当前——载入旧版、以及
 * 手动编辑恰好回到与某版本一致时都成立。
 *
 * 结构：CanvasHistoryTimeline（纯内容，可独立渲染，测试直连）+
 *      CanvasHistoryPopover（拉版本数据 + Semi Popover 壳）。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Popover, Spin, Tag } from '@douyinfe/semi-ui';
import { IconHistory } from '@douyinfe/semi-icons';

import { workflowApi, type GaiaWorkflowVersion } from '../../services/workflow-api';
import { useLanguage, t } from '../../i18n';
import { canvasContentKey, versionContentKey } from '../../document/version-content';
import { useWorkflowDocumentState } from '../../document';
import { CHAT } from '../../chat/theme';
import { VersionDiffModal } from './VersionDiffModal';

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
    2,
    '0'
  )}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 里程碑的「产生原因」：source_session 有值 = 会话落版；createdBy=system = 新建工作流的初始版；
 *  createdBy=user = 手动保存（历史 W4 路径）；其余（apply 链路）= 编辑器落版 */
function versionSourceLabel(version: GaiaWorkflowVersion): string {
  if (version.sourceSession) return t('chat.msFromSession');
  if (version.createdBy === 'system') return t('chat.msFromSystem');
  if (version.createdBy === 'user') return t('chat.msFromManual');
  return t('chat.msFromEditor');
}

export interface CanvasHistoryTimelineProps {
  workflowCode?: string;
  versions: GaiaWorkflowVersion[];
  loading?: boolean;
  /** 把某个落版版本载入画布（编辑器 = 切换画布；会话页 = 替换会话草稿画布） */
  onLoadVersion?: (versionId: number) => void;
  /** 发布新版本：交给外层打开落版弹窗 */
  onPublish?: () => void;
}

/** 版本历史（纯内容）：只渲染里程碑卡片 */
export const CanvasHistoryTimeline: React.FC<CanvasHistoryTimelineProps> = ({
  workflowCode,
  versions,
  loading = false,
  onLoadVersion,
  onPublish,
}) => {
  useLanguage();
  const { doc } = useWorkflowDocumentState();
  /** 版本对比弹层：正在对比的版本 */
  const [diffVersion, setDiffVersion] = useState<{ id: number; versionNumber?: string } | null>(
    null
  );

  /** 画布当前内容键命中哪个里程碑：内容键含坐标后同键概率极低，但仍取第一个命中
   *  （列表按时间倒序 = 最新）唯一标记「当前」——同键多版本时的确定性 tie-break */
  const canvasCurrentVersionId = useMemo(() => {
    const key = canvasContentKey(doc.toJSON());
    for (const v of versions) {
      if (versionContentKey(v.workflowData) === key) return v.id ?? null;
    }
    return null;
  }, [doc, versions]);

  return (
    <div style={{ width: 340, maxHeight: 440, overflow: 'auto' }}>
      {!workflowCode ? (
        <div style={{ fontSize: 12, color: CHAT.textFaint, padding: '2px 0' }}>
          {t('chat.historyNoWorkflow')}
        </div>
      ) : loading ? (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : versions.length === 0 ? (
        <div style={{ fontSize: 12, color: CHAT.textFaint, padding: '2px 0' }}>
          {t('chat.historyNoVersion')}
        </div>
      ) : (
        versions.map((version) => {
          const isCurrent = version.isCurrent === 1;
          const isCanvasCurrent = version.id === canvasCurrentVersionId;
          return (
            <div
              key={version.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderRadius: 9,
                marginTop: 6,
                border: `1px solid ${isCanvasCurrent ? CHAT.accentSoft : CHAT.lineSoft}`,
                borderLeft: `3px solid ${
                  isCurrent ? CHAT.success : isCanvasCurrent ? CHAT.accent : CHAT.lineSoft
                }`,
                background: isCanvasCurrent ? CHAT.accentSoft : 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  background: CHAT.bgSunken,
                  borderRadius: 4,
                  padding: '0 5px',
                  lineHeight: '18px',
                  color: CHAT.textSub,
                  flexShrink: 0,
                }}
              >
                {version.versionNumber}
              </span>
              {isCurrent && (
                <Tag size="small" color="green" shape="circle">
                  {t('editor.effective')}
                </Tag>
              )}
              {isCanvasCurrent && (
                <span style={{ fontSize: 11, color: CHAT.accent, flexShrink: 0 }}>
                  {t('chat.snapshotCurrent')}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {version.versionDesc && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: CHAT.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={version.versionDesc}
                  >
                    {version.versionDesc}
                  </div>
                )}
                <div style={{ fontSize: 11, color: CHAT.textFaint, marginTop: 1 }}>
                  {versionSourceLabel(version)} · {formatDate(version.createdAt)}
                </div>
              </div>
              {onLoadVersion && version.id && !isCanvasCurrent && (
                <Button
                  size="small"
                  theme="borderless"
                  type="tertiary"
                  onClick={() => onLoadVersion(version.id!)}
                  style={{ borderRadius: 7, flexShrink: 0 }}
                >
                  {t('chat.loadAction')}
                </Button>
              )}
              {version.id && (
                <Button
                  size="small"
                  theme="borderless"
                  type="tertiary"
                  onClick={() =>
                    setDiffVersion({ id: version.id!, versionNumber: version.versionNumber })
                  }
                  style={{ borderRadius: 7, flexShrink: 0 }}
                >
                  {t('editor.versionDiff')}
                </Button>
              )}
            </div>
          );
        })
      )}

      <div style={{ fontSize: 11, color: CHAT.textFaint, marginTop: 10 }}>
        {t('chat.loadVersionHint')}
      </div>

      {onPublish && (
        <Button
          block
          theme="light"
          type="primary"
          onClick={onPublish}
          style={{ borderRadius: 9, marginTop: 8 }}
        >
          {t('chat.publishVersion')}
        </Button>
      )}

      <VersionDiffModal
        visible={diffVersion !== null}
        versionId={diffVersion?.id ?? null}
        versionNumber={diffVersion?.versionNumber}
        onClose={() => setDiffVersion(null)}
      />
    </div>
  );
};

export interface CanvasHistoryPopoverProps {
  workflowCode?: string;
  /** 发布新版本：交给外层打开落版弹窗 */
  onPublish?: () => void;
  /** 把某个落版版本载入画布（编辑器 = 切换画布；会话页 = 替换会话草稿画布） */
  onLoadVersion?: (versionId: number) => void;
  children: React.ReactNode;
}

export const CanvasHistoryPopover: React.FC<CanvasHistoryPopoverProps> = ({
  workflowCode,
  onPublish,
  onLoadVersion,
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [versions, setVersions] = useState<GaiaWorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Popover
      content={
        <CanvasHistoryTimeline
          workflowCode={workflowCode}
          versions={versions}
          loading={loading}
          onLoadVersion={onLoadVersion}
          onPublish={
            onPublish
              ? () => {
                  setVisible(false);
                  onPublish();
                }
              : undefined
          }
        />
      }
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
