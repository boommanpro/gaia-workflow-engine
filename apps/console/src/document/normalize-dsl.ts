/**
 * DSL 接入守卫（零兼容版，2026-10-24）：
 * 产物来自后端 agent 草稿 / 画布 toJSON，两处源头都已是规范形状
 * （节点 id/type/data/meta 齐备、边用 sourceNodeID/targetNodeID）。
 * 这里只做结构校验与缺坐标布局，不再做任何别名翻译、字段补造、类型降级——
 * 不合法的产物直接判定失败，由调用方走「画布已保护」路径，
 * 与后端 WorkflowDslCanonicalizer 的零兼容策略保持同一口径。
 */
import { autoLayoutDsl } from './layout';
import type { DslEdge, DslNode, WorkflowDsl } from './types';

export interface NormalizeResult {
  dsl: WorkflowDsl;
  /** 接入过程做的修补说明（目前仅剩缺坐标自动布局） */
  repairs: string[];
}

/** 校验并接入一份工作流 JSON；不合法时 dsl.nodes 为空数组 */
export function normalizeWorkflowDsl(raw: unknown): NormalizeResult {
  const repairs: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { dsl: { nodes: [], edges: [] }, repairs: ['产物不是 {nodes, edges} 对象'] };
  }
  const obj = raw as Record<string, any>;
  const nodes: DslNode[] | null = Array.isArray(obj.nodes) ? (obj.nodes as DslNode[]) : null;
  const edges: DslEdge[] = Array.isArray(obj.edges) ? (obj.edges as DslEdge[]) : [];
  if (!nodes || nodes.length === 0) {
    return { dsl: { nodes: [], edges: [] }, repairs: ['产物中没有节点'] };
  }

  const dsl: WorkflowDsl = {
    nodes,
    edges,
    ...(obj.globalVariable ? { globalVariable: obj.globalVariable } : {}),
  };

  if (dsl.nodes.some((n) => !n.meta?.position)) {
    autoLayoutDsl(dsl);
    repairs.push('部分节点缺少坐标，已自动分层布局');
  }
  return { dsl, repairs };
}
