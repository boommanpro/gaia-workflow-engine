/**
 * DSL 归一化：把 LLM 产出的「宽松 JSON」翻译成严格合法的 WorkflowDsl。
 *
 * LLM 常见的偷懒写法，这里全部兜住：
 *  - 节点没有 id / id 重复            → 自动补 id
 *  - 字段是扁平的（{url: "..."}）      → 走 node-templates 转成 flowgram inputsValues
 *  - 边写成 {from, to}                → 转成 {sourceNodeID, targetNodeID}
 *  - 没有 position                    → 自动分层布局
 *  - 缺 start / end                   → 自动补齐并串到主链两端
 */
import { nanoid } from 'nanoid';
import { merge } from 'lodash-es';

import { createNodeByType, getSupportedNodeTypes } from '../agent/node-templates';
import { autoLayoutDsl } from './layout';
import type { DslEdge, DslNode, WorkflowDsl } from './types';

/** 原始节点的宽松类型 */
interface RawNode {
  id?: string;
  type?: string;
  title?: string;
  data?: Record<string, any>;
  position?: { x: number; y: number };
  meta?: Record<string, any>;
  parentId?: string;
  [key: string]: any;
}

/** 原始边的宽松类型 */
interface RawEdge {
  sourceNodeID?: string;
  targetNodeID?: string;
  sourcePortID?: string;
  targetPortID?: string;
  from?: string;
  to?: string;
  fromPort?: string;
  source?: string;
  target?: string;
}

export interface NormalizeOptions {
  /** 是否自动补齐 start / end 节点，默认 true */
  ensureTerminals?: boolean;
  /** 是否对缺失坐标的节点做自动布局，默认 true */
  ensureLayout?: boolean;
  /** 节点标题语言 */
  title?: string;
}

export interface NormalizeResult {
  dsl: WorkflowDsl;
  /** 归一化过程中做的修补，用于回传给 LLM 让它知道系统替它做了什么 */
  repairs: string[];
}

/**
 * 归一化任意来源的工作流 JSON。
 * 永远返回结构合法的 DSL；不合法的部分会被修补而不是抛错（AI 场景下容错优先）。
 */
export function normalizeWorkflowDsl(raw: unknown, options: NormalizeOptions = {}): NormalizeResult {
  const { ensureTerminals = true, ensureLayout = true } = options;
  const repairs: string[] = [];

  const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  // 兼容 LLM 直接吐数组、或把 nodes 写成 nodeList / steps
  const rawNodes: RawNode[] = Array.isArray(rawObj)
    ? (rawObj as RawNode[])
    : rawObj.nodes || rawObj.nodeList || rawObj.steps || [];
  const rawEdges: RawEdge[] = rawObj.edges || rawObj.lines || rawObj.connections || [];

  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    return { dsl: { nodes: [], edges: [] }, repairs: ['输入中未找到任何节点'] };
  }

  const supported = new Set(getSupportedNodeTypes());
  const nodes: DslNode[] = [];
  /** LLM id → 归一化后的真实 id，用于修正连线引用 */
  const idMap = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const [index, rawNode] of rawNodes.entries()) {
    if (!rawNode || typeof rawNode !== 'object') {
      repairs.push(`第 ${index + 1} 个节点不是对象，已跳过`);
      continue;
    }

    let type = typeof rawNode.type === 'string' ? rawNode.type : '';
    if (!type) {
      repairs.push(`第 ${index + 1} 个节点缺少 type，已按 variable 处理`);
      type = 'variable';
    }
    if (!supported.has(type)) {
      repairs.push(`节点类型 "${type}" 不受支持，已降级为 variable`);
      type = 'variable';
    }

    // 只把「真正的业务字段」喂给模板，避免 id/type/position 被塞进 data
    const { id, type: _t, position, meta, parentId, data, title, ...restData } = rawNode;
    const businessData = merge({}, data || {}, restData);

    const built = createNodeByType(type, businessData, title || rawNode.title);

    // start / end 全局唯一，重复的直接改类型而不是再加一个
    if ((type === 'start' || type === 'end') && nodes.some((n) => n.type === type)) {
      repairs.push(`出现多个 ${type} 节点，多余的已降级为 variable`);
      const fallback = createNodeByType('variable', businessData, title || rawNode.title);
      built.type = fallback.type;
      built.data = fallback.data;
    }

    let nodeId = typeof id === 'string' && id ? id : built.id;
    if (usedIds.has(nodeId)) {
      const newId = `${type}_${nanoid(6)}`;
      repairs.push(`节点 id "${nodeId}" 重复，已重命名为 "${newId}"`);
      nodeId = newId;
    }
    usedIds.add(nodeId);
    if (id && id !== nodeId) idMap.set(String(id), nodeId);
    if (!id) idMap.set(built.id, nodeId);

    const nodePosition = position || meta?.position;
    nodes.push({
      id: nodeId,
      type: built.type,
      data: built.data,
      meta: { ...(meta || {}), ...(nodePosition ? { position: nodePosition } : {}) },
      ...(parentId ? { parentId } : {}),
    });
  }

  if (nodes.length === 0) {
    return { dsl: { nodes: [], edges: [] }, repairs };
  }

  // ---- 边 ----
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: DslEdge[] = [];
  const seenEdges = new Set<string>();

  for (const rawEdge of rawEdges) {
    if (!rawEdge || typeof rawEdge !== 'object') continue;
    const source = rawEdge.sourceNodeID || rawEdge.from || rawEdge.source;
    const target = rawEdge.targetNodeID || rawEdge.to || rawEdge.target;
    if (!source || !target) {
      repairs.push('存在缺少起止节点的连线，已跳过');
      continue;
    }
    const sourceNodeID = idMap.get(String(source)) || String(source);
    const targetNodeID = idMap.get(String(target)) || String(target);

    if (!nodeIds.has(sourceNodeID) || !nodeIds.has(targetNodeID)) {
      repairs.push(`连线 ${source} → ${target} 指向不存在的节点，已跳过`);
      continue;
    }
    if (sourceNodeID === targetNodeID) {
      repairs.push(`节点 ${sourceNodeID} 存在自环，已跳过`);
      continue;
    }
    const key = `${sourceNodeID}->${targetNodeID}`;
    if (seenEdges.has(key)) {
      repairs.push(`连线 ${key} 重复，已去重`);
      continue;
    }
    seenEdges.add(key);

    edges.push({
      sourceNodeID,
      targetNodeID,
      ...(rawEdge.sourcePortID || rawEdge.fromPort
        ? { sourcePortID: rawEdge.sourcePortID || rawEdge.fromPort }
        : {}),
      ...(rawEdge.targetPortID ? { targetPortID: rawEdge.targetPortID } : {}),
    });
  }

  const dsl: WorkflowDsl = {
    nodes,
    edges,
    ...(rawObj.globalVariable ? { globalVariable: rawObj.globalVariable } : {}),
  };

  if (ensureTerminals) {
    repairs.push(...ensureTerminalNodes(dsl));
  }
  if (ensureLayout) {
    const missingPosition = dsl.nodes.some((n) => !n.meta?.position);
    if (missingPosition) {
      autoLayoutDsl(dsl);
      repairs.push('部分节点缺少坐标，已自动分层布局');
    }
  }

  return { dsl, repairs };
}

/** 保证有且仅有一个 start、至少一个 end，并把它们串到主链两端 */
export function ensureTerminalNodes(dsl: WorkflowDsl): string[] {
  const repairs: string[] = [];
  const hasStart = dsl.nodes.some((n) => n.type === 'start');
  const hasEnd = dsl.nodes.some((n) => n.type === 'end');

  if (hasStart && hasEnd) return repairs;

  // 找出「主链」：入度为 0 的最靠前节点 / 出度为 0 的最靠后节点
  const indeg = new Map<string, number>();
  const outdeg = new Map<string, number>();
  for (const n of dsl.nodes) {
    indeg.set(n.id, 0);
    outdeg.set(n.id, 0);
  }
  for (const e of dsl.edges) {
    indeg.set(e.targetNodeID, (indeg.get(e.targetNodeID) || 0) + 1);
    outdeg.set(e.sourceNodeID, (outdeg.get(e.sourceNodeID) || 0) + 1);
  }

  if (!hasStart) {
    const start = createNodeByType('start', {}, 'Start');
    const head = dsl.nodes.find((n) => n.type !== 'end' && (indeg.get(n.id) || 0) === 0);
    dsl.nodes.unshift({ id: start.id, type: 'start', data: start.data, meta: { position: { x: 0, y: 0 } } });
    if (head) {
      dsl.edges.unshift({ sourceNodeID: start.id, targetNodeID: head.id });
    }
    repairs.push('缺少 start 节点，已自动补充并接入主链');
  }

  if (!hasEnd) {
    const end = createNodeByType('end', {}, 'End');
    const tail = dsl.nodes
      .filter((n) => n.type !== 'start' && (outdeg.get(n.id) || 0) === 0)
      .pop();
    dsl.nodes.push({ id: end.id, type: 'end', data: end.data, meta: { position: { x: 0, y: 0 } } });
    if (tail) {
      dsl.edges.push({ sourceNodeID: tail.id, targetNodeID: end.id });
    }
    repairs.push('缺少 end 节点，已自动补充并接入主链');
  }

  return repairs;
}
