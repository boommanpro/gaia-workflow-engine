/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { it, expect, beforeEach, describe, vi } from 'vitest';
import { debounce } from 'lodash-es';
import { interfaces } from 'inversify';
import {
  delay,
  WorkflowDocument,
  WorkflowHoverService,
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-core';
import { FlowNodeRenderData } from '@flowgram.ai/document';
import {
  EntityManager,
  PipelineRegistry,
  PipelineRenderer,
  PlaygroundConfigEntity,
} from '@flowgram.ai/core';

import { StackingContextManager } from '../src/manager';
import { createWorkflowContainer, workflowJSON } from './utils.mock';
import { IStackingContextManager } from './type.mock';

let container: interfaces.Container;
let document: WorkflowDocument;
let stackingContextManager: IStackingContextManager;

beforeEach(() => {
  container = createWorkflowContainer();
  container.bind(StackingContextManager).to(StackingContextManager);
  document = container.get<WorkflowDocument>(WorkflowDocument);
  stackingContextManager = container.get<StackingContextManager>(
    StackingContextManager
  ) as unknown as IStackingContextManager;
  document.fromJSON(workflowJSON);
});

describe('StackingContextManager public methods', () => {
  it('should create instance', () => {
    const stackingContextManager = container.get<StackingContextManager>(StackingContextManager);
    expect(stackingContextManager.node).toMatchInlineSnapshot(`
    <div
      class="gedit-playground-layer gedit-flow-render-layer"
    />
    `);
    expect(stackingContextManager).not.toBeUndefined();
  });
  it('should execute init', () => {
    stackingContextManager.init();
    const pipelineRenderer = container.get<PipelineRenderer>(PipelineRenderer);
    expect(pipelineRenderer.node).toMatchInlineSnapshot(
      `
    <div
      class="gedit-playground-pipeline"
    >
      <div
        class="gedit-playground-layer gedit-flow-render-layer"
      />
    </div>
      `
    );
    expect(stackingContextManager.disposers).toHaveLength(4);
  });
  it('should execute ready', () => {
    stackingContextManager.compute = vi.fn();
    stackingContextManager.ready();
    expect(stackingContextManager.compute).toBeCalled();
  });
  it('should dispose', () => {
    expect(stackingContextManager.disposers).toHaveLength(0);
    stackingContextManager.init();
    expect(stackingContextManager.disposers).toHaveLength(4);
    const mockDispose = { dispose: vi.fn() };
    stackingContextManager.disposers.push(mockDispose);
    stackingContextManager.dispose();
    expect(mockDispose.dispose).toBeCalled();
  });
});

describe('StackingContextManager private methods', () => {
  it('should compute with debounce', async () => {
    const compute = vi.fn();
    vi.spyOn(stackingContextManager, 'compute').mockImplementation(debounce(compute, 10));
    stackingContextManager.compute();
    await delay(1);
    stackingContextManager.compute();
    await delay(1);
    stackingContextManager.compute();
    await delay(1);
    stackingContextManager.compute();
    expect(compute).toBeCalledTimes(0);
    await delay(20);
    expect(compute).toBeCalledTimes(1);
  });

  it('should get nodes and lines', async () => {
    const nodeIds = stackingContextManager.nodes.map((n) => n.id);
    const lineIds = stackingContextManager.lines.map((l) => l.id);
    expect(nodeIds).toEqual([
      'root',
      'start_0',
      'condition_0',
      'end_0',
      'loop_0',
      'break_0',
      'variable_0',
    ]);
    expect(lineIds).toEqual([
      'break_0_-variable_0_',
      'start_0_-condition_0_',
      'condition_0_if-end_0_',
      'condition_0_else-end_0_',
      'loop_0_-end_0_',
      'start_0_-loop_0_',
    ]);
  });

  it('should generate context', async () => {
    const hoverService = container.get<WorkflowHoverService>(WorkflowHoverService);
    const selectService = container.get<WorkflowSelectService>(WorkflowSelectService);
    expect(stackingContextManager.context).toStrictEqual({
      hoveredEntityID: undefined,
      selectedIDs: new Set(),
      selectedNodes: [],
      sortNodes: stackingContextManager.options.sortNodes,
    });
    hoverService.updateHoveredKey('start_0');
    const breakNode = document.getNode('break_0')!;
    const variableNode = document.getNode('variable_0')!;
    selectService.selection = [breakNode, variableNode];
    expect(stackingContextManager.context.hoveredEntityID).toEqual('start_0');
    expect(stackingContextManager.context.selectedIDs).toEqual(new Set(['break_0', 'variable_0']));
  });

  it('should callback compute when onZoom trigger', () => {
    const entityManager = container.get<EntityManager>(EntityManager);
    const pipelineRegistry = container.get<PipelineRegistry>(PipelineRegistry);
    const compute = vi.spyOn(stackingContextManager, 'compute').mockImplementation(() => {});
    const playgroundConfig =
      entityManager.getEntity<PlaygroundConfigEntity>(PlaygroundConfigEntity)!;
    pipelineRegistry.ready();
    stackingContextManager.mountListener();
    playgroundConfig.updateConfig({
      zoom: 1.5,
    });
    expect(stackingContextManager.node.style.transform).toBe('scale(1.5)');
    playgroundConfig.updateConfig({
      zoom: 2,
    });
    expect(stackingContextManager.node.style.transform).toBe('scale(2)');
    playgroundConfig.updateConfig({
      zoom: 1,
    });
    expect(stackingContextManager.node.style.transform).toBe('scale(1)');
    expect(compute).toBeCalledTimes(3);
  });

  it('should callback compute when onHover trigger', () => {
    const hoverService = container.get<WorkflowHoverService>(WorkflowHoverService);
    const compute = vi.spyOn(stackingContextManager, 'compute').mockImplementation(() => {});
    stackingContextManager.mountListener();
    hoverService.updateHoveredKey('start_0');
    hoverService.updateHoveredKey('end_0');
    expect(compute).toBeCalledTimes(2);
  });

  it('should callback compute when onEntityChange trigger', () => {
    const entityManager = container.get<EntityManager>(EntityManager);
    const compute = vi.spyOn(stackingContextManager, 'compute').mockImplementation(() => {});
    const node = document.getNode('start_0')!;
    stackingContextManager.mountListener();
    entityManager.fireEntityChanged(node);
    expect(compute).toBeCalledTimes(1);
  });

  it('should callback compute when onSelect trigger', () => {
    const selectService = container.get<WorkflowSelectService>(WorkflowSelectService);
    const compute = vi.spyOn(stackingContextManager, 'compute').mockImplementation(() => {});
    stackingContextManager.mountListener();
    const breakNode = document.getNode('break_0')!;
    const variableNode = document.getNode('variable_0')!;
    selectService.selectNode(breakNode);
    selectService.selectNode(variableNode);
    expect(compute).toBeCalledTimes(2);
  });

  it('should mount listeners', () => {
    const hoverService = container.get<WorkflowHoverService>(WorkflowHoverService);
    const selectService = container.get<WorkflowSelectService>(WorkflowSelectService);
    const compute = vi.spyOn(stackingContextManager, 'compute').mockImplementation(() => {});
    stackingContextManager.mountListener();
    // onHover
    hoverService.updateHoveredKey('start_0');
    hoverService.updateHoveredKey('end_0');
    expect(compute).toBeCalledTimes(2);
    compute.mockReset();
    // select callback
    const breakNode = document.getNode('break_0')!;
    const variableNode = document.getNode('variable_0')!;
    selectService.selectNode(breakNode);
    selectService.selectNode(variableNode);
    expect(compute).toBeCalledTimes(2);
  });

  it('should trigger compute', async () => {
    stackingContextManager.ready();
    await delay(200);
    const node = document.getNode('loop_0')!;
    const nodeRenderData = node.getData<FlowNodeRenderData>(FlowNodeRenderData);
    const element = nodeRenderData.node;
    expect(element.style.zIndex).toBe('12');
  });
});
