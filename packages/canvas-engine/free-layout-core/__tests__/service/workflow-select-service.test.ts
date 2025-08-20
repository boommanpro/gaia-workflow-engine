/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi } from 'vitest';
import { interfaces } from 'inversify';
import { Playground, PositionData } from '@flowgram.ai/core';

import { createWorkflowContainer, baseJSON } from '../mocks';
import { WorkflowSelectService, WorkflowDocument } from '../../src';
describe('workflow-select-service', () => {
  let selectService: WorkflowSelectService;
  let container: interfaces.Container;
  let document: WorkflowDocument;
  beforeEach(async () => {
    container = createWorkflowContainer();
    selectService = container.get(WorkflowSelectService);
    document = container.get(WorkflowDocument);
    await document.fromJSON(baseJSON);
  });
  it('selectNode and clear', () => {
    const fn = vi.fn();
    expect(selectService.selection).toEqual([]);
    expect(selectService.activatedNode).toEqual(undefined);
    selectService.onSelectionChanged(fn);
    const node = document.getNode('start_0')!;
    selectService.selectNode(node);
    expect(selectService.selection).toEqual([node]);
    expect(selectService.selectedNodes).toEqual([node]);
    expect(selectService.isSelected('start_0')).toEqual(true);
    expect(selectService.isActivated('start_0')).toEqual(true);
    expect(selectService.activatedNode).toEqual(node);
    expect(fn.mock.calls.length).toEqual(1);
    selectService.clear();
    expect(selectService.isSelected('start_0')).toEqual(false);
    expect(selectService.selection).toEqual([]);
    expect(fn.mock.calls.length).toEqual(2);
  });
  it('set selection', () => {
    const node = document.getNode('start_0')!;
    selectService.selection = [node];
    expect(selectService.selection).toEqual([node]);
  });
  it('set select', () => {
    const node = document.getNode('start_0')!;
    selectService.select(node);
    expect(selectService.selection).toEqual([node]);
  });
  it('toggleSelect', () => {
    selectService.toggleSelect(document.getNode('start_0')!);
    expect(selectService.selectedNodes).toEqual([document.getNode('start_0')!]);
    selectService.toggleSelect(document.getNode('start_0')!);
    expect(selectService.selectedNodes).toEqual([]);
  });
  it('select and focus', () => {
    const playground = container.get<Playground>(Playground);
    global.document.body.appendChild(playground.node);
    const node = document.getNode('start_0')!;
    selectService.selectNodeAndFocus(node);
    expect(selectService.selection).toEqual([node]);
    expect(playground.focused).toEqual(true);
  });
  it('selectNodeAndScrollToView', async () => {
    const node = document.getNode('start_0')!;
    const playground = container.get<Playground>(Playground);
    global.document.body.appendChild(playground.node);
    node.updateData<PositionData>(PositionData, {
      x: -999,
      y: -999,
    });
    await selectService.selectNodeAndScrollToView(node);
    expect(playground.config.scrollData.scrollX).toEqual(-999);
  });
});
