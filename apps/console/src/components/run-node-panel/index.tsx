import React, { useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { PropertyItem, RunMixPropertiesEdit } from '../../form-components/run-properties-edit';
import { getApiBaseUrl } from '../../utils/apiConfig'; // 导入API配置
import { useLanguage, t } from '../../i18n';

const RunNodeSidebar: React.FC = () => {
  const { selection } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useLanguage();

  const data = React.useMemo(() => {
    if (!selection || selection.selection.length !== 1) {
      return null;
    }
    const node = selection.selection[0] as any;
    if (node._metaCache?.hiddenSidebar) {
      return null;
    }
    return node.toJSON();
  }, [selection.selection]);

  function parseProperties(properties: any) {
    let res: any[] = [];
    Object.keys(properties || {}).map((key) => {
      res.push({
        name: key,
        input: properties[key],
      });
    });
    return res;
  }

  React.useEffect(() => {
    const node = selection.selection[0] as any;
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
      // 使用动态API基础URL
      const apiUrl = `${getApiBaseUrl()}/workflow/singleNodeExec`;
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
      setResult({ error: t('runPanel.requestFailed') });
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
      <Typography.Title heading={5}>{t('runPanel.tryRunNode')}</Typography.Title>
      <Typography.Title heading={6}>{t('runPanel.inputs')}</Typography.Title>
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
        {t('runPanel.run')}
      </Button>
      {result && (
        <>
          <Typography.Title heading={6} style={{ marginTop: '20px' }}>
            {t('runPanel.outputResult')}
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