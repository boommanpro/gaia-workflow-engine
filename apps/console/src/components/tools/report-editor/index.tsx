import { useCallback, useState } from 'react';

import { useService } from '@flowgram.ai/free-layout-editor';
import { Toast } from '@douyinfe/semi-ui';
import { IconChevronRight, IconFile } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../../code-editor-modal';
import { WorkflowRuntimeService } from '../../../plugins/runtime-plugin/runtime-service';
import { useLanguage, t } from '../../../i18n';

export const ReportEditor = () => {
  const runtimeService = useService(WorkflowRuntimeService);
  useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [reportData, setReportData] = useState('');

  const openModal = useCallback(() => {
    const currentReport = runtimeService.getCurrentReport();
    if (currentReport) {
      setReportData(JSON.stringify(currentReport, null, 2));
    } else {
      setReportData('');
    }
    setShowModal(true);
  }, [runtimeService]);

  const convertToIReport = useCallback((rawData: any) => {
    const workflowStatus = {
      status: rawData.workflowStatus?.status || 'succeeded',
      terminated: rawData.workflowStatus?.terminated ?? true,
      startTime: Date.now(),
      timeCost: 0,
    };

    const reports: Record<string, any> = {};

    if (rawData.reports && typeof rawData.reports === 'object') {
      Object.entries(rawData.reports).forEach(([nodeId, nodeReport]: [string, any]) => {
        reports[nodeId] = {
          id: nodeId,
          status: nodeReport.status || 'succeeded',
          startTime: nodeReport.startTime || Date.now(),
          endTime: nodeReport.endTime || Date.now(),
          timeCost: nodeReport.timeCost || 0,
          snapshots: (nodeReport.snapshots || []).map((snapshot: any, index: number) => ({
            id: `${nodeId}_snapshot_${index}`,
            nodeID: snapshot.nodeID || nodeId,
            inputs: snapshot.inputs || {},
            outputs: snapshot.outputs || {},
            data: snapshot.data || {},
            branch: snapshot.branch || '',
            error: snapshot.error || '',
          })),
        };
      });
    }

    return {
      id: `workflow_${Date.now()}`,
      inputs: rawData.inputs || {},
      outputs: rawData.outputs || {},
      workflowStatus,
      reports,
      messages: rawData.messages || { error: [] },
    };
  }, []);

  const handleReportSubmit = useCallback(
    async (data: string) => {
      try {
        const rawData = JSON.parse(data);

        if (!rawData.reports || typeof rawData.reports !== 'object') {
          Toast.error('Invalid report format: missing reports object');
          return;
        }

        const iReport = convertToIReport(rawData);
        runtimeService.reset();
        runtimeService.updateReport(iReport);

        Toast.success('Report data loaded successfully');
        setShowModal(false);
      } catch (error) {
        console.error('Failed to parse report data:', error);
        Toast.error('Invalid JSON format');
      }
    },
    [runtimeService, convertToIReport]
  );

  return (
    <>
      {/* 2026-11-07 改版：偏好面板整行条目（原小图标钮命中区过小） */}
      <button type="button" className="gaia-prefs-action" onClick={openModal}>
        <IconFile size="small" className="gaia-prefs-action-icon" />
        <span className="gaia-prefs-action-label">{t('tool.reportEditor')}</span>
        <IconChevronRight size="small" className="gaia-prefs-action-arrow" />
      </button>
      <CodeEditorModal
        value={reportData}
        language="json"
        visible={showModal}
        onVisibleChange={setShowModal}
        onChange={handleReportSubmit}
        options={{ readOnly: false }}
      />
    </>
  );
};
