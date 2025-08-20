/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { vi, describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';

import Adder from '../../src/components/Adder';

vi.mock('../../src/components/utils', () => ({
  DEFAULT_LABEL_ACTIVATE_HEIGHT: 10,
  getTransitionLabelHoverWidth() {
    return 10;
  },
}));

describe.skip('Adder', () => {
  test('should render Adder correctly', () => {
    const data = {
      entity: {
        document: {
          renderState: {
            getNodeDroppingId() {},
            getDragStartEntity() {},
          },
          renderTree: {
            getOriginInfo() {
              return {
                next: null,
              };
            },
          },
        },
      },
    } as any;

    const rendererRegistry = {
      getRendererComponent() {
        return {
          renderer() {
            return 'hello';
          },
        };
      },
    } as any;

    const { getByText } = render(<Adder data={data} rendererRegistry={rendererRegistry} />);
    expect(getByText('hello')).toBeDefined();
  });
});

// describe('getFlowRenderKey', () => {
//   test('should getFlowRenderKey work correctly', () => {
//     // branch
//     expect(getFlowRenderKey(DRAGGING_TYPE.BRANCH, false, false)).toBe(FlowRendererKey.ADDER);

//     expect(getFlowRenderKey(DRAGGING_TYPE.BRANCH, true, false)).toBe(FlowRendererKey.ADDER);

//     expect(getFlowRenderKey(DRAGGING_TYPE.BRANCH, true, true)).toBe(FlowRendererKey.ADDER);

//     expect(getFlowRenderKey(DRAGGING_TYPE.BRANCH, false, true)).toBe(FlowRendererKey.ADDER);

//     // node
//     expect(getFlowRenderKey(DRAGGING_TYPE.NODE, false, false)).toBe(
//       FlowRendererKey.DRAGGABLE_ADDER,
//     );

//     expect(getFlowRenderKey(DRAGGING_TYPE.NODE, true, false)).toBe(
//       FlowRendererKey.DRAG_HIGHLIGHT_ADDER,
//     );

//     expect(getFlowRenderKey(DRAGGING_TYPE.NODE, true, true)).toBe(FlowRendererKey.ADDER);

//     expect(getFlowRenderKey(DRAGGING_TYPE.NODE, false, true)).toBe(FlowRendererKey.ADDER);
//   });
// });
