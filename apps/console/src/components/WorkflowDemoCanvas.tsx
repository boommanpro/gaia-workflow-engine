/**
 * 可交互工作流演示画布（只读浏览，可平移/缩放/查看节点详情）。
 *
 * 首页「在线演示」tab 与 /preview 页共用：
 * 优先加载第一个工作流当前版本的编排数据，失败时退回内置示例。
 */
import React, { useEffect, useState } from 'react';
import { WorkflowViewer } from '../editor';
import { initialData } from '../initial-data';
import { workflowApi } from '../services/workflow-api';

export const WorkflowDemoCanvas: React.FC<{ height?: number | string }> = ({ height = 720 }) => {
  const [viewerData, setViewerData] = useState<any>(initialData);

  useEffect(() => {
    (async () => {
      try {
        const workflows = await workflowApi.listWorkflows();
        if (workflows && workflows.length > 0) {
          const wf = workflows[0];
          if (wf.currentVersionId) {
            try {
              const version = await workflowApi.getVersionById(wf.currentVersionId);
              if (version?.workflowData) {
                const parsed = typeof version.workflowData === 'string'
                  ? JSON.parse(version.workflowData)
                  : version.workflowData;
                if (parsed?.nodes?.length > 0) {
                  setViewerData(parsed);
                }
              }
            } catch { /* keep initialData */ }
          }
        }
      } catch { /* ignore */ }
    })();
  }, []);

  return <WorkflowViewer data={viewerData} height={height} />;
};

export default WorkflowDemoCanvas;
