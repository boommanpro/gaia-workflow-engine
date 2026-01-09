/**
 * Copyright (c) 2025 Bytedance Ltd. and/or affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect, useCallback } from 'react';

import { PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';
import { IconButton, Tag, Modal } from '@douyinfe/semi-ui';
import { IconUploadError, IconClose, IconDelete, IconRefresh } from '@douyinfe/semi-icons';

import {
  WorkflowRuntimeService,
  TestRunRecord,
} from '../../plugins/runtime-plugin/runtime-service';

import styles from './index.module.less';

export const PROBLEM_PANEL = 'problem-panel';

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatJson = (data: unknown): string => {
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return '{}';
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

interface SelectedRecordState {
  record: TestRunRecord;
  activeTab: 'inputs' | 'outputs' | 'errors';
}

export const ProblemPanel = () => {
  const panelManager = usePanelManager();
  const runtimeService = useService(WorkflowRuntimeService);

  const [history, setHistory] = useState<TestRunRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SelectedRecordState | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    const initialHistory = runtimeService.getHistory();
    setHistory(initialHistory);

    const disposer = runtimeService.onHistoryChanged((newHistory) => {
      setHistory(newHistory);
    });

    return () => {
      disposer.dispose();
    };
  }, [runtimeService]);

  const filteredHistory = history.filter((record) => {
    if (filterStatus === 'all') return true;
    return record.status === filterStatus;
  });

  const handleClearHistory = useCallback(() => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      onOk: () => {
        runtimeService.clearHistory();
        setSelectedRecord(null);
      },
    });
  }, [runtimeService]);

  const handleRecordDoubleClick = useCallback(
    (record: TestRunRecord) => {
      const document = runtimeService.document;
      document.reload(record.schema as any).then(() => {
        document.fitView();
      });
      runtimeService.clearResult();
      setSelectedRecord({
        record,
        activeTab: record.status === 'error' ? 'errors' : 'inputs',
      });
      if (record.report) {
        runtimeService.reset()
        runtimeService.updateReport(record.report);
      }
    },
    [runtimeService]
  );

  const handleTabChange = useCallback((tab: 'inputs' | 'outputs' | 'errors') => {
    setSelectedRecord((prev) => (prev ? { ...prev, activeTab: tab } : null));
  }, []);

  const renderTable = () => {
    if (filteredHistory.length === 0) {
      return (
        <div className={styles.emptyTableState}>
          <div className={styles.emptyText}>暂无运行记录</div>
        </div>
      );
    }

    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((record) => (
              <tr
                key={record.id}
                className={`${styles.tableRow} ${
                  selectedRecord?.record.id === record.id ? styles.selected : ''
                }`}
                onClick={() =>
                  setSelectedRecord({
                    record,
                    activeTab: record.status === 'error' ? 'errors' : 'inputs',
                  })
                }
                onDoubleClick={() => handleRecordDoubleClick(record)}
              >
                <td>{formatTime(record.timestamp)}</td>
                <td>
                  <Tag color={record.status === 'success' ? 'green' : 'red'}>
                    {record.status === 'success' ? '成功' : '失败'}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedRecord) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>选择一个记录查看详情</div>
        </div>
      );
    }

    const { record, activeTab } = selectedRecord;

    return (
      <div className={styles.detail}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>运行详情</span>
          <Tag color={record.status === 'success' ? 'green' : 'red'}>
            {record.status === 'success' ? '成功' : '失败'}
          </Tag>
        </div>

        <div className={styles.tabs}>
          {record.errors && record.errors.length > 0 && (
            <span
              className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
              onClick={() => handleTabChange('errors')}
            >
              错误信息
            </span>
          )}
          <span
            className={`${styles.tab} ${activeTab === 'inputs' ? styles.active : ''}`}
            onClick={() => handleTabChange('inputs')}
          >
            入参
          </span>
          {record.status === 'success' && (
            <span
              className={`${styles.tab} ${activeTab === 'outputs' ? styles.active : ''}`}
              onClick={() => handleTabChange('outputs')}
            >
              返回值
            </span>
          )}
        </div>

        <div className={styles.detailContent}>
          {activeTab === 'errors' && (
            <div className={styles.errorList}>
              {record.errors?.map((error, index) => (
                <div key={index} className={styles.errorItem}>
                  {error}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'inputs' && (
            <pre className={styles.jsonContent}>{formatJson(record.inputs)}</pre>
          )}
          {activeTab === 'outputs' && (
            <pre className={styles.jsonContent}>{formatJson(record.outputs)}</pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>运行历史</span>
        <div className={styles.headerActions}>
          <IconButton
            type="tertiary"
            theme="borderless"
            icon={<IconRefresh />}
            onClick={() => setHistory(runtimeService.getHistory())}
            title="刷新"
          />
          <IconButton
            type="tertiary"
            theme="borderless"
            icon={<IconDelete />}
            onClick={handleClearHistory}
            title="清空历史"
          />
          <IconButton
            type="tertiary"
            theme="borderless"
            icon={<IconClose />}
            onClick={() => panelManager.close(PROBLEM_PANEL)}
          />
        </div>
      </div>

      <div className={styles.filterBar}>
        <span
          className={`${styles.filterItem} ${filterStatus === 'all' ? styles.active : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          全部
        </span>
        <span
          className={`${styles.filterItem} ${filterStatus === 'success' ? styles.active : ''}`}
          onClick={() => setFilterStatus('success')}
        >
          成功
        </span>
        <span
          className={`${styles.filterItem} ${filterStatus === 'error' ? styles.active : ''}`}
          onClick={() => setFilterStatus('error')}
        >
          失败
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.historySection}>
          <div className={styles.sectionTitle}>历史记录（双击切换）</div>
          {renderTable()}
        </div>
        <div className={styles.detailSection}>{renderDetail()}</div>
      </div>
    </div>
  );
};

export const problemPanelFactory: PanelFactory<void> = {
  key: PROBLEM_PANEL,
  defaultSize: 600,
  render: () => <ProblemPanel />,
};

export const ProblemButton = () => {
  const panelManager = usePanelManager();

  return (
    <IconButton
      type="tertiary"
      theme="borderless"
      icon={<IconUploadError />}
      onClick={() => panelManager.open(PROBLEM_PANEL, 'bottom')}
    />
  );
};
