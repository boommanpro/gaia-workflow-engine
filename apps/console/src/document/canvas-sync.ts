/**
 * 画布 <-> Document 双向同步。
 *
 * 画布不再是数据宿主，而是一个「挂载时接入、卸载时脱离」的编辑端：
 *   - 挂载：把 store 里的 DSL 推给画布（首次全量），之后按 diff 增量打补丁
 *   - 用户在画布上改：回流到 store，保持单一事实源
 *   - 卸载：store 继续存活，AI 照常工作 —— 这正是「AI 主视角」成立的前提
 *
 * 回流时会把变更分类：只有坐标动了算 layout（不产生快照），
 * 结构动了才算一次真正的版本推进 —— 否则用户拖一下节点就多一个版本，历史会烂掉。
 */
import { workflowDocumentStore } from './store';
import { WorkflowDocument } from './workflow-document';
import { nodeDataSignature } from './history';
import type { DslEdge, DslNode, WorkflowDsl } from './types';

/** 画布侧需要实现的最小能力集 */
export interface CanvasBinding {
  /** 读取画布当前 DSL */
  toJSON: () => WorkflowDsl;
  /** 新增节点 */
  createNode: (node: DslNode) => void;
  /** 更新节点 data */
  updateNode: (id: string, data: Record<string, any>) => void;
  /** 删除节点 */
  deleteNode: (id: string) => void;
  /** 新增连线 */
  addEdge: (edge: DslEdge) => void;
  /** 删除连线 */
  removeEdge: (edge: DslEdge) => void;
  /** 整份重建（AI 大改 / 回滚时用，比逐条打补丁可靠） */
  replaceAll: (dsl: WorkflowDsl) => void;
  /** 自动布局 */
  autoLayout: () => void;
  /** 视野自适应 */
  fitView: () => void;
  /** 选中并高亮节点（可选） */
  selectNode?: (id: string) => void;
  /** 高亮若干节点（可选，AI 操作时的脉冲反馈） */
  highlightNodes?: (ids: string[]) => void;
}

export interface DslDiff {
  addedNodes: DslNode[];
  removedNodeIds: string[];
  updatedNodeIds: string[];
  addedEdges: DslEdge[];
  removedEdges: DslEdge[];
  /** 变更比例 0~1，用于决定「增量打补丁」还是「整体重挂载」 */
  changeRatio: number;
}

export function edgeKey(edge: DslEdge): string {
  return `${edge.sourceNodeID}->${edge.targetNodeID}`;
}

/** 计算两份 DSL 的差异 */
export function diffDsl(from: WorkflowDsl, to: WorkflowDsl): DslDiff {
  const fromNodes = new Map(from.nodes.map((n) => [n.id, n]));
  const toNodes = new Map(to.nodes.map((n) => [n.id, n]));

  const addedNodes: DslNode[] = [];
  const updatedNodeIds: string[] = [];
  for (const node of to.nodes) {
    const prev = fromNodes.get(node.id);
    if (!prev) {
      addedNodes.push(node);
    } else if (JSON.stringify(prev.data) !== JSON.stringify(node.data)) {
      updatedNodeIds.push(node.id);
    }
  }

  const removedNodeIds = from.nodes
    .filter((n) => !toNodes.has(n.id))
    .map((n) => n.id);

  const fromEdges = new Map(from.edges.map((e) => [edgeKey(e), e]));
  const toEdges = new Map(to.edges.map((e) => [edgeKey(e), e]));
  const addedEdges = to.edges.filter((e) => !fromEdges.has(edgeKey(e)));
  const removedEdges = from.edges.filter((e) => !toEdges.has(edgeKey(e)));

  const total = Math.max(from.nodes.length + from.edges.length, 1);
  const changed =
    addedNodes.length +
    removedNodeIds.length +
    updatedNodeIds.length +
    addedEdges.length +
    removedEdges.length;
  return {
    addedNodes,
    removedNodeIds,
    updatedNodeIds,
    addedEdges,
    removedEdges,
    changeRatio: Math.min(changed / total, 1),
  };
}

/**
 * 画布侧的内容变更类型（对应 flowgram 的 WorkflowContentChangeType）。
 * 只用来判断「这次变动值不值得推进一个版本」。
 */
export type CanvasChangeType =
  | 'ADD_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'NODE_DATA_CHANGE'
  | 'ADD_LINE'
  | 'DELETE_LINE'
  | 'LINE_DATA_CHANGE'
  | 'META_CHANGE'
  | string;

/** 这些变更只影响观感/位置，不该在版本历史里占一格 */
const NON_STRUCTURAL_CHANGES = new Set<CanvasChangeType>([
  'MOVE_NODE',
  'META_CHANGE',
  'LINE_DATA_CHANGE',
]);

class CanvasSyncEngine {
  private binding: CanvasBinding | null = null;
  private unsubscribe: (() => void) | null = null;
  /** 正在把 store 推给画布，抑制画布回流，避免死循环 */
  private pushing = false;
  /** 画布正在回流给 store */
  private pulling = false;
  private lastSyncedRevision = -1;

  get isAttached(): boolean {
    return this.binding !== null;
  }

  attach(binding: CanvasBinding): void {
    this.binding = binding;
    this.lastSyncedRevision = -1;
    // 首次挂载：以 store 为准（AI 可能已经在没有画布的情况下产出了 DSL）
    this.pushToCanvas(true);
    this.unsubscribe = workflowDocumentStore.subscribe(() => {
      this.pushToCanvas(false);
    });
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.binding = null;
  }

  /**
   * 画布内容变化时由编辑器调用（用户手动编辑）。
   * 把画布作为临时真值回流到 store。
   *
   * `changeTypes` 来自 flowgram 的事件语义，比「内容 diff」可靠得多：
   * 挂载时框架自己会规整一遍序列化，靠 diff 判断会把这次规整误记成用户手动编辑。
   * 传数组是因为一次 debounce 窗口内可能连着发生多次变更（删了节点又拖了一下）。
   */
  onCanvasChange(changeTypes: CanvasChangeType[] = []): void {
    if (this.pushing || this.pulling || !this.binding) return;

    let next: WorkflowDocument;
    try {
      next = WorkflowDocument.fromJSON(this.binding.toJSON());
    } catch {
      return;
    }
    if (next.isEmpty && workflowDocumentStore.getSnapshot().doc.isEmpty) return;

    const current = workflowDocumentStore.getSnapshot().doc.toJSON();
    const incoming = next.toJSON();
    // 内容一模一样（多半是 AI 推送触发的回调）→ 不必回流
    if (JSON.stringify(current) === JSON.stringify(incoming)) return;

    // 拖节点 / 改 meta / 改连线数据都不算「工作流变了」；
    // 拿不到事件类型时（异常路径）再退回结构比对。
    const structuralDiff = structuralDifference(current, incoming);
    const onlyLayout =
      changeTypes.length > 0
        ? changeTypes.every((type) => NON_STRUCTURAL_CHANGES.has(type)) || !structuralDiff
        : !structuralDiff;

    this.pulling = true;
    try {
      workflowDocumentStore.replace(next, {
        kind: onlyLayout ? 'layout' : 'replace',
        source: 'user',
        reason: onlyLayout ? 'user-layout' : 'user-edit',
      });
      this.lastSyncedRevision = workflowDocumentStore.getSnapshot().revision;
    } finally {
      this.pulling = false;
    }
  }

  /** 把 store 的 DSL 打到画布上 */
  pushToCanvas(force: boolean): void {
    const binding = this.binding;
    if (!binding || this.pulling) return;

    const state = workflowDocumentStore.getSnapshot();
    if (!force && state.revision === this.lastSyncedRevision) return;

    this.pushing = true;
    try {
      const target = state.doc.toJSON();
      let canvasDsl: WorkflowDsl;
      try {
        canvasDsl = binding.toJSON();
      } catch {
        canvasDsl = { nodes: [], edges: [] };
      }
      const diff = diffDsl(canvasDsl, target);

      if (diff.changeRatio === 0) {
        this.lastSyncedRevision = state.revision;
        return;
      }

      // 改动过大（AI 整份重写、或用户回滚到很久以前）时，逐条打补丁既慢又容易残留，
      // 直接整份重建，语义上更干净。
      if (diff.changeRatio > 0.6 && (diff.removedNodeIds.length > 0 || diff.addedNodes.length > 3)) {
        binding.replaceAll(target);
        this.lastSyncedRevision = state.revision;
        binding.fitView();
        return;
      }

      for (const id of diff.removedNodeIds) binding.deleteNode(id);
      for (const edge of diff.removedEdges) binding.removeEdge(edge);

      for (const node of diff.addedNodes) binding.createNode(node);
      for (const id of diff.updatedNodeIds) {
        const node = target.nodes.find((n) => n.id === id);
        if (node) binding.updateNode(id, node.data || {});
      }
      for (const edge of diff.addedEdges) binding.addEdge(edge);

      this.lastSyncedRevision = state.revision;

      // AI 刚动过的地方，给个视觉反馈
      const touched = [
        ...diff.addedNodes.map((n) => n.id),
        ...diff.updatedNodeIds,
      ];
      if (touched.length > 0) {
        binding.highlightNodes?.(touched);
        binding.fitView();
      }
    } catch (error) {
      console.warn('[canvas-sync] push to canvas failed', error);
    } finally {
      this.pushing = false;
    }
  }

  /** 让画布选中并定位到某个节点 */
  focusNode(nodeId: string): void {
    this.binding?.selectNode?.(nodeId);
    this.binding?.fitView();
  }
}

/** 两份 DSL 之间是否存在结构差异（忽略坐标与框架派生字段） */
function structuralDifference(a: WorkflowDsl, b: WorkflowDsl): boolean {
  const aNodes = new Map(a.nodes.map((n) => [n.id, n]));
  const bNodes = new Map(b.nodes.map((n) => [n.id, n]));
  if (aNodes.size !== bNodes.size) return true;
  for (const [id, node] of bNodes) {
    const before = aNodes.get(id);
    if (!before) return true;
    // 剔除 data.inputs 这类由框架按连线回填的派生字段，
    // 免得回滚/AI 推送引发的画布回声被当成一次用户手动编辑
    if (nodeDataSignature(before.data) !== nodeDataSignature(node.data)) return true;
  }
  if (a.edges.length !== b.edges.length) return true;
  const aEdges = new Set(a.edges.map(edgeKey));
  for (const edge of b.edges) {
    if (!aEdges.has(edgeKey(edge))) return true;
  }
  return false;
}

export const canvasSync = new CanvasSyncEngine();

/** 供外部判断：当前是否有画布在场 */
export function isCanvasAttached(): boolean {
  return canvasSync.isAttached;
}
