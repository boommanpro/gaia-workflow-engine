/**
 * Multi-Condition Node
 * Synced from official flowgram.ai free-feature-overview example
 * Supports AND/OR logic between conditions within each branch
 */

import { FlowNodeRegistry } from '../../typings';
import iconCondition from '../../assets/icon-condition.svg';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';
import { WorkflowNodeType } from '../constants';

let index = 0;

export const MultiConditionNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.MultiCondition,
  info: {
    icon: iconCondition,
    description:
      'Connect multiple downstream branches with AND/OR logic. Each branch supports multiple conditions combined with AND or OR.',
  },
  meta: {
    defaultPorts: [{ type: 'input' }],
    useDynamicPort: true,
    expandable: false,
    // 2026-10-16 下架：后端没有 multi-condition 的解析器（执行必 NPE），互斥多分支用 branches。
    // 注册表保留用于渲染存量文档——载入时会经 document/migrations 自动迁移为 branches。
    nodePanelVisible: false,
    size: {
      width: 360,
      height: 210,
    },
  },
  formMeta,
  onAdd() {
    return {
      id: generateValidId('multi_condition', 5),
      type: 'multi-condition',
      data: {
        title: `multi_condition_${++index}`,
        branch: [
          {
            logic: 'and',
            conditions: [{ key: generateValidId('condition', 5), value: {} }],
          },
        ],
      },
    };
  },
};
