import React, { useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { draggableContainerStyle } from '../sidebar/styles.tsx';
import { Resizable } from '../draggable-y';
import { PropertyItem, RunMixPropertiesEdit } from '../../form-components/run-properties-edit';

const RunNodeSidebar: React.FC = () => {
  const { selection, playground } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const data = React.useMemo(() => {
    if (!selection || selection.selection.length !== 1) {
      return null;
    }
    const node = selection.selection[0];
    if (node._metaCache?.hiddenSidebar) {
      return null;
    }
    return node.toJSON();
  }, [selection.selection]);

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
    const node = selection.selection[0];
    console.log('data changed:', data);
    if (!node || node._metaCache?.runDisable) {
      return;
    }
    if (
      !data ||
      typeof data.data.inputs !== 'object' ||
      data.data.inputs === null ||
      Object.keys(data.data.inputs).length === 0
    ) {
      setInputs([]);
      return;
    }
    setInputs(parseProperties(data.data.inputs.properties));
  }, [selection.selection]);

  const sendRunRequest = async (runData: any) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/workflow/singleNodeExec', {
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
      node: data,
    };
    console.log('runData:', runData);
    sendRunRequest(runData);
  };

  if (
    !data ||
    typeof data.data.inputs !== 'object' ||
    data.data.inputs === null ||
    Object.keys(data.data.inputs).length === 0
  ) {
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>试运行</Typography.Title>
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

export default RunNodeSidebar;
