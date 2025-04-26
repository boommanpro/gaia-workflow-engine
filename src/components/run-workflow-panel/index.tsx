import React, { useEffect, useState } from 'react';

import { ScopeOutputData, useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { draggableContainerStyle } from '../sidebar/styles.tsx';
import { Resizable } from '../draggable-y';
import { PropertyItem, RunMixPropertiesEdit } from '../../form-components/run-properties-edit';

const RunWorkflowSidebar: React.FC = () => {
  const { selection, playground } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [nodesJSON, setNodesJSON] = useState<any[]>([]);
  const ctx = useClientContext();

  useEffect(() => {
    const nodes = ctx.document.toJSON().nodes;
    setNodesJSON(nodes);
  }, [ctx.document]);

  const startNode = nodesJSON.find((node) => node.type === 'start');
  const data = startNode ? startNode.data.outputs : {};

  function parseProperties(properties: any) {
    let res = [];
    console.log('properties:', properties);
    Object.keys(properties || {}).map((key) => {
      res.push({
        name: key,
        input: properties[key],
      });
    });
    return res;
  }

  useEffect(() => {
    if (startNode) {
      setInputs(parseProperties(startNode.data.outputs.properties));
    }
  }, [startNode]);

  const sendRunRequest = async (runData: any) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/workflow/exec', {
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
    console.log(inputs);
    let runData = {
      params: inputs.reduce((acc, item) => {
        if (item.name && item.input?.default !== undefined) {
          acc[item.name] = item.input.default;
        }
        return acc;
      }, {} as Record<string, any>),
      graph: ctx.document.toJSON(),
    };
    console.log('runData:', runData);
    sendRunRequest(runData);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>workflow运行</Typography.Title>
      <Typography.Title heading={6}>输入</Typography.Title>
      <RunMixPropertiesEdit
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
        运行
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
