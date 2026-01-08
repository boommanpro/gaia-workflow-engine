import { useCallback, useState } from 'react';

import { useService } from '@flowgram.ai/free-layout-editor';
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconTerminal, IconFile } from '@douyinfe/semi-icons';

import { WorkflowRuntimeService } from '../../../plugins/runtime-plugin/runtime-service';
import { CodeEditorModal } from '../../code-editor-modal';

export const ReportEditor = () => {
  const runtimeService = useService(WorkflowRuntimeService);
  const [showModal, setShowModal] = useState(false);
  const [reportData, setReportData] = useState('');

  const openModal = useCallback(() => {
    const lastReport = runtimeService.getLastReport();
    if (lastReport) {
      setReportData(JSON.stringify(lastReport, null, 2));
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
      <Tooltip content={'Report Editor'}>
        <Button type="tertiary" icon={<IconFile />} theme="borderless" onClick={openModal} />
      </Tooltip>
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
