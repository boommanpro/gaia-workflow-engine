/**
 * DSL 校验（headless，不依赖画布与后端）。
 *
 * 定位：AI 产出后的「第一道闸门」。结构化问题（缺 start、断链、孤立节点）
 * 在这里就地拦下并把错误信息回喂给 LLM，避免把垃圾 DSL 存成版本。
 * 业务级校验仍走后端 /api/task/validate。
 */
import type { DslIssue, DslValidationResult, WorkflowDsl } from './types';

/** 不参与「孤立节点」检查的类型 */
const IGNORE_ORPHAN_TYPES = new Set(['comment', 'note']);

/** 需要必填内容的节点字段（缺失=error：节点是空壳，落库也跑不起来） */
const REQUIRED_FIELDS: Record<string, string[]> = {
  http: ['url'],
  llm: ['prompt'],
  code: ['script'],
};

export function validateDsl(dsl: WorkflowDsl | null | undefined): DslValidationResult {
  const issues: DslIssue[] = [];
  const push = (
    level: 'error' | 'warning',
    code: string,
    message: string,
    extra?: { nodeId?: string; edge?: DslIssue['edge'] }
  ) => issues.push({ level, code, message, ...(extra || {}) });

  if (!dsl || !Array.isArray(dsl.nodes) || dsl.nodes.length === 0) {
    push('error', 'EMPTY', '工作流为空，没有任何节点');
    return finalize(issues);
  }

  const { nodes, edges = [] } = dsl;

  // ---- 节点 id ----
  const seen = new Set<string>();
  for (const node of nodes) {
    if (!node?.id) {
      push('error', 'NODE_NO_ID', '存在没有 id 的节点');
      continue;
    }
    if (seen.has(node.id)) {
      push('error', 'NODE_DUP_ID', `节点 id 重复：${node.id}`, { nodeId: node.id });
    }
    seen.add(node.id);
  }

  // ---- start / end ----
  const starts = nodes.filter((n) => n.type === 'start');
  const ends = nodes.filter((n) => n.type === 'end');
  if (starts.length === 0) {
    push('error', 'NO_START', '缺少 start 节点');
  } else if (starts.length > 1) {
    push('error', 'MULTI_START', `存在 ${starts.length} 个 start 节点，只允许一个`);
  }
  if (ends.length === 0) {
    push('warning', 'NO_END', '缺少 end 节点');
  }

  // ---- 连线 ----
  const edgeKeys = new Set<string>();
  const indeg = new Map<string, number>();
  const outdeg = new Map<string, number>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    outdeg.set(n.id, 0);
  }

  for (const edge of edges) {
    if (!edge?.sourceNodeID || !edge?.targetNodeID) {
      push('error', 'EDGE_INCOMPLETE', '存在缺少起止节点的连线', { edge });
      continue;
    }
    if (!seen.has(edge.sourceNodeID)) {
      push('error', 'EDGE_DANGLING', `连线的起点节点不存在：${edge.sourceNodeID}`, { edge });
      continue;
    }
    if (!seen.has(edge.targetNodeID)) {
      push('error', 'EDGE_DANGLING', `连线的终点节点不存在：${edge.targetNodeID}`, { edge });
      continue;
    }
    if (edge.sourceNodeID === edge.targetNodeID) {
      push('error', 'EDGE_SELF_LOOP', `节点 ${edge.sourceNodeID} 存在自环`, { edge });
      continue;
    }
    const key = `${edge.sourceNodeID}->${edge.targetNodeID}`;
    if (edgeKeys.has(key)) {
      push('warning', 'EDGE_DUP', `重复连线：${key}`, { edge });
    }
    edgeKeys.add(key);
    outdeg.set(edge.sourceNodeID, (outdeg.get(edge.sourceNodeID) || 0) + 1);
    indeg.set(edge.targetNodeID, (indeg.get(edge.targetNodeID) || 0) + 1);
  }

  // ---- 孤立节点 ----
  for (const node of nodes) {
    if (IGNORE_ORPHAN_TYPES.has(node.type)) continue;
    const inDeg = indeg.get(node.id) || 0;
    const outDeg = outdeg.get(node.id) || 0;
    if (node.type === 'start' && outDeg === 0) {
      push('error', 'START_DANGLING', 'start 节点没有任何出边，工作流无法向下执行', {
        nodeId: node.id,
      });
      continue;
    }
    if (node.type === 'end' && inDeg === 0) {
      push('warning', 'END_UNREACHABLE', 'end 节点没有任何入边', { nodeId: node.id });
      continue;
    }
    if (inDeg === 0 && outDeg === 0 && node.type !== 'start') {
      push('warning', 'NODE_ORPHAN', `节点「${getNodeTitle(node)}」没有任何连线，不会被调度`, {
        nodeId: node.id,
      });
    }
  }

  // ---- 从 start 出发的可达性 ----
  if (starts.length === 1) {
    const reachable = traverse(dsl, starts[0].id);
    for (const node of nodes) {
      if (IGNORE_ORPHAN_TYPES.has(node.type)) continue;
      if (!reachable.has(node.id)) {
        push('warning', 'NODE_UNREACHABLE', `节点「${getNodeTitle(node)}」从 start 不可达`, {
          nodeId: node.id,
        });
      }
    }
  }

  // ---- 必填字段 ----
  for (const node of nodes) {
    const required = REQUIRED_FIELDS[node.type];
    if (!required) continue;
    for (const field of required) {
      const value = readInputValue(node, field);
      if (value === undefined || value === null || value === '' || isEmptyScript(node, field)) {
        push(
          'error',
          'NODE_FIELD_EMPTY',
          `节点「${getNodeTitle(node)}」缺少 ${field}，无法执行，请补全后再应用`,
          { nodeId: node.id }
        );
      }
    }
  }

  // ---- 环检测 ----
  const cycle = detectCycle(dsl);
  if (cycle) {
    push('warning', 'HAS_CYCLE', `检测到环：${cycle.join(' → ')}，请确认是否为有意的循环`);
  }

  return finalize(issues);
}

function finalize(issues: DslIssue[]): DslValidationResult {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  return { valid: errors.length === 0, issues, errors, warnings };
}

/** 从起点做 BFS，返回可达节点集合 */
function traverse(dsl: WorkflowDsl, startId: string): Set<string> {
  const adj = new Map<string, string[]>();
  for (const edge of dsl.edges || []) {
    if (!adj.has(edge.sourceNodeID)) adj.set(edge.sourceNodeID, []);
    adj.get(edge.sourceNodeID)!.push(edge.targetNodeID);
  }
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adj.get(current) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/** DFS 找一条环路径，无环返回 null */
function detectCycle(dsl: WorkflowDsl): string[] | null {
  const adj = new Map<string, string[]>();
  for (const node of dsl.nodes) adj.set(node.id, []);
  for (const edge of dsl.edges || []) {
    adj.get(edge.sourceNodeID)?.push(edge.targetNodeID);
  }

  const state = new Map<string, 0 | 1 | 2>();
  const path: string[] = [];

  const dfs = (id: string): string[] | null => {
    state.set(id, 1);
    path.push(id);
    for (const next of adj.get(id) || []) {
      const s = state.get(next) || 0;
      if (s === 1) {
        return [...path.slice(path.indexOf(next)), next];
      }
      if (s === 0) {
        const found = dfs(next);
        if (found) return found;
      }
    }
    path.pop();
    state.set(id, 2);
    return null;
  };

  for (const node of dsl.nodes) {
    if ((state.get(node.id) || 0) === 0) {
      const found = dfs(node.id);
      if (found) return found;
    }
  }
  return null;
}

function getNodeTitle(node: { data?: Record<string, any>; id: string; type: string }): string {
  return node.data?.title || node.id || node.type;
}

/** 读取节点 inputsValues 里的实际内容（兼容 template / constant / ref / 纯值） */
function readInputValue(node: { data?: Record<string, any> }, field: string): unknown {
  const inputsValues = node.data?.inputsValues;
  if (inputsValues && typeof inputsValues === 'object') {
    const entry = inputsValues[field];
    if (entry && typeof entry === 'object' && 'content' in entry) return entry.content;
    if (entry !== undefined) return entry;
  }
  return node.data?.[field];
}

/** script 特例：{language, content} 对象里 content 为空也算缺失 */
function isEmptyScript(node: { data?: Record<string, any> }, field: string): boolean {
  if (field !== 'script') return false;
  const value = readInputValue(node, field);
  if (value && typeof value === 'object' && 'content' in (value as Record<string, unknown>)) {
    const content = (value as Record<string, unknown>).content;
    return typeof content !== 'string' || content.trim() === '';
  }
  return false;
}
