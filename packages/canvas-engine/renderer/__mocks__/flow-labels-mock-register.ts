/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
} from '@flowgram.ai/document';
import { FlowTextKey } from '../src/flow-renderer-registry';

/**
 * 动态接入 mock register，测试 labels
 */
export const FlowLabelsMockRegister: FlowNodeRegistry = {
  type: 'mock',
  getLabels(transition) {
    return [
      {
        type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
        offset: transition.transform.outputPoint,
        props: {
          side: 'left',
        }
      },
      {
        type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.COLLAPSE_LABEL,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.COLLAPSE_ADDER_LABEL,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.COLLAPSE_ADDER_LABEL,
        offset: transition.transform.outputPoint,
        props: {
          activateNode: {
            getData: () => ({ hovered: true }),
            isVertical: true,
          }
        }
      },
      {
        type: FlowTransitionLabelEnum.COLLAPSE_ADDER_LABEL,
        offset: transition.transform.outputPoint,
        props: {
          activateNode: {
            getData: () => ({ hovered: true }),
            isVertical: true,
          },
        }
      },
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.LOOP_WHILE_TEXT,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.CATCH_TEXT,
        props: {
          style: {
            width: 100
          }
        },
        rotate: '90deg',
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        offset: transition.transform.outputPoint,
      },
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        renderKey: FlowTextKey.LOOP_WHILE_TEXT,
        offset: transition.transform.outputPoint,
      },
      {
        type: 'unknown' as any,
        offset: transition.transform.outputPoint,
      },
    ];
  },
};
