/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

import { useClientContext, useService } from '@flowgram.ai/free-layout-editor';
import { Button, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconFile } from '@douyinfe/semi-icons';

import { CodeEditorModal } from '../../code-editor-modal';
import { WorkflowRuntimeService } from '../../../plugins/runtime-plugin/runtime-service';

export const ReportInput = () => {
  const ctx = useClientContext();
  const runtimeService = useService(WorkflowRuntimeService);
  const [showModal, setShowModal] = useState(false);
  const [reportData, setReportData] = useState('');

  const openModal = useCallback(() => {
    // 默认为空，让用户自己输入数据
    setReportData('');
    setShowModal(true);
  }, []);

  // 数据转换函数：将后端数据转换为 IReport 格式
  const convertToIReport = useCallback((rawData: any) => {
    console.log('Converting raw data:', rawData);

    // 转换 workflowStatus
    const workflowStatus = {
      status: rawData.workflowStatus?.status || 'succeeded',
      terminated: rawData.workflowStatus?.terminated ?? true,
      startTime: Date.now(),
      timeCost: 0,
    };

    // 转换 reports
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

    const iReport = {
      id: `workflow_${Date.now()}`,
      inputs: rawData.inputs || {},
      outputs: rawData.outputs || {},
      workflowStatus,
      reports,
      messages: rawData.messages || { error: [] },
    };

    console.log('Converted IReport:', iReport);
    return iReport;
  }, []);

  const handleReportSubmit = useCallback(
    async (data: string) => {
      try {
        const rawData = JSON.parse(data);

        // 验证基本数据格式
        if (!rawData.reports || typeof rawData.reports !== 'object') {
          Toast.error('Invalid report format: missing reports object');
          return;
        }

        console.log('Raw report data:', rawData);

        // 转换为 IReport 格式
        const iReport = convertToIReport(rawData);

        // 调用 runtime service 的 updateReport 方法来更新节点状态
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
      <Tooltip content={'Input Report Results'}>
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
