import { beforeEach, describe, expect, it } from 'vitest';
import {
  FlowGramNode,
  PositionSchema,
  WorkflowPortType,
  CreateNodeParams,
  IEdge,
  INode,
  IPort,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeNode } from './index';

describe('WorkflowRuntimeNode', () => {
  let node: WorkflowRuntimeNode;
  let mockParams: CreateNodeParams;

  beforeEach(() => {
    mockParams = {
      id: 'test-node',
      type: FlowGramNode.Start,
      name: 'Test Node',
      position: { x: 0, y: 0 } as PositionSchema,
      variable: {},
      data: { testData: 'data' },
    };
    node = new WorkflowRuntimeNode(mockParams);
  });

  describe('constructor', () => {
    it('should initialize with provided params', () => {
      expect(node.id).toBe(mockParams.id);
      expect(node.type).toBe(mockParams.type);
      expect(node.name).toBe(mockParams.name);
      expect(node.position).toBe(mockParams.position);
      expect(node.declare).toEqual(mockParams.variable);
      expect(node.data).toEqual(mockParams.data);
    });

    it('should initialize with default values when optional params are not provided', () => {
      const minimalParams = {
        id: 'test-node',
        type: FlowGramNode.Start,
        name: 'Test Node',
        position: { x: 0, y: 0 } as PositionSchema,
      };
      const minimalNode = new WorkflowRuntimeNode(minimalParams);
      expect(minimalNode.declare).toEqual({});
      expect(minimalNode.data).toEqual({});
    });
  });

  describe('ports', () => {
    let inputPort: IPort;
    let outputPort: IPort;

    beforeEach(() => {
      inputPort = { id: 'input-1', type: WorkflowPortType.Input, node, edges: [] };
      outputPort = { id: 'output-1', type: WorkflowPortType.Output, node, edges: [] };
      node.addPort(inputPort);
      node.addPort(outputPort);
    });

    it('should correctly categorize input and output ports', () => {
      const { inputs, outputs } = node.ports;
      expect(inputs).toHaveLength(1);
      expect(outputs).toHaveLength(1);
      expect(inputs[0]).toBe(inputPort);
      expect(outputs[0]).toBe(outputPort);
    });
  });

  describe('edges', () => {
    let inputEdge: IEdge;
    let outputEdge: IEdge;
    let fromNode: INode;
    let toNode: INode;

    beforeEach(() => {
      fromNode = new WorkflowRuntimeNode({ ...mockParams, id: 'from-node' });
      toNode = new WorkflowRuntimeNode({ ...mockParams, id: 'to-node' });
      inputEdge = {
        id: 'input-edge',
        from: fromNode,
        to: node,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      outputEdge = {
        id: 'output-edge',
        from: node,
        to: toNode,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      node.addInputEdge(inputEdge);
      node.addOutputEdge(outputEdge);
    });

    it('should correctly store input and output edges', () => {
      const { inputs, outputs } = node.edges;
      expect(inputs).toHaveLength(1);
      expect(outputs).toHaveLength(1);
      expect(inputs[0]).toBe(inputEdge);
      expect(outputs[0]).toBe(outputEdge);
    });

    it('should update prev and next nodes when adding edges', () => {
      expect(node.prev).toHaveLength(1);
      expect(node.next).toHaveLength(1);
      expect(node.prev[0]).toBe(fromNode);
      expect(node.next[0]).toBe(toNode);
    });
  });

  describe('parent and children', () => {
    let parentNode: INode;
    let childNode: INode;

    beforeEach(() => {
      parentNode = new WorkflowRuntimeNode({ ...mockParams, id: 'parent-node' });
      childNode = new WorkflowRuntimeNode({ ...mockParams, id: 'child-node' });
    });

    it('should handle parent-child relationships', () => {
      node.parent = parentNode;
      node.addChild(childNode);

      expect(node.parent).toBe(parentNode);
      expect(node.children).toHaveLength(1);
      expect(node.children[0]).toBe(childNode);
    });
  });

  describe('isBranch', () => {
    it('should return true when node has multiple output ports', () => {
      const outputPort1 = { id: 'output-1', type: WorkflowPortType.Output, node, edges: [] };
      const outputPort2 = { id: 'output-2', type: WorkflowPortType.Output, node, edges: [] };
      node.addPort(outputPort1);
      node.addPort(outputPort2);

      expect(node.isBranch).toBe(true);
    });

    it('should return false when node has one or zero output ports', () => {
      const outputPort = { id: 'output-1', type: WorkflowPortType.Output, node, edges: [] };
      node.addPort(outputPort);

      expect(node.isBranch).toBe(false);
    });
  });
});
