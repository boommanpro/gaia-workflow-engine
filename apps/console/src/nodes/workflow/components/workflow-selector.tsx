/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import { Button, Card, Divider, Select, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { IconInfoCircle, IconPlayCircle } from '@douyinfe/semi-icons';
import { getApiBaseUrl } from '../../../utils/apiConfig'; // 导入API配置
import { useLanguage, t } from '../../../i18n';

const { Title, Text } = Typography;
const { Option } = Select;

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  definition: any;
  inputs?: any;
  outputs?: any;
  tags?: string;
  isExample?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

// 从后端API获取workflow数据
const fetchWorkflowsFromAPI = async (): Promise<WorkflowDefinition[]> => {
  try {
    // 使用动态API基础URL
    const apiUrl = `${getApiBaseUrl()}/workflows`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error('获取工作流列表失败');
    }
    const workflows = await response.json();

    // 转换inputs和outputs从字符串格式为对象格式
    return workflows.map((workflow: any) => ({
      ...workflow,
      inputs: workflow.inputs ? JSON.parse(workflow.inputs) : undefined,
      outputs: workflow.outputs ? JSON.parse(workflow.outputs) : undefined,
      definition: workflow.definition ? JSON.parse(workflow.definition) : {},
    }));
  } catch (error) {
    console.error('获取工作流列表失败:', error);
    // 如果API失败，返回空数组
    return [];
  }
};

// 作为fallback的模拟数据
const MOCK_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'simple-workflow-1',
    name: '简单的workflow',
    description: '简单的workflow',
    definition: {
      nodes: [
        {
          id: 'start_0',
          type: 'start',
          meta: {
            position: { x: 180, y: 0 },
          },
          data: {
            title: '开始节点',
            outputs: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  default: 'Hello Flow.',
                },
                enable: {
                  type: 'boolean',
                  default: true,
                },
                array_obj: {
                  type: 'array',
                  items: { type: 'integer' },
                  default: '[1,2,3]',
                },
              },
              required: [],
            },
          },
        },
        {
          id: 'end_0',
          type: 'end',
          meta: {
            position: { x: 640, y: 0 },
          },
          data: {
            title: '结束节点',
            inputsValues: {
              success: {
                type: 'constant',
                content: true,
                schema: { type: 'boolean' },
                extra: { index: 0 },
              },
              query: {
                type: 'ref',
                content: ['start_0', 'query'],
                extra: { index: 1 },
              },
            },
            inputs: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                query: { type: 'string' },
              },
            },
          },
        },
      ],
      edges: [
        {
          sourceNodeID: 'start_0',
          targetNodeID: 'end_0',
        },
      ],
    },
    // 从workflow定义中提取：workflow的输入参数是end节点的inputs
    inputs: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        query: { type: 'string' },
      },
    },
    // 从workflow定义中提取：workflow的输出参数是start节点的outputs
    outputs: {
      type: 'object',
      properties: {
        query: { type: 'string', default: 'Hello Flow.' },
        enable: { type: 'boolean', default: true },
        array_obj: { type: 'array', items: { type: 'integer' }, default: '[1,2,3]' },
      },
    },
  },
  {
    id: 'data-processing-workflow',
    name: '数据处理工作流',
    description: '用于数据清洗和转换的工作流',
    definition: {},
    inputs: {
      type: 'object',
      properties: {
        rawData: { type: 'array', items: { type: 'object' } },
        filterCriteria: { type: 'object' },
      },
    },
    outputs: {
      type: 'object',
      properties: {
        processedData: { type: 'array', items: { type: 'object' } },
        statistics: { type: 'object' },
      },
    },
  },
];

export interface WorkflowSelectorProps {
  value?: string;
  onChange?: (workflowId: string, workflow: WorkflowDefinition) => void;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ value, onChange }) => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useLanguage();

  useEffect(() => {
    // 从API获取workflow列表
    fetchWorkflowsFromAPI()
      .then((apiWorkflows) => {
        if (apiWorkflows.length === 0) {
          // 如果API没有数据，使用模拟数据作为fallback
          console.warn('API未返回工作流数据，使用模拟数据');
          setWorkflows(MOCK_WORKFLOWS);
        } else {
          setWorkflows(apiWorkflows);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('获取工作流列表失败，使用模拟数据:', error);
        setWorkflows(MOCK_WORKFLOWS);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (value) {
      const workflow = workflows.find((w) => w.id === value);
      setSelectedWorkflow(workflow || null);
    }
  }, [value, workflows]);

  const handleWorkflowChange = (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (workflow && onChange) {
      onChange(workflowId, workflow);
    }
    setSelectedWorkflow(workflow || null);
  };

  const renderParameterSchema = (schema: any, title: string) => {
    if (!schema || !schema.properties) {
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

  const AnySelect = Select as any;

  if (loading) {
    return (
      <div>
        <Space vertical style={{ width: '100%' }}>
          <div>
            <Text strong>{t('workflow.selectWorkflow')}</Text>
            <AnySelect
              style={{ width: '100%', marginTop: 8 }}
              placeholder={t('workflow.loadingList')}
              loading={true}
              value={value}
              onChange={handleWorkflowChange}
              allowClear
            />
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
          <AnySelect
            style={{ width: '100%', marginTop: 8 }}
            placeholder={workflows.length === 0 ? t('workflow.noAvailable') : t('workflow.selectToEmbed')}
            value={value}
            onChange={handleWorkflowChange}
            allowClear
            loading={loading}
          >
            {workflows.map((workflow) => (
              <Option key={workflow.id} value={workflow.id}>
                <Space>
                  <span>{workflow.name}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {workflow.description}
                  </Text>
                </Space>
              </Option>
            ))}
          </AnySelect>
        </div>

        {selectedWorkflow && (
          <Card style={{ backgroundColor: '#fafafa' }}>
            <Space vertical style={{ width: '100%' }}>
              <div>
                <Title heading={5} style={{ margin: 0 }}>
                  <IconInfoCircle /> {selectedWorkflow.name}
                </Title>
                <Text
                  type="secondary"
                  style={{ margin: '4px 0 8px 0', fontSize: 12, display: 'block' }}
                >
                  {selectedWorkflow.description}
                </Text>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {renderParameterSchema(selectedWorkflow.inputs, t('workflow.inputParams'))}

              <div style={{ marginTop: 8 }}>
                {renderParameterSchema(selectedWorkflow.outputs, t('workflow.outputParams'))}
              </div>

              <Button
                theme="borderless"
                size="small"
                icon={<IconPlayCircle />}
                onClick={() => {
                  // 可以实现跳转到workflow详情的逻辑
                  console.log('查看workflow详情:', selectedWorkflow.id);
                }}
              >
                查看工作流详情
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

// 作为Field组件使用的包装器
export interface WorkflowSelectorFieldProps {
  value?: string;
  onChange?: (workflowId: string) => void;
  onWorkflowChange?: (workflowId: string, workflow: WorkflowDefinition) => void;
}

export const WorkflowSelectorField: React.FC<WorkflowSelectorFieldProps> = ({
  value,
  onChange,
  onWorkflowChange,
}) => (
  <WorkflowSelector
    value={value}
    onChange={(workflowId: string, workflow: WorkflowDefinition) => {
      // 调用外部的自定义回调
      if (onWorkflowChange) {
        onWorkflowChange(workflowId, workflow);
      }
      // 同时调用标准的字段变更回调
      if (onChange) {
        onChange(workflowId);
      }
    }}
  />
);
