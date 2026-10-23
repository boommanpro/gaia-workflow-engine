/**
 * Copyright (c) 2025 Bytedance Ltd. and its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import { Button, Card, Divider, Empty, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { IconInfoCircle, IconPlayCircle, IconRefresh } from '@douyinfe/semi-icons';
import { SubflowOption, workflowApi } from '../../../services/workflow-api';
import { useLanguage, t } from '../../../i18n';

const { Title, Text } = Typography;

export interface WorkflowListSelectorProps {
  value?: string;
  onChange?: (workflowCode: string) => void;
  onWorkflowChange?: (workflowCode: string, workflow: SubflowOption) => void;
  /** 排除的工作流编码（画布自身——防自引用成环，后端另有兜底） */
  excludeCode?: string;
}

const openWorkflowEditor = (code: string) => {
  const base = (process.env.ASSET_PREFIX || '').replace(/\/+$/, '');
  window.open(`${base}/editor/${code}`, '_blank', 'noopener');
};

export const WorkflowListSelector: React.FC<WorkflowListSelectorProps> = ({
  value,
  onChange,
  onWorkflowChange,
  excludeCode,
}) => {
  const [workflows, setWorkflows] = useState<SubflowOption[]>([]);
  const [selected, setSelected] = useState<SubflowOption | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  useLanguage();

  const loadOptions = () => {
    setLoading(true);
    setError(null);
    workflowApi
      .listSubflowOptions()
      .then((options) => {
        setWorkflows(options);
        setLoading(false);
      })
      .catch((e: Error) => {
        // 失败必须显式呈现（此前打错端点静默空列表，用户无从知道为什么选不了）
        setError(e?.message || '获取工作流列表失败');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value) {
      setSelected(workflows.find((w) => w.code === value) || null);
    }
  }, [value, workflows]);

  const selectable = excludeCode ? workflows.filter((w) => w.code !== excludeCode) : workflows;

  const handleWorkflowSelect = (workflow: SubflowOption) => {
    setSelected(workflow);
    onWorkflowChange?.(workflow.code, workflow);
    onChange?.(workflow.code);
  };

  const renderParameterSchema = (schema: SubflowOption['inputs'], title: string) => {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
      return <Text type="secondary">{t('workflow.empty', { title })}</Text>;
    }

    const properties = Object.entries(schema.properties);
    return (
      <div>
        <Text strong>{title}:</Text>
        <div style={{ marginTop: 4 }}>
          {properties.map(([key, prop]: [string, any]) => (
            <Tag key={key} style={{ marginBottom: 4 }}>
              {key}: {prop.type}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <Space vertical style={{ width: '100%' }}>
          <div>
            <Text strong>{t('workflow.selectWorkflow')}</Text>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Text>{t('workflow.loadingList')}</Text>
            </div>
          </div>
        </Space>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Space vertical style={{ width: '100%' }}>
          <div>
            <Text strong>{t('workflow.selectWorkflow')}</Text>
            <Empty
              title={<span style={{ color: 'var(--semi-color-danger)' }}>{t('workflow.loadFailed')}</span>}
              description={<span style={{ fontSize: 12 }}>{error}</span>}
              style={{ padding: '20px 0' }}
            />
            <Button
              size="small"
              icon={<IconRefresh />}
              onClick={loadOptions}
              style={{ marginTop: 4 }}
            >
              {t('workflow.loadRetry')}
            </Button>
          </div>
        </Space>
      </div>
    );
  }

  if (selectable.length === 0) {
    return (
      <div>
        <Space vertical style={{ width: '100%' }}>
          <div>
            <Text strong>{t('workflow.selectWorkflow')}</Text>
            <Empty title={t('workflow.noAvailable')} description="" style={{ padding: '20px 0' }} />
          </div>
        </Space>
      </div>
    );
  }

  return (
    <div>
      <Space vertical style={{ width: '100%' }}>
        <div>
          <Text strong>{t('workflow.selectWorkflow')}</Text>
          <div style={{ marginTop: 8, maxHeight: '400px', overflowY: 'auto' }}>
            <Space vertical style={{ width: '100%' }}>
              {selectable.map((workflow) => (
                <Card
                  key={workflow.code}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    border:
                      selected?.code === workflow.code
                        ? '2px solid #1890ff'
                        : '1px solid #e0e0e0',
                    marginBottom: 8,
                    backgroundColor: selected?.code === workflow.code ? '#f0f5ff' : '#ffffff',
                  }}
                  bodyStyle={{ padding: '12px' }}
                  {...{ onClick: () => handleWorkflowSelect(workflow) } as any}
                >
                  <Space vertical style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Title heading={5} style={{ margin: 0 }}>
                        {workflow.name}
                      </Title>
                      {selected?.code === workflow.code && (
                        <span style={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      )}
                    </div>

                    {workflow.description && (
                      <Text type="secondary" style={{ margin: '4px 0 8px 0', fontSize: 12 }}>
                        {workflow.description}
                      </Text>
                    )}

                    <Divider style={{ margin: '8px 0' }} />

                    {renderParameterSchema(workflow.inputs, t('workflow.inputParams'))}

                    <div style={{ marginTop: 8 }}>
                      {renderParameterSchema(workflow.outputs, t('workflow.outputParams'))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        marginTop: 12,
                      }}
                    >
                      <Button
                        theme="borderless"
                        size="small"
                        icon={<IconPlayCircle />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openWorkflowEditor(workflow.code);
                        }}
                      >
                        {t('workflow.viewDetails')}
                      </Button>
                    </div>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        </div>

        {selected && (
          <Card
            style={{ backgroundColor: '#f0f5ff', border: '2px solid #1890ff' }}
            bodyStyle={{ padding: '12px' }}
          >
            <Space vertical style={{ width: '100%' }}>
              <Title heading={5} style={{ margin: 0 }}>
                <IconInfoCircle /> {t('workflow.selected')}: {selected.name}
              </Title>
              {selected.description && (
                <Text type="secondary" style={{ margin: '4px 0 8px 0', fontSize: 12 }}>
                  {selected.description}
                </Text>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Text strong>Code: </Text>
              <Text code>{selected.code}</Text>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

// 作为Field组件使用的包装器
export interface WorkflowListSelectorFieldProps {
  value?: string;
  onChange?: (workflowCode: string) => void;
  onWorkflowChange?: (workflowCode: string, workflow: SubflowOption) => void;
  /** 排除自身（防自引用） */
  excludeCode?: string;
}

export const WorkflowListSelectorField: React.FC<WorkflowListSelectorFieldProps> = ({
  value,
  onChange,
  onWorkflowChange,
  excludeCode,
}) => (
  <WorkflowListSelector
    value={value}
    excludeCode={excludeCode}
    onChange={(workflowCode: string) => {
      // 同时调用标准的字段变更回调
      if (onChange) {
        onChange(workflowCode);
      }
    }}
    onWorkflowChange={onWorkflowChange}
  />
);
