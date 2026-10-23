import { describe, expect, it } from 'vitest';

import { backendDiffToChangeDetails, parseEdgeKey } from '../version-diff-mapping';
import type { WorkflowVersionDiffResponse } from '../../../services/workflow-api';

describe('parseEdgeKey', () => {
  it('parses from→to with port', () => {
    expect(parseEdgeKey('start_1→llm_1@branch_1', {})).toEqual({
      fromTitle: 'start_1',
      toTitle: 'llm_1',
      fromPort: 'branch_1',
    });
  });

  it('parses from→to without port', () => {
    expect(parseEdgeKey('start_1→end_1', {})).toEqual({
      fromTitle: 'start_1',
      toTitle: 'end_1',
    });
  });

  it('resolves titles from nodeTitles with id fallback', () => {
    const titles = { start_1: '开始', llm_1: 'LLM 调用' };
    expect(parseEdgeKey('start_1→llm_1', titles)).toEqual({
      fromTitle: '开始',
      toTitle: 'LLM 调用',
    });
  });
});

describe('backendDiffToChangeDetails', () => {
  const res: WorkflowVersionDiffResponse = {
    workflowCode: 'wf_x',
    versionNumber: 'v1.2',
    previousVersionNumber: 'v1.1',
    diff: {
      nodes: { added: ['llm_2'], removed: ['old_1'], changed: ['llm_1'] },
      edges: { added: ['start_1→llm_2', 'llm_1→end_1@else'], removed: ['start_1→old_1'] },
    },
    nodeTitles: { llm_1: 'LLM 调用', llm_2: 'LLM 补充', old_1: '旧节点' },
  };

  it('maps node id lists to change details with titles', () => {
    const details = backendDiffToChangeDetails(res);
    expect(details.nodes).toHaveLength(3);
    const added = details.nodes.find((n) => n.change === 'added');
    const updated = details.nodes.find((n) => n.change === 'updated');
    const removed = details.nodes.find((n) => n.change === 'removed');
    expect(added).toMatchObject({ nodeId: 'llm_2', title: 'LLM 补充' });
    expect(updated).toMatchObject({ nodeId: 'llm_1', title: 'LLM 调用' });
    expect(removed).toMatchObject({ nodeId: 'old_1', title: '旧节点' });
  });

  it('maps edge keys with port and title resolution', () => {
    const details = backendDiffToChangeDetails(res);
    expect(details.edges).toHaveLength(3);
    const withPort = details.edges.find((e) => e.fromPort === 'else');
    expect(withPort).toMatchObject({ fromTitle: 'LLM 调用', toTitle: 'end_1', change: 'added' });
    const removed = details.edges.find((e) => e.change === 'removed');
    expect(removed).toMatchObject({ fromTitle: 'start_1', toTitle: '旧节点' });
  });

  it('empty diff maps to empty details (renders 无差异)', () => {
    const details = backendDiffToChangeDetails({
      workflowCode: 'wf_x',
      versionNumber: 'v1.0',
      diff: { nodes: {}, edges: {} },
    });
    expect(details.nodes).toHaveLength(0);
    expect(details.edges).toHaveLength(0);
  });

  it('falls back to id when nodeTitles misses removed nodes', () => {
    const details = backendDiffToChangeDetails({
      workflowCode: 'wf_x',
      versionNumber: 'v1.0',
      diff: { nodes: { removed: ['ghost_1'] }, edges: {} },
    });
    expect(details.nodes[0]).toMatchObject({ nodeId: 'ghost_1', title: 'ghost_1', change: 'removed' });
  });
});
