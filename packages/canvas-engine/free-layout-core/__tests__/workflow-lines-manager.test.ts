/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';

import {
  WorkflowLinesManager,
  WorkflowDocument,
  WorkflowNodeLinesData,
  WorkflowDocumentOptions,
  WorkflowLineRenderData,
  LineColors,
} from '../src';
import { WorkflowSimpleLineContribution } from './simple-line';
import { createWorkflowContainer } from './mocks';
describe('workflow-lines-manager', () => {
  let linesManager: WorkflowLinesManager;
  let container: interfaces.Container;
  let document: WorkflowDocument;
  beforeEach(() => {
    container = createWorkflowContainer();
    document = container.get(WorkflowDocument);
    linesManager = container.get(WorkflowLinesManager);
    linesManager.init(document);
    document.createWorkflowNode({
      id: 'start_0',
      type: 'start',
      meta: {
        position: { x: 0, y: 0 },
      },
    });
    document.createWorkflowNode({
      id: 'end_0',
      type: 'end',
      meta: {
        position: { x: 800, y: 0 },
      },
    });
  });
  it('base create and dispose', async () => {
    expect(linesManager.toJSON()).toEqual([]);
    const line = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    })!;
    const startNode = document.getNode('start_0')!.getData(WorkflowNodeLinesData);
    const endNode = document.getNode('end_0')!.getData(WorkflowNodeLinesData);
    expect(startNode.outputLines.length).toEqual(1);
    expect(startNode.allLines.length).toEqual(1);
    expect(endNode.inputLines.length).toEqual(1);
    expect(endNode.allLines.length).toEqual(1);
    expect(startNode.allOutputNodes.length).toEqual(1);
    expect(endNode.allInputNodes.length).toEqual(1);
    expect(line.id).toBe('start_0_-end_0_');
    expect(linesManager.toJSON()).toEqual([{ sourceNodeID: 'start_0', targetNodeID: 'end_0' }]);
    // line destroy
    line.dispose();
    expect(startNode.outputLines.length).toEqual(0);
    expect(startNode.allLines.length).toEqual(0);
    expect(endNode.inputLines.length).toEqual(0);
    expect(endNode.allLines.length).toEqual(0);
    expect(startNode.allOutputNodes.length).toEqual(0);
    expect(endNode.allInputNodes.length).toEqual(0);
    linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    })!;
    expect(startNode.outputLines.length).toEqual(1);
    // node destroy
    endNode.entity.dispose();
    expect(startNode.outputLines.length).toEqual(0);
    expect(startNode.allLines.length).toEqual(0);
  });
  it('base create drawing line or hidden line', async () => {
    const line = linesManager.createLine({
      from: 'start_0',
      drawingTo: { x: 0, y: 0, location: 'right' },
    })!;
    const startNode = document.getNode('start_0')!.getData(WorkflowNodeLinesData);
    expect(startNode.outputLines.length).toEqual(1);
    expect(startNode.availableLines.length).toEqual(0);
    line.dispose();
    expect(startNode.outputLines.length).toEqual(0);
    expect(startNode.availableLines.length).toEqual(0);
    const line2 = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    })!;
    line2.updateUIState({
      highlightColor: line2.linesManager.lineColor.hidden,
    });
    expect(startNode.outputLines.length).toEqual(1);
    expect(startNode.availableLines.length).toEqual(0);
    line2.updateUIState({
      highlightColor: '',
    });
    expect(startNode.outputLines.length).toEqual(1);
    expect(startNode.availableLines.length).toEqual(1);
  });

  it('test base create line node', async () => {
    expect(linesManager.toJSON()).toEqual([]);
    const line = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    })!;
    const lineNode = line.node;
    expect(lineNode.dataset.testid).toBe('sdk.workflow.canvas.line');
    expect(lineNode.dataset.lineId).toBe('start_0_-end_0_');
    expect(lineNode.dataset.fromNodeId).toBe('start_0');
    expect(lineNode.dataset.fromPortId).toBe('port_output_start_0_');
    expect(lineNode.dataset.toNodeId).toBe('end_0');
    expect(lineNode.dataset.toPortId).toBe('port_input_end_0_');
    expect(lineNode.dataset.hasError).toBe('false');
  });

  it('test base create line bezier', async () => {
    expect(linesManager.toJSON()).toEqual([]);
    const line = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    })!;
    const lineRenderData = line.getData(WorkflowLineRenderData);
    expect(lineRenderData.position.from).toEqual({ x: 0, y: 0, location: 'right' });
    expect(lineRenderData.position.to).toEqual({ x: 660, y: 30, location: 'left' });
    expect(lineRenderData.path).toEqual('M 12 12 L 652 42');
  });

  it('test get all node inputs and outputs', async () => {
    linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    });

    const allNodeLineData = document
      .getAllNodes()
      .map((_node) => _node.getData(WorkflowNodeLinesData));

    expect(
      allNodeLineData.map((_line) => ({
        allInputs: _line.allInputNodes,
        allOutput: _line.allOutputNodes,
      }))
    ).toMatchSnapshot();
  });
  it('create without to node', () => {
    linesManager.createLine({
      from: 'start_0',
      to: '',
    });
    expect(linesManager.toJSON()).toEqual([{ sourceNodeID: 'start_0', targetNodeID: '' }]);
  });
  it('create without from node', () => {
    const line = linesManager.createLine({
      from: '',
      to: 'end_0',
    });
    expect(line).toBeUndefined();
    expect(linesManager.toJSON()).toEqual([]);
  });
  it('create without from node and to node', () => {
    linesManager.createLine({
      from: '',
      to: '',
    });
    expect(linesManager.toJSON()).toEqual([]);
  });

  it('test document line options', () => {
    const documentOptions = container.get<WorkflowDocumentOptions>(WorkflowDocumentOptions);
    documentOptions.isErrorLine = () => true;
    documentOptions.isReverseLine = () => true;
    documentOptions.isHideArrowLine = () => true;
    documentOptions.isFlowingLine = () => true;
    documentOptions.isDisabledLine = () => true;
    documentOptions.setLineClassName = () => 'custom-line-class';
    documentOptions.setLineRenderType = () => WorkflowSimpleLineContribution.type;
    documentOptions.lineColor = {
      default: '#000',
      error: '#000',
    };

    const line = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    });

    line?.fireRender();

    expect(line?.reverse).toBeTruthy();
    expect(line?.hideArrow).toBeTruthy();
    expect(line?.flowing).toBeTruthy();
    expect(line?.disabled).toBeTruthy();
    expect(line?.hasError).toBeTruthy();
    expect(line?.renderType).toBe(WorkflowSimpleLineContribution.type);
    expect(line?.className).toBe('custom-line-class');
    expect(line?.color).toBe('#000');
  });

  it('test set line state', () => {
    const line = linesManager.createLine({
      from: 'start_0',
      to: 'end_0',
    });

    if (!line) {
      expect.fail('line is not created');
    }

    expect(line.reverse).toBeFalsy();
    line.processing = true;
    expect(line.processing).toBeTruthy();

    expect(line.hasError).toBeFalsy();
    line.hasError = true;
    line.fireRender();
    expect(line.hasError).toBeTruthy();

    try {
      line.setToPort(line.toPort);
      // 如果没有抛出错误，测试应该失败
      expect.fail('Expected an error to be thrown');
    } catch (e) {
      expect((e as Error).message).toBe('[setToPort] only support drawing line.');
    }
  });

  describe('flowing line support', () => {
    it('should return flowing color when line is flowing', () => {
      const documentOptions: WorkflowDocumentOptions = {
        lineColor: {
          flowing: '#ff0000', // 自定义流动颜色
        },
        isFlowingLine: () => true,
      };

      Object.assign(linesManager, { options: documentOptions });

      const line = linesManager.createLine({
        from: 'start_0',
        to: 'end_0',
      });

      expect(line).toBeDefined();
      expect(linesManager.isFlowingLine(line!)).toBe(true);
      expect(linesManager.getLineColor(line!)).toBe('#ff0000');
    });

    it('should use default flowing color when no custom color provided', () => {
      const documentOptions: WorkflowDocumentOptions = {
        isFlowingLine: () => true,
      };

      Object.assign(linesManager, { options: documentOptions });

      const line = linesManager.createLine({
        from: 'start_0',
        to: 'end_0',
      });

      expect(line).toBeDefined();
      expect(linesManager.isFlowingLine(line!)).toBe(true);
      expect(linesManager.getLineColor(line!)).toBe(LineColors.FLOWING);
    });

    it('should prioritize selected/hovered over flowing', () => {
      const documentOptions: WorkflowDocumentOptions = {
        lineColor: {
          flowing: '#ff0000',
          selected: '#00ff00',
        },
        isFlowingLine: () => true,
      };

      Object.assign(linesManager, { options: documentOptions });

      const line = linesManager.createLine({
        from: 'start_0',
        to: 'end_0',
      });

      // 模拟选中状态
      linesManager.selectService.select(line!);

      expect(line).toBeDefined();
      expect(linesManager.isFlowingLine(line!)).toBe(true);
      // 选中状态应该优先于流动状态
      expect(linesManager.getLineColor(line!)).toBe('#00ff00');
    });
    it('line data change', () => {
      const line = linesManager.createLine({
        from: 'start_0',
        to: 'end_0',
        data: { a: 1 },
      })!;
      expect(line.toJSON()).toEqual({
        sourceNodeID: 'start_0',
        targetNodeID: 'end_0',
        data: { a: 1 },
      });
      line.lineData = { a: 2 };
      expect(line.toJSON()).toEqual({
        sourceNodeID: 'start_0',
        targetNodeID: 'end_0',
        data: { a: 2 },
      });
    });
  });
});
