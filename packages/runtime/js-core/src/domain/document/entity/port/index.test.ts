import { beforeEach, describe, expect, it } from 'vitest';
import { WorkflowPortType, CreatePortParams, IEdge, INode } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimePort } from '.';

describe('WorkflowRuntimePort', () => {
  let port: WorkflowRuntimePort;
  let mockNode: INode;
  let mockParams: CreatePortParams;

  beforeEach(() => {
    mockNode = {
      id: 'test-node',
    } as INode;

    mockParams = {
      id: 'test-port',
      node: mockNode,
      type: WorkflowPortType.Input,
    };

    port = new WorkflowRuntimePort(mockParams);
  });

  describe('constructor', () => {
    it('should initialize with provided params', () => {
      expect(port.id).toBe(mockParams.id);
      expect(port.node).toBe(mockParams.node);
      expect(port.type).toBe(mockParams.type);
      expect(port.edges).toEqual([]);
    });

    it('should initialize with different port types', () => {
      const inputPort = new WorkflowRuntimePort({
        ...mockParams,
        type: WorkflowPortType.Input,
      });
      expect(inputPort.type).toBe(WorkflowPortType.Input);

      const outputPort = new WorkflowRuntimePort({
        ...mockParams,
        type: WorkflowPortType.Output,
      });
      expect(outputPort.type).toBe(WorkflowPortType.Output);
    });
  });

  describe('edges management', () => {
    it('should add edge correctly', () => {
      const mockEdge: IEdge = {
        id: 'test-edge',
      } as IEdge;

      port.addEdge(mockEdge);
      expect(port.edges).toHaveLength(1);
      expect(port.edges[0]).toBe(mockEdge);
    });

    it('should maintain edge order when adding multiple edges', () => {
      const mockEdge1: IEdge = { id: 'edge-1' } as IEdge;
      const mockEdge2: IEdge = { id: 'edge-2' } as IEdge;
      const mockEdge3: IEdge = { id: 'edge-3' } as IEdge;

      port.addEdge(mockEdge1);
      port.addEdge(mockEdge2);
      port.addEdge(mockEdge3);

      expect(port.edges).toHaveLength(3);
      expect(port.edges[0]).toBe(mockEdge1);
      expect(port.edges[1]).toBe(mockEdge2);
      expect(port.edges[2]).toBe(mockEdge3);
    });
  });
});
