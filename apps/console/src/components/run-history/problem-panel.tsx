/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect, useCallback } from 'react';
import { PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';
import { IconButton, Tag } from '@douyinfe/semi-ui';
import { IconUploadError, IconClose } from '@douyinfe/semi-icons';

import {
  WorkflowRuntimeService,
  TestRunRecord,
} from '../../plugins/runtime-plugin/runtime-service';
import { useLanguage, t, getCurrentLocale } from '../../i18n';

import styles from './index.module.less';

export const PROBLEM_PANEL = 'problem-panel';

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString(getCurrentLocale(), {
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
  useLanguage();

  const [history, setHistory] = useState<TestRunRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SelectedRecordState | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        panelManager.close(PROBLEM_PANEL);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelManager]);

  const handleRecordDoubleClick = useCallback(
    (record: TestRunRecord) => {
      const document = runtimeService.document;
      let nodeCreateCount = 0;
      const schemaNodes = (record.schema as Record<string, unknown>).nodes as
        | Array<unknown>
        | undefined;
      const targetNodeCount = schemaNodes?.length || 0;

      const updateReportData = () => {
        runtimeService.clearResult();
        if (record.report) {
          runtimeService.reset();
          runtimeService.updateReport(record.report);
        }
        setSelectedRecord({
          record,
          activeTab: record.status === 'error' ? 'errors' : 'inputs',
        });
      };

      if (targetNodeCount === 0) {
        updateReportData();
        return;
      }

      const nodeCreateDisposer = document.onNodeCreate(() => {
        nodeCreateCount++;
        if (nodeCreateCount >= targetNodeCount) {
          nodeCreateDisposer.dispose();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              updateReportData();
            });
          });
        }
      });

      document.reload(record.schema as any).then(() => {
        document.fitView();
      });
    },
    [runtimeService]
  );

  const handleTabChange = useCallback((tab: 'inputs' | 'outputs' | 'errors') => {
    setSelectedRecord((prev) => (prev ? { ...prev, activeTab: tab } : null));
  }, []);

  const renderTable = () => {
    if (history.length === 0) {
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
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
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
                    {record.status === 'success' ? t('runHistory.success') : t('runHistory.failure')}
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
          <div className={styles.emptyText}>{t('runHistory.selectRecord')}</div>
        </div>
      );
    }

    const { record, activeTab } = selectedRecord;

    return (
      <div className={styles.detail}>
        <div className={styles.detailHeader}>
          <span className={styles.detailTitle}>{t('runHistory.detail')}</span>
          <Tag color={record.status === 'success' ? 'green' : 'red'}>
            {record.status === 'success' ? t('runHistory.success') : t('runHistory.failure')}
          </Tag>
        </div>

        <div className={styles.tabs}>
          {record.errors && record.errors.length > 0 && (
            <span
              className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
              onClick={() => handleTabChange('errors')}
            >
              {t('runHistory.errorInfo')}
            </span>
          )}
          <span
            className={`${styles.tab} ${activeTab === 'inputs' ? styles.active : ''}`}
            onClick={() => handleTabChange('inputs')}
          >
            {t('runHistory.inputs')}
          </span>
          {record.status === 'success' && (
            <span
              className={`${styles.tab} ${activeTab === 'outputs' ? styles.active : ''}`}
              onClick={() => handleTabChange('outputs')}
            >
              {t('runHistory.outputs')}
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
        <span className={styles.title}>{t('runHistory.title')}</span>
        <IconButton
          type="tertiary"
          theme="borderless"
          icon={<IconClose />}
          onClick={() => panelManager.close(PROBLEM_PANEL)}
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
