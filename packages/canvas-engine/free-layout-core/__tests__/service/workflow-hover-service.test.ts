/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';
import { interfaces } from 'inversify';

// import { Playground, PositionData } from '@flowgram.ai/core'
import { createWorkflowContainer, baseJSON } from '../mocks';
import { WorkflowHoverService, WorkflowDocument } from '../../src';

describe('workflow-hover-service', () => {
  let hoverService: WorkflowHoverService;
  let container: interfaces.Container;
  let document: WorkflowDocument;
  beforeEach(async () => {
    container = createWorkflowContainer();
    hoverService = container.get(WorkflowHoverService);
    document = container.get(WorkflowDocument);
    await document.fromJSON(baseJSON);
  });
  it('base hover', () => {
    const fn = vi.fn();
    hoverService.onHoveredChange(fn);
    expect(hoverService.isSomeHovered()).toEqual(false);
    expect(hoverService.hoveredKey).toEqual('');
    expect(hoverService.isHovered('start_0')).toEqual(false);
    expect(hoverService.hoveredNode).toEqual(undefined);
    hoverService.updateHoveredKey('start_0');
    expect(hoverService.isSomeHovered()).toEqual(true);
    expect(hoverService.hoveredKey).toEqual('start_0');
    expect(hoverService.isHovered('start_0')).toEqual(true);
    expect(hoverService.hoveredNode).toEqual(document.getNode('start_0'));
    expect(fn.mock.calls.length).toEqual(1);
    // duplicate hover
    hoverService.updateHoveredKey('start_0');
    expect(fn.mock.calls.length).toEqual(1);
    hoverService.clearHovered();
    expect(hoverService.hoveredKey).toEqual('');
    expect(hoverService.isHovered('start_0')).toEqual(false);
    expect(hoverService.hoveredNode).toEqual(undefined);
  });
});
