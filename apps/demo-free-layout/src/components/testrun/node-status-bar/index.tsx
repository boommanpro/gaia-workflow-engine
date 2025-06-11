import { useEffect, useState } from 'react';

import { NodeReport } from '@flowgram.ai/runtime-interface';
import { useCurrentEntity, useService } from '@flowgram.ai/free-layout-editor';

import { WorkflowRuntimeService } from '../../../plugins/runtime-plugin/runtime-service';
import { NodeStatusRender } from './render';

const useNodeReport = () => {
  const node = useCurrentEntity();
  const [report, setReport] = useState<NodeReport>();

  const runtimeService = useService(WorkflowRuntimeService);

  useEffect(() => {
    const reportDisposer = runtimeService.onNodeReportChange((nodeReport) => {
      if (nodeReport.id !== node.id) {
        return;
      }
      setReport(nodeReport);
    });
    const resetDisposer = runtimeService.onReset(() => {
      setReport(undefined);
    });
    return () => {
      reportDisposer.dispose();
      resetDisposer.dispose();
    };
  }, []);

  return report;
};

export const NodeStatusBar = () => {
  const report = useNodeReport();

  if (!report) {
    return null;
  }

  return <NodeStatusRender report={report} />;
};
