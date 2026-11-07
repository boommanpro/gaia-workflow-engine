/**
 * Copyright (c) 2025 Bytedance Ltd. and its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';
import { IconButton, Tag, Tooltip } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconCaretdown, IconClose, IconRefresh } from '@douyinfe/semi-icons';

import {
  workflowApi,
  type WorkflowRunRecord,
  type WorkflowRunDetailResponse,
  type WorkflowNodeRunRecord,
} from '../../services/workflow-api';
import {
  historyStatusToKind,
  type ReplayStatusKind,
} from '../../plugins/runtime-plugin/runtime-service/history-replay';
import {
  WorkflowRuntimeService,
  type ReplayState,
} from '../../plugins/runtime-plugin/runtime-service';
// 状态映射直接取叶子模块：runtime-service/index 与节点表单之间存在既有循环依赖，
// 经由它 re-export 的绑定在本模块顶层求值时可能尚未初始化（曾致整页白屏）
import { useLanguage, t, getCurrentLocale } from '../../i18n';
import { IconRunHistory } from '../../assets/icon-run-history';

import styles from './index.module.less';

export const RUN_HISTORY_PANEL = 'run-history-panel';

/**
 * 运行历史（2026-11-07 方案 A 重构：与变量 Dock 同一设计语言）：
 * - 面板结构与视觉对齐 variable-dock：Semi 主题变量、header/footer、keepDOM、可拖高度；
 * - 记录列表由原生表格改为按日期分组的紧凑行（今天/昨天/更早）；
 * - 点击记录详情 = 状态标签行 + 可折叠入参/返回值 + 节点执行轨迹（点击行定位画布节点），
 *   同时把该次运行的节点状态回放到当前画布（runtimeService.applyHistoryReport，
 *   复用试运行的节点渲染链，不新增节点渲染代码）；
 * - 旧的「双击用历史 schema 整图 reload 覆盖当前画布」保持删除——那是数据丢失风险；
 *   回放只叠加运行状态，不改动画布内容，画布横幅（RunReplayBanner）可随时退出。
 */
const formatTime = (iso?: string | null): string => {
  if (!iso) return '-';
  const date = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(getCurrentLocale(), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatClock = (iso?: string | null): string => {
  if (!iso) return '-';
  const date = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(getCurrentLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (ms?: number | null): string => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const parseJsonText = (text?: string | null): unknown => {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const formatJson = (data: unknown): string => {
  if (data === undefined || data === null) return '-';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

/** 状态 → 展示口径：run 级与节点级共用（history-replay 的单一映射）。
 *  包装成函数而不是顶层别名：绑定在调用时才解析，不受模块初始化顺序影响 */
const runStatusKind = (status?: string | null): ReplayStatusKind => historyStatusToKind(status);
type RunStatusKind = ReplayStatusKind;

const statusLabel = (kind: RunStatusKind): string => {
  if (kind === 'success') return t('runHistory.success');
  if (kind === 'canceled') return t('runHistory.canceled');
  if (kind === 'pending') return t('runHistory.notExecuted');
  return t('runHistory.failure');
};

const statusTagColor = (kind: RunStatusKind): 'green' | 'grey' | 'red' => {
  if (kind === 'success') return 'green';
  if (kind === 'canceled' || kind === 'pending') return 'grey';
  return 'red';
};

interface RunDayGroup {
  key: string;
  label: string;
  runs: WorkflowRunRecord[];
}

/** 按本地日期分组：今天 / 昨天 / 更早（日期字符串） */
const groupRunsByDay = (runs: WorkflowRunRecord[]): RunDayGroup[] => {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;

  const groups = new Map<string, RunDayGroup>();
  for (const run of runs) {
    const iso = run.finishedAt || run.createdAt;
    const date = iso ? new Date(iso.replace(' ', 'T')) : null;
    const day = date && !Number.isNaN(date.getTime()) ? startOfDay(date) : Number.NaN;
    let key: string;
    let label: string;
    if (day === today) {
      key = 'today';
      label = t('runHistory.today');
    } else if (day === yesterday) {
      key = 'yesterday';
      label = t('runHistory.yesterday');
    } else if (Number.isNaN(day)) {
      key = 'unknown';
      label = '-';
    } else {
      key = new Date(day).toISOString().slice(0, 10);
      label = new Date(day).toLocaleDateString(getCurrentLocale(), {
        month: '2-digit',
        day: '2-digit',
      });
    }
    let group = groups.get(key);
    if (!group) {
      group = { key, label, runs: [] };
      groups.set(key, group);
    }
    group.runs.push(run);
  }
  // runs 本身按时间倒序（后端返回），分组顺序按首次出现保持稳定
  return [...groups.values()];
};

/** 触发来源标签：后端目前只有 editor，未知值原样展示 */
const triggerLabel = (channel?: string | null): string | null => {
  if (!channel) return null;
  if (channel === 'editor') return t('runHistory.triggerEditor');
  return channel;
};

/** 可折叠小节：入参 / 返回值 */
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHead}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <IconCaretdown
          size="small"
          className={`${styles.sectionChevron} ${open ? '' : styles.sectionChevronClosed}`}
        />
        <span>{title}</span>
      </button>
      {open && children}
    </div>
  );
};

const NodeTraceRow = ({ node }: { node: WorkflowNodeRunRecord }) => {
  const runtimeService = useService(WorkflowRuntimeService);
  const kind = runStatusKind(node.status);
  return (
    <div
      key={node.id}
      className={`${styles.traceRow} ${
        kind === 'success'
          ? styles.traceRowSuccess
          : kind === 'canceled' || kind === 'pending'
          ? styles.traceRowCanceled
          : styles.traceRowFailed
      }`}
      role="button"
      tabIndex={0}
      title={`${node.title || node.nodeId} · ${t('runHistory.locateNode')}`}
      onClick={() => runtimeService.focusNode(node.nodeId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          runtimeService.focusNode(node.nodeId);
        }
      }}
    >
      <span className={styles.traceDot} />
      <span className={styles.traceTitle}>{node.title || node.nodeId}</span>
      {node.nodeType && <span className={styles.traceType}>{node.nodeType}</span>}
      <span className={styles.traceDuration}>
        {kind === 'pending' ? t('runHistory.notExecuted') : formatDuration(node.timeCostMs)}
      </span>
    </div>
  );
};

export const RunHistoryPanel = () => {
  const panelManager = usePanelManager();
  const runtimeService = useService(WorkflowRuntimeService);
  const { workflowCode } = useParams<{ workflowCode: string }>();
  useLanguage();

  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunRecord | null>(null);
  const [detail, setDetail] = useState<WorkflowRunDetailResponse | null>(null);
  const [replay, setReplay] = useState<ReplayState | undefined>(() => runtimeService.getReplay());

  const loadRuns = useCallback(async () => {
    try {
      // 会话草稿（__draft__）不携带编码：查全量最近记录
      const list = await workflowApi.listTaskRuns(
        workflowCode && workflowCode !== '__draft__' ? workflowCode : undefined,
        1,
        50
      );
      setRuns(list);
      setLoadingFailed(false);
      return list;
    } catch {
      setLoadingFailed(true);
      return [];
    }
  }, [workflowCode]);

  /** 审计 A20：快速连点两条记录时，只认最后一次选择的响应（last-write-wins 竞态） */
  const selectSeqRef = useRef(0);
  const selectRun = useCallback(
    async (run: WorkflowRunRecord) => {
      const seq = ++selectSeqRef.current;
      setSelectedRun(run);
      try {
        const runDetail = await workflowApi.getTaskRunDetail(run.taskId);
        if (selectSeqRef.current !== seq) return; // 过期响应：用户已改选
        setDetail(runDetail);
        // 详情拉取成功才回放：失败时保留画布现状，不叠加半份数据
        runtimeService.applyHistoryReport({
          taskId: run.taskId,
          label: formatTime(run.finishedAt || run.createdAt),
          nodes: runDetail?.nodes ?? [],
        });
      } catch {
        if (selectSeqRef.current !== seq) return;
        setDetail(null);
      }
    },
    [runtimeService]
  );

  useEffect(() => {
    let disposed = false;
    void loadRuns().then((list) => {
      // 打开面板即选中最近一条：详情与画布回放一步到位（方案 A 稿交互）；
      // 实时试运行进行中不抢状态（回放会被轮询立刻覆盖）
      if (!disposed && list.length > 0 && !runtimeService.isTaskRunning()) {
        void selectRun(list[0]);
      }
    });
    // 内存历史变化（新的一次试运行结束）→ 重新拉持久化列表
    const disposer = runtimeService.onHistoryChanged(() => {
      void loadRuns();
    });
    return () => {
      disposed = true;
      disposer.dispose();
    };
  }, [runtimeService, loadRuns, selectRun]);

  useEffect(() => {
    const replayDisposer = runtimeService.onReplayChanged((state) => {
      setReplay(state ?? undefined);
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // 审计 A37：Esc 只在没有更高层（输入焦点/对话框）接管时收起本面板，
      // 不再连坐关闭叠在上面的 Modal
      if (e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      panelManager.close(RUN_HISTORY_PANEL);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      replayDisposer.dispose();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelManager, runtimeService]);

  // 审计 A37：keepDOM 面板关闭后列表/选中不会自动更新——重开时重新拉取
  useEffect(() => {
    const panel = panelManager.getPanels('bottom').find((p) => p.key === RUN_HISTORY_PANEL);
    if (!panel) return;
    const unsub = panel.store.subscribe(() => {
      const { visible } = panel.store.getState();
      if (visible) void loadRuns();
    });
    return unsub;
  }, [panelManager, loadRuns]);

  const dayGroups = useMemo(() => groupRunsByDay(runs), [runs]);

  /** 匹配数徽标：仅在回放正是当前选中记录时展示（切换中/拉取失败不误导） */
  const matchedInfo = useMemo(() => {
    if (!selectedRun || !replay || replay.taskId !== selectedRun.taskId) return null;
    return t('runHistory.nodeMatch', { m: replay.matched, t: replay.total });
  }, [selectedRun, replay]);

  const renderRunList = () => {
    if (loadingFailed) {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>{t('runHistory.loadFailed')}</span>
        </div>
      );
    }
    if (runs.length === 0) {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>{t('runHistory.noRecords')}</span>
        </div>
      );
    }
    return dayGroups.map((group) => (
      <div key={group.key} className={styles.dayGroup}>
        <div className={styles.dayLabel}>{group.label}</div>
        {group.runs.map((run) => {
          const kind = runStatusKind(run.status);
          return (
            <div
              key={run.taskId}
              role="button"
              tabIndex={0}
              title={`${formatTime(run.finishedAt || run.createdAt)} · ${statusLabel(
                kind
              )} · ${formatDuration(run.durationMs)}`}
              className={`${styles.runRow} ${
                selectedRun?.taskId === run.taskId ? styles.runRowSelected : ''
              }`}
              onClick={() => void selectRun(run)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void selectRun(run);
                }
              }}
            >
              <span
                className={`${styles.statusDot} ${
                  kind === 'success'
                    ? styles.statusDotSuccess
                    : kind === 'canceled'
                    ? styles.statusDotCanceled
                    : styles.statusDotFailure
                }`}
              />
              <span className={styles.runTime}>{formatClock(run.finishedAt || run.createdAt)}</span>
              <span className={styles.runDuration}>{formatDuration(run.durationMs)}</span>
            </div>
          );
        })}
      </div>
    ));
  };

  const renderDetail = () => {
    if (!selectedRun || !detail) {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>{t('runHistory.selectRecord')}</span>
        </div>
      );
    }

    const kind = runStatusKind(selectedRun.status);
    const trigger = triggerLabel(selectedRun.triggerChannel);
    // 详情异常形状（缺 nodes）不崩面板：按无轨迹处理
    const traceNodes = detail.nodes ?? [];

    return (
      <div className={styles.detail}>
        <div className={styles.metaRow}>
          <Tag size="small" color={statusTagColor(kind)}>
            {statusLabel(kind)}
          </Tag>
          <Tag size="small" color="white" className={styles.metaTag}>
            {t('runHistory.duration')} {formatDuration(selectedRun.durationMs)}
          </Tag>
          {matchedInfo && (
            <Tag size="small" color="white" className={styles.metaTag}>
              {matchedInfo}
            </Tag>
          )}
          {trigger && (
            <Tag size="small" color="white" className={styles.metaTag}>
              {trigger}
            </Tag>
          )}
        </div>

        {selectedRun.errorMessage && (
          <div className={styles.errorCallout}>
            <IconAlertTriangle size="small" />
            <span>{selectedRun.errorMessage}</span>
          </div>
        )}

        <CollapsibleSection title={t('runHistory.inputs')}>
          <pre className={styles.jsonContent}>
            {formatJson(parseJsonText(selectedRun.inputsJson))}
          </pre>
        </CollapsibleSection>
        <CollapsibleSection title={t('runHistory.outputs')}>
          <pre className={styles.jsonContent}>
            {formatJson(parseJsonText(selectedRun.outputsJson))}
          </pre>
        </CollapsibleSection>

        <div className={styles.section}>
          <div className={styles.sectionHeadStatic}>{t('runHistory.nodeTrace')}</div>
          <div className={styles.traceHint}>{t('runHistory.nodeTraceHint')}</div>
          {traceNodes.length === 0 ? (
            <div className={styles.traceEmpty}>{t('runHistory.noRecords')}</div>
          ) : (
            traceNodes.map((node) => <NodeTraceRow key={node.id} node={node} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('runHistory.title')}</span>
        {replay && (
          <Tooltip content={t('runHistory.replayBadgeHint')}>
            <span className={styles.replayBadge}>
              <span className={styles.replayBadgeDot} />
              {t('runHistory.replaying')}
            </span>
          </Tooltip>
        )}
        <span className={styles.count}>{t('runHistory.count', { n: runs.length })}</span>
        <span className={styles.spacer} />
        <Tooltip content={t('runHistory.refresh')}>
          <IconButton
            type="tertiary"
            theme="borderless"
            size="small"
            icon={<IconRefresh />}
            aria-label={t('runHistory.refresh')}
            onClick={() => void loadRuns()}
          />
        </Tooltip>
        <IconButton
          type="tertiary"
          theme="borderless"
          size="small"
          icon={<IconClose />}
          aria-label={t('runHistory.close')}
          onClick={() => panelManager.close(RUN_HISTORY_PANEL)}
        />
        <span className={styles.kbd}>ESC</span>
      </div>

      <div className={styles.content}>
        <div className={styles.runList}>{renderRunList()}</div>
        <div className={styles.detailPane}>{renderDetail()}</div>
      </div>

      <div className={styles.footer}>{t('runHistory.footerHint')}</div>
    </div>
  );
};

export const runHistoryPanelFactory: PanelFactory<void> = {
  key: RUN_HISTORY_PANEL,
  /** bottom 区面板的 size 语义是像素高度（对齐变量 Dock 的高度区间） */
  defaultSize: 340,
  minSize: 220,
  maxSize: 640,
  /** 关闭时保留 DOM：选中记录 / 折叠状态在开关之间不丢 */
  keepDOM: true,
  render: () => <RunHistoryPanel />,
};

/** 工具栏入口。2026-11-06 图标定稿：自绘「运行日志」线性 SVG（Lucide scroll-text 几何），
 *  替换 IconPulse；顺带补上此前缺失的 Tooltip / aria-label。 */
export const RunHistoryButton = () => {
  const panelManager = usePanelManager();
  useLanguage();

  return (
    <Tooltip content={t('runHistory.title')}>
      <IconButton
        type="tertiary"
        theme="borderless"
        icon={IconRunHistory}
        aria-label={t('runHistory.title')}
        onClick={() => panelManager.open(RUN_HISTORY_PANEL, 'bottom')}
      />
    </Tooltip>
  );
};
