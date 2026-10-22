import React, { useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Button, Typography } from '@douyinfe/semi-ui';

import { PropertyItem, RunWorkflowMixPropertiesEdit } from '../../form-components/run-workflow-properties-edit';
import { getApiBaseUrl } from '../../utils/apiConfig'; // 导入API配置
import { useLanguage, t } from '../../i18n';

const RunWorkflowSidebar: React.FC = () => {
  const { document } = useClientContext();
  const [inputs, setInputs] = useState<PropertyItem[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  /** 运行阶段（阶段 3.1）：idle → running → success | failed，区分「正在跑」
   *  与「跑完且失败」——失败必须醒目，不能埋在结果 JSON 里被当成正常输出 */
  const [phase, setPhase] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [failReason, setFailReason] = useState<string | null>(null);
  useLanguage();

  const workflowJson = React.useMemo(() => {
    if (!document) {
      return null;
    }
    return document.toJSON();
  }, [document]);

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
    const workflowJsonAny = workflowJson as any;
    if (
      !workflowJsonAny ||
      !workflowJsonAny.properties ||
      typeof workflowJsonAny.properties !== 'object' ||
      Object.keys(workflowJsonAny.properties).length === 0
    ) {
      setInputs([]);
      return;
    }
    setInputs(parseProperties(workflowJsonAny.properties));
  }, [workflowJson]);

  const sendRunRequest = async (runData: any) => {
    try {
      setLoading(true);
      setPhase('running');
      setFailReason(null);
      setResult(null); // 旧结果不清会让「正在跑」与「上一次的输出」同屏混淆
      // 使用动态API基础URL
      const apiUrl = `${getApiBaseUrl()}/workflow/exec`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(runData),
      });

      if (!response.ok) {
        // HTTP 层失败：明确进入 failed 态（旧行为把错误塞进 result 当输出展示）
        setPhase('failed');
        setFailReason(`${t('runPanel.requestFailed')} (HTTP ${response.status})`);
        return;
      }
      const data = await response.json();
      setResult(data);
      setPhase(data?.error || data?.success === false ? 'failed' : 'success');
      if (data?.error || data?.success === false) {
        setFailReason(String(data?.error || t('runPanel.execFailed')));
      }
    } catch (error) {
      console.error('运行出错:', error);
      setPhase('failed');
      setFailReason(`${t('runPanel.requestFailed')}: ${(error as Error).message}`);
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
    !(workflowJson as any).properties ||
    typeof (workflowJson as any).properties !== 'object' ||
    Object.keys((workflowJson as any).properties).length === 0
  ) {
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <Typography.Title heading={5}>{t('runPanel.tryRunWorkflow')}</Typography.Title>
      <Typography.Title heading={6}>{t('runPanel.inputs')}</Typography.Title>
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
        {t('runPanel.runWorkflow')}
      </Button>
      {/* 阶段行（阶段 3.1）：运行中 / 成功 / 失败始终可见；失败原因单独红字 */}
      {phase !== 'idle' && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: phase === 'failed' ? '#e5484d' : phase === 'running' ? '#888' : '#1c7ed6',
            lineHeight: 1.5,
            wordBreak: 'break-all',
          }}
        >
          {phase === 'running' && t('runPanel.phaseRunning')}
          {phase === 'success' && t('runPanel.phaseSuccess')}
          {phase === 'failed' && `${t('runPanel.phaseFailed')}${failReason ? `：${failReason}` : ''}`}
        </div>
      )}
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

export default RunWorkflowSidebar;