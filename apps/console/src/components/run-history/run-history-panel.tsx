/**
 * Copyright (c) 2025 Bytedance Ltd. and its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect, useCallback } from 'react';
import { PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';
import { useParams } from 'react-router-dom';
import { IconButton, Tag } from '@douyinfe/semi-ui';
import { IconUploadError, IconClose } from '@douyinfe/semi-icons';

import { WorkflowRuntimeService } from '../../plugins/runtime-plugin/runtime-service';
import {
  workflowApi,
  type WorkflowRunRecord,
  type WorkflowNodeRunRecord,
} from '../../services/workflow-api';
import { useLanguage, t, getCurrentLocale } from '../../i18n';

import styles from './index.module.less';

export const RUN_HISTORY_PANEL = 'run-history-panel';

/**
 * 运行历史（第一档 B 改造）：
 * - 数据源从"内存最近 50 条"改为后端持久化记录（GET /task/runs），重启不丢；
 * - 详情为只读报告（run 级入参/返回/错误 + 节点级明细）；
 * - 旧版"双击用历史 schema 整图 reload 覆盖当前画布"已删除——那是数据丢失风险，
 *   不是回放能力。
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

const statusColor = (status?: string | null): 'green' | 'red' | 'grey' => {
  if (status === 'success') return 'green';
  if (status === 'canceled') return 'grey';
  return 'red';
};

const statusLabel = (status?: string | null): string => {
  if (status === 'success') return t('runHistory.success');
  if (status === 'canceled') return t('runHistory.canceled');
  return t('runHistory.failure');
};

export const RunHistoryPanel = () => {
  const panelManager = usePanelManager();
  const runtimeService = useService(WorkflowRuntimeService);
  const { workflowCode } = useParams<{ workflowCode: string }>();
  useLanguage();

  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunRecord | null>(null);
  const [nodes, setNodes] = useState<WorkflowNodeRunRecord[]>([]);
  const [expandedNode, setExpandedNode] = useState<number | null>(null);

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
    } catch {
      setLoadingFailed(true);
    }
  }, [workflowCode]);

  useEffect(() => {
    void loadRuns();
    // 内存历史变化（新的一次试运行结束）→ 重新拉持久化列表
    const disposer = runtimeService.onHistoryChanged(() => {
      void loadRuns();
    });
    return () => {
      disposer.dispose();
    };
  }, [runtimeService, loadRuns]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        panelManager.close(RUN_HISTORY_PANEL);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelManager]);

  const handleSelectRun = useCallback(async (run: WorkflowRunRecord) => {
    setSelectedRun(run);
    setExpandedNode(null);
    try {
      const detail = await workflowApi.getTaskRunDetail(run.taskId);
      setNodes(detail?.nodes ?? []);
    } catch {
      setNodes([]);
    }
  }, []);

  const renderTable = () => {
    if (loadingFailed) {
      return (
        <div className={styles.emptyTableState}>
          <div className={styles.emptyText}>{t('runHistory.loadFailed')}</div>
        </div>
      );
    }
    if (runs.length === 0) {
      return (
        <div className={styles.emptyTableState}>
          <div className={styles.emptyText}>{t('runHistory.noRecords')}</div>
        </div>
      );
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('runHistory.time')}</th>
              <th>{t('runHistory.status')}</th>
              <th>{t('runHistory.duration')}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.taskId}
                className={`${styles.tableRow} ${
                  selectedRun?.taskId === run.taskId ? styles.selected : ''
                }`}
                onClick={() => void handleSelectRun(run)}
              >
                <td>{formatTime(run.finishedAt || run.createdAt)}</td>
                <td>
                  <Tag color={statusColor(run.status)}>{statusLabel(run.status)}</Tag>
                </td>
                <td>{formatDuration(run.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderNodeRow = (node: WorkflowNodeRunRecord) => {
    const expanded = expandedNode === node.id;
    const label = node.title || node.nodeId;
    return (
      <div key={node.id} style={{ marginBottom: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 6px',
            borderRadius: 6,
            cursor: 'pointer',
            background: expanded ? 'var(--semi-color-fill-0)' : 'transparent',
          }}
          onClick={() => setExpandedNode(expanded ? null : node.id)}
        >
          <Tag size="small" color={statusColor(node.status)}>
            {node.status || '-'}
          </Tag>
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {node.nodeType && (
            <span style={{ fontSize: 11, opacity: 0.55 }}>{node.nodeType}</span>
          )}
          <span style={{ fontSize: 11, opacity: 0.55 }}>{formatDuration(node.timeCostMs)}</span>
        </div>
        {expanded && (
          <div style={{ padding: '4px 10px' }}>
            {node.errorMessage && (
              <div style={{ fontSize: 11.5, color: 'var(--semi-color-danger)', marginBottom: 4 }}>
                {node.errorMessage}
              </div>
            )}
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{t('runHistory.nodeInputs')}</div>
            <pre className={styles.jsonContent}>{formatJson(parseJsonText(node.inputsJson))}</pre>
            <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>{t('runHistory.nodeOutputs')}</div>
            <pre className={styles.jsonContent}>{formatJson(parseJsonText(node.outputJson))}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedRun) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>{t('runHistory.selectRecord')}</div>
        </div>
      );
    }

    return (
      <div className={styles.detail}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('runHistory.detail')}</span>
          <Tag color={statusColor(selectedRun.status)}>{statusLabel(selectedRun.status)}</Tag>
          <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 'auto' }}>
            {formatDuration(selectedRun.durationMs)}
          </span>
        </div>

        <div className={styles.detailContent}>
          {selectedRun.errorMessage && (
            <>
              <div style={{ fontSize: 10.5, opacity: 0.6 }}>{t('runHistory.errorInfo')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--semi-color-danger)', marginBottom: 6 }}>
                {selectedRun.errorMessage}
              </div>
            </>
          )}
          <div style={{ fontSize: 10.5, opacity: 0.6 }}>{t('runHistory.inputs')}</div>
          <pre className={styles.jsonContent}>{formatJson(parseJsonText(selectedRun.inputsJson))}</pre>
          <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 4 }}>{t('runHistory.outputs')}</div>
          <pre className={styles.jsonContent}>{formatJson(parseJsonText(selectedRun.outputsJson))}</pre>

          <div style={{ fontSize: 10.5, opacity: 0.6, margin: '8px 0 4px' }}>{t('runHistory.nodes')}</div>
          {nodes.length === 0 ? (
            <div style={{ fontSize: 11.5, opacity: 0.55 }}>{t('runHistory.noRecords')}</div>
          ) : (
            nodes.map(renderNodeRow)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('runHistory.title')}</span>
        <IconButton
          type="tertiary"
          theme="borderless"
          icon={<IconClose />}
          onClick={() => panelManager.close(RUN_HISTORY_PANEL)}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.historySection}>
          <div className={styles.sectionTitle}>{t('runHistory.recordsHint')}</div>
          {renderTable()}
        </div>
        <div className={styles.detailSection}>{renderDetail()}</div>
      </div>
    </div>
  );
};

export const runHistoryPanelFactory: PanelFactory<void> = {
  key: RUN_HISTORY_PANEL,
  defaultSize: 600,
  render: () => <RunHistoryPanel />,
};

export const RunHistoryButton = () => {
  const panelManager = usePanelManager();

  return (
    <IconButton
      type="tertiary"
      theme="borderless"
      icon={<IconUploadError />}
      onClick={() => panelManager.open(RUN_HISTORY_PANEL, 'bottom')}
    />
  );
};
