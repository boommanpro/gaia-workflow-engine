import { nanoid } from 'nanoid';
import {
  FlowNodeTransformData,
  PositionSchema,
  WorkflowNodeEntity,
} from '@flowgram.ai/free-layout-editor';
import { provideBatchInputEffect } from '@flowgram.ai/form-antd-materials';

import { FlowNodeRegistry } from '@editor/typings';
import { defaultFormMeta } from '../default-form-meta';
import { WorkflowNodeType } from '../constants';
import iconLoop from '../../assets/icon-loop.jpg';
import { LoopFormRender } from './loop-form-render';

let index = 0;
export const LoopNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Loop,
  info: {
    icon: iconLoop,
    description:
      'Used to repeatedly execute a series of tasks by setting the number of iterations and logic.',
  },
  meta: {
    /**
     * Mark as subcanvas
     * 子画布标记
     */
    isContainer: true,
    /**
     * The subcanvas default size setting
     * 子画布默认大小设置
     */
    size: {
      width: 560,
      height: 400,
    },
    /**
     * The subcanvas padding setting
     * 子画布 padding 设置
     */
    padding: () => ({
      top: 125,
      bottom: 100,
      left: 100,
      right: 100,
    }),
    /**
     * Controls the node selection status within the subcanvas
     * 控制子画布内的节点选中状态
     */
    selectable(node: WorkflowNodeEntity, mousePos?: PositionSchema): boolean {
      if (!mousePos) {
        return true;
      }
      const transform = node.getData<FlowNodeTransformData>(FlowNodeTransformData);
      // 鼠标开始时所在位置不包括当前节点时才可选中
      return !transform.bounds.contains(mousePos.x, mousePos.y);
    },
    expandable: false, // disable expanded
  },
  onAdd() {
    return {
      id: `loop_${nanoid(5)}`,
      type: 'loop',
      data: {
        title: `Loop_${++index}`,
      },
    };
  },
  formMeta: {
    ...defaultFormMeta,
    render: LoopFormRender,
    effect: {
      batchFor: provideBatchInputEffect,
    },
  },
};
