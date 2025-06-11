import { describe, expect, it } from 'vitest';

import { TestSchemas } from '@workflow/__tests__/schemas';
import { WorkflowRuntimeDocument } from './index';

describe('WorkflowRuntimeDocument create', () => {
  it('should create instance', () => {
    const document = new WorkflowRuntimeDocument();
    expect(document).toBeDefined();
    expect(document.id).toBeDefined();
  });

  it('should has root', () => {
    const schema = {
      nodes: [],
      edges: [],
    };
    const document = new WorkflowRuntimeDocument();
    document.init(schema);
    expect(document.root).toBeDefined();
  });

  it('should init', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.basicSchema);
    const nodeIDs = document.nodes.map((n) => n.id);
    const edgeIDs = document.edges.map((e) => e.id);
    expect(nodeIDs).toEqual(['root', 'start_0', 'end_0', 'llm_0']);
    expect(edgeIDs).toEqual(['start_0-llm_0', 'llm_0-end_0']);
  });

  it('should dispose', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.basicSchema);
    expect(document.nodes.length).toBe(4);
    expect(document.edges.length).toBe(2);
    document.dispose();
    expect(document.nodes.length).toBe(0);
    expect(document.edges.length).toBe(0);
  });

  it('should has start & end', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.basicSchema);
    expect(document.start.id).toBe('start_0');
    expect(document.end.id).toBe('end_0');
  });

  it('should get node by id', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.basicSchema);

    const node = document.getNode('llm_0');
    expect(node).toBeDefined();
    expect(node?.id).toBe('llm_0');
    expect(node?.type).toBe('llm');

    const nonExistNode = document.getNode('non_exist');
    expect(nonExistNode).toBeNull();
  });

  it('should get edge by id', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.basicSchema);

    const edge = document.getEdge('start_0-llm_0');
    expect(edge).toBeDefined();
    expect(edge?.id).toBe('start_0-llm_0');

    const nonExistEdge = document.getEdge('non_exist');
    expect(nonExistEdge).toBeNull();
  });

  it('should init with two LLM schema', () => {
    const document = new WorkflowRuntimeDocument();
    document.init(TestSchemas.twoLLMSchema);

    expect(document.nodes.length).toBeGreaterThan(4); // 包含 root, start, end 和至少两个 LLM 节点
    expect(document.edges.length).toBeGreaterThan(2); // 至少有 3 条边连接这些节点

    // 验证所有必需的节点都存在
    expect(document.root).toBeDefined();
    expect(document.start).toBeDefined();
    expect(document.end).toBeDefined();
  });
});
