/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import iconStart from '@/assets/icon-start.jpg';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';

export { AssigneeRender } from './render';

let index = 0;

export const AssigneeNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Assignee,
  meta: {
    sidebarDisabled: false,
    nodePanelVisible: true,
    defaultPorts: [], // 没有输入输出端口，不能与其他组件连接
    renderKey: WorkflowNodeType.Assignee,
    size: {
      width: 120, // 正圆形的直径
      height: 120, // 正圆形的直径
    },
    wrapperStyle: {
      borderRadius: '50%', // 使组件呈现正圆形
      backgroundColor: '#f0f8ff',
      border: '2px solid #1890ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  },
  info: {
    icon: iconStart,
    description: '负责人标记组件，用于标记相关责任人',
  },
  /**
   * 初始化节点数据
   */
  onAdd() {
    return {
      id: generateValidId('assignee', 5),
      type: WorkflowNodeType.Assignee,
      data: {
        title: `负责人标记_${++index}`,
        assignees: [], // 初始化为空数组
      },
    };
  },
  /**
   * Assignee节点不能有输入连接点
   */
  getInputPoints: () => [],
  /**
   * Assignee节点不能有输出连接点
   */
  getOutputPoints: () => [],
  /**
   * 表单配置
   */
  formMeta,
};
