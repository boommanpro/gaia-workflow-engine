import { beforeEach, describe, expect, it } from 'vitest';
import { WorkflowEdgeSchema, CreateEdgeParams, INode, IPort } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeEdge } from '.';

describe('WorkflowRuntimeEdge', () => {
  let edge: WorkflowRuntimeEdge;
  let mockFromNode: INode;
  let mockToNode: INode;
  let mockParams: CreateEdgeParams;

  beforeEach(() => {
    mockFromNode = {
      id: 'from-node',
    } as INode;

    mockToNode = {
      id: 'to-node',
    } as INode;

    mockParams = {
      id: 'test-edge',
      from: mockFromNode,
      to: mockToNode,
    };

    edge = new WorkflowRuntimeEdge(mockParams);
  });

  describe('constructor', () => {
    it('should initialize with provided params', () => {
      expect(edge.id).toBe(mockParams.id);
      expect(edge.from).toBe(mockParams.from);
      expect(edge.to).toBe(mockParams.to);
    });
  });

  describe('ports', () => {
    let mockFromPort: IPort;
    let mockToPort: IPort;

    beforeEach(() => {
      mockFromPort = { id: 'from-port' } as IPort;
      mockToPort = { id: 'to-port' } as IPort;
    });

    it('should set and get fromPort correctly', () => {
      edge.fromPort = mockFromPort;
      expect(edge.fromPort).toBe(mockFromPort);
    });

    it('should set and get toPort correctly', () => {
      edge.toPort = mockToPort;
      expect(edge.toPort).toBe(mockToPort);
    });
  });

  describe('createID', () => {
    it('should create ID with port IDs', () => {
      const schema: WorkflowEdgeSchema = {
        sourceNodeID: 'source',
        sourcePortID: 'sourcePort',
        targetNodeID: 'target',
        targetPortID: 'targetPort',
      };

      const id = WorkflowRuntimeEdge.createID(schema);
      expect(id).toBe('source:sourcePort-target:targetPort');
    });

    it('should create ID without port IDs', () => {
      const schema: WorkflowEdgeSchema = {
        sourceNodeID: 'source',
        targetNodeID: 'target',
      };

      const id = WorkflowRuntimeEdge.createID(schema);
      expect(id).toBe('source-target');
    });

    it('should create ID with mixed port IDs', () => {
      const schemaWithSourcePort: WorkflowEdgeSchema = {
        sourceNodeID: 'source',
        sourcePortID: 'sourcePort',
        targetNodeID: 'target',
      };

      const schemaWithTargetPort: WorkflowEdgeSchema = {
        sourceNodeID: 'source',
        targetNodeID: 'target',
        targetPortID: 'targetPort',
      };

      expect(WorkflowRuntimeEdge.createID(schemaWithSourcePort)).toBe('source:sourcePort-target');
      expect(WorkflowRuntimeEdge.createID(schemaWithTargetPort)).toBe('source-target:targetPort');
    });
  });
});
