/**
 * 画布快照模型 —— 「工作流是有历史的文档」。
 *
 * 为什么需要它：
 *   AI 每一轮都可能整份重写工作流，而对话是可能出错的。
 *   如果画布只有「当前形态」，用户一旦走到坏的那一版就再也回不去。
 *
 * 三层语义：
 *   1. 快照（CanvasSnapshot）：某一次实质变更后的完整 DSL + 变更摘要 + 归属消息。
 *   2. 游标（cursor）：我现在站在哪个快照上。回滚 = 移动游标，而不是删历史。
 *   3. 落版版本（后端 gaia_workflow_version）：跨会话可追溯的正式版本。
 *
 * 注意这里刻意不做「时间线分叉」：回滚后再编辑会产生一条新快照，
 * 被跳过的那几条仍留在列表里（标记为已被覆盖），任何时刻都能再回去。
 */
import type { DslEdge, DslNode, SnapshotReason, WorkflowDsl } from './types';

export type SnapshotSource = 'ai' | 'user' | 'system';
export type SnapshotOutcome = 'ok' | 'failed';

export type { SnapshotReason };

export interface SnapshotDelta {
  addedNodes: number;
  removedNodes: number;
  updatedNodes: number;
  addedEdges: number;
  removedEdges: number;
  /**
   * 字段级/连线级明细（阶段 2.3）。旧快照没有此字段，UI 退化为节点标题列表。
   * 在 computeSnapshotDelta 里一并算出，成本可忽略（每次快照一次）。
   */
  details?: DslChangeDetails;
}

/** 单个字段的 before → after（值已格式化为可读字符串） */
export interface FieldChange {
  path: string;
  before: string;
  after: string;
}

export interface NodeChangeDetail {
  nodeId: string;
  title: string;
  type: string;
  change: 'added' | 'removed' | 'updated';
  /** 仅 updated 节点携带：改了哪些字段、从什么变成什么 */
  fields?: FieldChange[];
}

export interface EdgeChangeDetail {
  key: string;
  fromTitle: string;
  toTitle: string;
  fromPort?: string;
  change: 'added' | 'removed';
}

export interface DslChangeDetails {
  nodes: NodeChangeDetail[];
  edges: EdgeChangeDetail[];
}

export interface CanvasSnapshot {
  id: string;
  /** 毫秒时间戳 */
  at: number;
  reason: SnapshotReason;
  source: SnapshotSource;
  outcome: SnapshotOutcome;
  /** 关联的对话消息 id —— 用来把这张快照挂到产生它的那条消息下面 */
  messageId?: string;
  /** 失败轮的简短原因（不落画布，只做提示） */
  failureNote?: string;
  /** 回滚产生的快照，记录目标快照 id */
  rollbackFrom?: string;
  /** 该快照是否已被后续编辑覆盖（仍可回滚，只是不在当前链路上） */
  superseded?: boolean;
  dsl: WorkflowDsl;
  /** dsl 的序列化缓存（快照比对/持久化不再反复 stringify） */
  dslJson?: string;
  /**
   * 上一版的 DSL（第一版为 undefined）。
   * 只存引用不复制：快照里的 dsl 是不可变对象，共享引用即可，省内存。
   */
  prevDsl?: WorkflowDsl;
  delta: SnapshotDelta;
  nodeCount: number;
  edgeCount: number;
}

const EMPTY_DELTA: SnapshotDelta = {
  addedNodes: 0,
  removedNodes: 0,
  updatedNodes: 0,
  addedEdges: 0,
  removedEdges: 0,
};

function edgeKey(edge: DslEdge): string {
  return `${edge.sourceNodeID}->${edge.targetNodeID}`;
}

/**
 * 节点 data 的「用户可见」指纹。
 *
 * flowgram 把一份 DSL 灌进画布时会按连线关系回填派生字段，
 * 最典型的是 node.data.inputs.properties（输入 schema）。
 * 这些是框架算出来的、不是用户改的：比对时必须剔除，
 * 否则回滚 / AI 推送触发的画布回声会被误判成一次手动编辑，凭空多出一个版本。
 */
export function nodeDataSignature(data: Record<string, any> | undefined | null): string {
  if (!data) return '';
  const visible: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (key === 'inputs') continue;
    visible[key] = data[key];
  }
  return JSON.stringify(visible);
}

/** 计算两份 DSL 之间的结构差异（只看结构，不看坐标），并附带字段级/连线级明细 */
export function computeSnapshotDelta(
  next: WorkflowDsl,
  prev?: WorkflowDsl | null
): SnapshotDelta {
  const details = computeDslChangeDetails(next, prev);

  if (!prev) {
    return {
      ...EMPTY_DELTA,
      addedNodes: next.nodes.length,
      addedEdges: next.edges.length,
      details,
    };
  }

  const delta: SnapshotDelta = {
    addedNodes: details.nodes.filter((n) => n.change === 'added').length,
    removedNodes: details.nodes.filter((n) => n.change === 'removed').length,
    updatedNodes: details.nodes.filter((n) => n.change === 'updated').length,
    addedEdges: details.edges.filter((e) => e.change === 'added').length,
    removedEdges: details.edges.filter((e) => e.change === 'removed').length,
    details,
  };
  return delta;
}

/** 值格式化：字符串截断、对象 JSON 化，保证差异条目单行可读 */
function formatDeltaValue(value: unknown): string {
  if (value === undefined || value === null) return '∅';
  let text: string;
  if (typeof value === 'string') text = value;
  else if (typeof value === 'object') {
    try { text = JSON.stringify(value); } catch { text = '[object]'; }
  } else text = String(value);
  if (text.length > 60) text = `${text.slice(0, 57)}…`;
  return text;
}

/**
 * 字段级 data diff：递归到第 2 层（inputsValues.text 这类常用路径），再深就整块对比。
 * 与 nodeDataSignature 同口径剔除派生字段 inputs —— 那是画布回填的，不是用户改的。
 */
function diffNodeData(
  beforeData: Record<string, any> | undefined | null,
  afterData: Record<string, any> | undefined | null
): FieldChange[] {
  const fields: FieldChange[] = [];
  const before = beforeData || {};
  const after = afterData || {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'inputs') continue; // 框架派生字段
    const b = before[key];
    const a = after[key];
    const bText = formatDeltaValue(b);
    const aText = formatDeltaValue(a);
    if (bText === aText) continue;
    const bothPlainObject =
      b && a && typeof b === 'object' && typeof a === 'object'
      && !Array.isArray(b) && !Array.isArray(a);
    if (bothPlainObject) {
      // 深一层：把 outputs.properties.text 这类嵌套变化摊开
      const sub = diffNodeData(b, a);
      if (sub.length > 0 && sub.length <= 8) {
        for (const f of sub) fields.push({ path: `${key}.${f.path}`, before: f.before, after: f.after });
      } else if (sub.length > 8) {
        fields.push({ path: key, before: bText, after: aText });
      } else {
        fields.push({ path: key, before: bText, after: aText });
      }
    } else {
      fields.push({ path: key, before: bText, after: aText });
    }
  }
  return fields;
}

/** 两份 DSL 的完整差异明细（节点增删改 + 字段前后值 + 连线增删，阶段 2.3） */
export function computeDslChangeDetails(
  next: WorkflowDsl,
  prev?: WorkflowDsl | null
): DslChangeDetails {
  const nodes: NodeChangeDetail[] = [];
  const nextList = next.nodes || [];
  const prevList = prev?.nodes || [];
  const prevNodes = new Map<string, DslNode>(prevList.map((n) => [n.id, n]));
  const nextNodes = new Map<string, DslNode>(nextList.map((n) => [n.id, n]));

  for (const node of nextList) {
    const before = prev ? prevNodes.get(node.id) : undefined;
    if (!prev || !before) {
      nodes.push({ nodeId: node.id, title: nodeLabel(node), type: node.type || '', change: 'added' });
    } else if (nodeDataSignature(before.data) !== nodeDataSignature(node.data)) {
      nodes.push({
        nodeId: node.id,
        title: nodeLabel(node),
        type: node.type || '',
        change: 'updated',
        fields: diffNodeData(before.data, node.data),
      });
    }
  }
  if (prev) {
    for (const node of prevList) {
      if (!nextNodes.has(node.id)) {
        nodes.push({ nodeId: node.id, title: nodeLabel(node), type: node.type || '', change: 'removed' });
      }
    }
  }

  const titleOf = (id: string): string => {
    const node = nextNodes.get(id) || prevNodes.get(id);
    return node ? nodeLabel(node) : id;
  };
  const edges: EdgeChangeDetail[] = [];
  const prevEdgeKeys = new Map<string, DslEdge>();
  for (const e of prev?.edges || []) prevEdgeKeys.set(edgeKey(e), e);
  const nextEdgeKeys = new Map<string, DslEdge>();
  for (const e of next.edges || []) nextEdgeKeys.set(edgeKey(e), e);
  for (const [key, e] of nextEdgeKeys) {
    if (!prev || !prevEdgeKeys.has(key)) {
      edges.push({
        key,
        fromTitle: titleOf(e.sourceNodeID),
        toTitle: titleOf(e.targetNodeID),
        ...(e.sourcePortID ? { fromPort: e.sourcePortID } : {}),
        change: 'added',
      });
    }
  }
  if (prev) {
    for (const [key, e] of prevEdgeKeys) {
      if (!nextEdgeKeys.has(key)) {
        edges.push({
          key,
          fromTitle: titleOf(e.sourceNodeID),
          toTitle: titleOf(e.targetNodeID),
          ...(e.sourcePortID ? { fromPort: e.sourcePortID } : {}),
          change: 'removed',
        });
      }
    }
  }

  return { nodes, edges };
}

/** 差异是否有实质内容（纯坐标变化不算） */
export function hasStructuralDelta(delta: SnapshotDelta): boolean {
  return (
    delta.addedNodes > 0 ||
    delta.removedNodes > 0 ||
    delta.updatedNodes > 0 ||
    delta.addedEdges > 0 ||
    delta.removedEdges > 0
  );
}

/** 两份 DSL 结构是否完全一致（忽略坐标） */
export function sameStructure(a: WorkflowDsl, b: WorkflowDsl): boolean {
  const d = computeSnapshotDelta(a, b);
  return !hasStructuralDelta(d);
}

/** 坐标是否变化（用于区分「拖了个节点」和「改了工作流」） */
export function positionsDiffer(a: WorkflowDsl, b: WorkflowDsl): boolean {
  const aMap = new Map((a.nodes || []).map((n) => [n.id, n.meta?.position]));
  for (const node of b.nodes || []) {
    const before = aMap.get(node.id);
    const after = node.meta?.position;
    if (!before || !after) continue;
    if (before.x !== after.x || before.y !== after.y) return true;
  }
  return false;
}

/** 变更摘要是否为空（用于决定要不要在对话里挂一张卡） */
export function isEmptyDelta(delta: SnapshotDelta): boolean {
  return !hasStructuralDelta(delta);
}

export interface ThumbNode {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThumbEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ThumbnailLayout {
  width: number;
  height: number;
  nodes: ThumbNode[];
  edges: ThumbEdge[];
}

const THUMB_NODE_W = 13;
const THUMB_NODE_H = 9;
const THUMB_PAD = 8;

/**
 * 把 DSL 压成一张缩略图布局。
 * 优先用节点真实坐标（AI 产出通常已带分层坐标，归一化后天然的「从左到右」）；
 * 没有坐标时退化为按索引铺格，保证任何 DSL 都能画出个大概形状。
 */
export function computeThumbnail(dsl: WorkflowDsl, width: number, height: number): ThumbnailLayout {
  const nodes = dsl.nodes || [];
  const edges = dsl.edges || [];
  if (nodes.length === 0) {
    return { width, height, nodes: [], edges: [] };
  }

  const withPos = nodes.every((n) => n.meta?.position);
  const raw = new Map<string, { x: number; y: number }>();

  if (withPos) {
    for (const n of nodes) {
      raw.set(n.id, { x: n.meta!.position!.x, y: n.meta!.position!.y });
    }
  } else {
    const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(nodes.length))));
    nodes.forEach((n, i) => {
      raw.set(n.id, { x: (i % cols) * 200, y: Math.floor(i / cols) * 140 });
    });
  }

  const xs = [...raw.values()].map((p) => p.x);
  const ys = [...raw.values()].map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  const innerW = width - THUMB_PAD * 2 - THUMB_NODE_W;
  const innerH = height - THUMB_PAD * 2 - THUMB_NODE_H;

  const placed: ThumbNode[] = nodes.map((n) => {
    const p = raw.get(n.id)!;
    return {
      id: n.id,
      type: n.type,
      x: THUMB_PAD + ((p.x - minX) / spanX) * innerW,
      y: THUMB_PAD + ((p.y - minY) / spanY) * innerH,
      w: THUMB_NODE_W,
      h: THUMB_NODE_H,
    };
  });

  const byId = new Map(placed.map((n) => [n.id, n]));
  const thumbEdges: ThumbEdge[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.sourceNodeID);
    const to = byId.get(edge.targetNodeID);
    if (!from || !to) continue;
    thumbEdges.push({
      x1: from.x + from.w,
      y1: from.y + from.h / 2,
      x2: to.x,
      y2: to.y + to.h / 2,
    });
  }

  return { width, height, nodes: placed, edges: thumbEdges };
}

/** 节点类型 → 缩略图配色（与产品主题色一致） */
export function thumbTone(type: string): string {
  switch (type) {
    case 'start':
    case 'end':
      return '#1f9d55';
    case 'llm':
      return '#4d53e8';
    case 'condition':
    case 'branches':
      return '#b7791f';
    case 'loop':
      return '#7b5cd6';
    case 'http':
      return '#2b7fb8';
    case 'code':
      return '#5b5b66';
    default:
      return '#9a9aa4';
  }
}

export interface DeltaDetail {
  added: string[];
  removed: string[];
  updated: string[];
}

function nodeLabel(node: DslNode): string {
  const title = node.data?.title;
  return typeof title === 'string' && title.trim() ? title : node.id;
}

/** 逐节点的差异详情，供「对比上一版」使用 */
export function describeNodeDelta(
  next: WorkflowDsl,
  prev?: WorkflowDsl | null
): DeltaDetail {
  if (!prev) {
    return { added: (next.nodes || []).map(nodeLabel), removed: [], updated: [] };
  }
  const prevNodes = new Map<string, DslNode>((prev.nodes || []).map((n) => [n.id, n]));
  const nextNodes = new Map<string, DslNode>((next.nodes || []).map((n) => [n.id, n]));

  const added: string[] = [];
  const updated: string[] = [];
  for (const node of next.nodes || []) {
    const before = prevNodes.get(node.id);
    if (!before) added.push(nodeLabel(node));
    else if (nodeDataSignature(before.data) !== nodeDataSignature(node.data)) {
      updated.push(nodeLabel(node));
    }
  }
  const removed = (prev.nodes || [])
    .filter((n) => !nextNodes.has(n.id))
    .map(nodeLabel);

  return { added, removed, updated };
}
