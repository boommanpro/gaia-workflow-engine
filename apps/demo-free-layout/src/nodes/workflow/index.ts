/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {WorkflowNodeType} from '../constants';
import {FlowNodeRegistry} from '../../typings';
import iconWorkflow from '../../assets/icon-workflow.svg';
import {formMeta} from './form-meta';
import {generateValidId} from '../utils';

let index = 0;

export interface WorkflowNodeData {
  workflowId?: string;
  workflowName?: string;
  workflowDescription?: string;
  workflowInputs?: any;
  workflowOutputs?: any;
  // 存储完整的workflow定义用于调试
  workflowDefinition?: any;
}

export const WorkflowNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Workflow,
  info: {
    icon: iconWorkflow,
    description: '嵌入另一个工作流，支持参数传递和结果返回',
  },
  meta: {
    size: {
      width: 360,
      height: 280,
    },
  },
  onAdd() {
    return {
      id: generateValidId('workflow', 5),
      type: 'workflow',
      data: {
        title: `Workflow_${++index}`,
        workflowId: '',
        workflowName: '',
        workflowDescription: '',
        // 初始 inputs，将由用户设置
        inputsValues: {},
        // inputs schema 将在选择 workflow 时自动填充
        inputs: {
          type: 'object',
          properties: {},
        },
        // outputs schema 将在选择 workflow 时自动填充
        outputs: {
          type: 'object',
          properties: {},
        },
      },
    };
  },
  formMeta: formMeta,
};

