import React, { useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { draggableContainerStyle } from '../sidebar/styles.tsx';
import { Resizable } from '../draggable-y';
import { PropertyItem, RunWorkflowMixPropertiesEdit } from '../../form-components/run-workflow-properties-edit';
import { getApiBaseUrl } from '../../utils/apiConfig'; // 导入API配置

const RunWorkflowSidebar: React.FC = () => {
  const { document } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const workflowJson = React.useMemo(() => {
    if (!document) {
      return null;
    }
    return document.toJSON();
  }, [document]);

  function parseProperties(properties: any) {
    let res = [];
    Object.keys(properties || {}).map((key) => {
      res.push({
        name: key,
        input: properties[key],
      });
    });
    return res;
  }

  React.useEffect(() => {
    if (
      !workflowJson ||
      !workflowJson.properties ||
      typeof workflowJson.properties !== 'object' ||
      Object.keys(workflowJson.properties).length === 0
    ) {
      setInputs([]);
      return;
    }
    setInputs(parseProperties(workflowJson.properties));
  }, [workflowJson]);

  const sendRunRequest = async (runData: any) => {
    try {
      setLoading(true);
      // 使用动态API基础URL
      const apiUrl = `${getApiBaseUrl()}/workflow/exec`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(runData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('运行出错:', error);
      setResult({ error: '请求失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => {
    let runData = {
      params: inputs.reduce((acc, item) => {
        if (item.name && item.input?.default?.content !== undefined) {
          acc[item.name] = item.input.default.content;
        }
        return acc;
      }, {} as Record<string, any>),
      workflow: workflowJson,
    };
    console.log('runData:', runData);
    sendRunRequest(runData);
  };

  if (
    !workflowJson ||
    !workflowJson.properties ||
    typeof workflowJson.properties !== 'object' ||
    Object.keys(workflowJson.properties).length === 0
  ) {
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>试运行工作流</Typography.Title>
      <Typography.Title heading={6}>输入</Typography.Title>
      <RunWorkflowMixPropertiesEdit
        value={inputs}
        onChange={(value) => {
          setInputs(value);
        }}
      />
      <Button
        type="primary"
        block
        onClick={handleRun}
        loading={loading}
        style={{ marginTop: '20px' }}
      >
        运行工作流
      </Button>
      {result && (
        <>
          <Typography.Title heading={6} style={{ marginTop: '20px' }}>
            输出结果
          </Typography.Title>
          <div
            style={{
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '4px',
              marginTop: '10px',
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
};

export default RunWorkflowSidebar;