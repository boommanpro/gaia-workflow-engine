/**
 * WorkflowDocumentStore —— 全局单一事实源。
 *
 * 关键点：
 *  1. 它是 **唯一的** 工作流数据持有者，画布只是它的一个渲染/编辑端。
 *  2. AI（document 事件，全量或增量 ops）和用户（画布）都写这个 store。
 *  3. 通过 useSyncExternalStore 接入 React；细粒度消费方自己 memo。
 *  4. 每次实质变更都会留下一个 **快照**（CanvasSnapshot），因此画布是有版本、
 *     可回滚的 —— AI 一整轮改错了，用户一键就能回到这一轮之前。
 *
 * v3 性能契约（长会话不卡的关键）：
 *  · 快照比对用创建时缓存的 dslJson 字符串（不再对全部历史快照反复 JSON.stringify）；
 *  · 持久化走 IndexedDB 异步写（防抖 800ms），不再同步塞 sessionStorage；
 *  · 服务端 document 事件支持增量 ops（版本对齐时应用，失步由宿主拉全量）。
 */
import { useSyncExternalStore } from 'react';
import { nanoid } from 'nanoid';

import { WorkflowDocument } from './workflow-document';
import {
  computeSnapshotDelta,
  hasStructuralDelta,
  type CanvasSnapshot,
  type SnapshotOutcome,
} from './history';
import { loadSnapshots, saveSnapshots } from './idb';
import type { DslChange, SnapshotReason, WorkflowDsl } from './types';

export interface WorkflowMeta {
  workflowCode?: string;
  workflowName?: string;
  versionNumber?: string;
  /** 最近一次已保存的 DSL，用于计算 dirty 与 Diff */
  savedDsl?: WorkflowDsl;
  /** savedDsl 的序列化缓存（isDirty 不再反复 stringify） */
  savedDslJson?: string;
  /** 这份产物是谁产出的 */
  producedBy?: 'ai' | 'user' | 'import';
  /**
   * 这份画布内容归属的会话 key。显式所有权是跨会话清空的唯一判据——
   * producedBy/lastChange 启发式会被草稿恢复、版本定格等路径污染。
   */
  ownerSession?: string | null;
  /**
   * 自上次 markSaved 以来画布是否发生内容级变化。按变更来源维护：
   * 用户/AI 的结构变化与回滚置 true；系统加载（import）不置。
   * 纯布局拖动也置位（2026-10-27 保存制回归）：拖完不保存就会丢，「未保存」
   * 必须如实反映；快照历史仍不记纯布局（避免历史被拖动刷屏）。
   */
  dirtySinceSave?: boolean;
  updatedAt?: number;
}

export interface WorkflowDocumentState {
  doc: WorkflowDocument;
  meta: WorkflowMeta;
  lastChange?: DslChange;
  /** 自增版本号，用于画布判断是否需要整体重挂载 */
  revision: number;
  /** 画布快照时间线（append-only，回滚不删历史） */
  snapshots: CanvasSnapshot[];
  /** 当前所处的快照下标；-1 表示还没有任何快照 */
  cursor: number;
  /** 最近一次回滚，用于给用户一个「你刚回到了 vN」的提示 */
  lastRollback?: { fromId: string; toId: string; at: number };
  /** 服务端画布版本（document 事件 / GET /document 对齐；0 = 未知） */
  serverDocVersion: number;
}

type Listener = () => void;

/** 快照数量上限（防止长对话把内存吃满） */
const SNAPSHOT_LIMIT = 60;
/** 持久化预算：超过就裁剪旧快照（字节计） */
const PERSIST_BUDGET = 2_400_000;

const EMPTY_DELTA = {
  addedNodes: 0,
  removedNodes: 0,
  updatedNodes: 0,
  addedEdges: 0,
  removedEdges: 0,
};

/** 服务端 document 事件的增量 op（与后端 SessionWorkflowDraftService.diffOps 对齐） */
export type DocumentOp =
  | { op: 'node_set'; node: any }
  | { op: 'node_remove'; id: string }
  | { op: 'edge_set'; edge: any }
  | { op: 'edge_remove'; key: string };

function edgeKeyOf(edge: { sourceNodeID?: string; targetNodeID?: string; sourcePortID?: string }): string {
  const from = edge.sourceNodeID || '';
  const to = edge.targetNodeID || '';
  const port = edge.sourcePortID;
  return port ? `${from}->${to}#${port}` : `${from}->${to}`;
}

class WorkflowDocumentStore {
  private state: WorkflowDocumentState = {
    doc: WorkflowDocument.empty(),
    meta: {},
    revision: 0,
    snapshots: [],
    cursor: -1,
    serverDocVersion: 0,
  };

  private listeners = new Set<Listener>();
  /**
   * 当前历史归属的上下文（通常是一段会话）。
   * 换上下文时历史跟着换 —— 否则打开 A 工作流会看到 B 的版本记录。
   */
  private scope: string | null = null;

  /**
   * 当前生成轮对应的 assistant 消息 id（AI 改动画布的快照归属）。
   */
  private activeMessageId: string | null = null;

  /**
   * run 粒度会话版本的「待定格」标记：一轮 run 里模型可能调十几次工具，
   * 只在 run 结束由 captureAiRunSnapshot 定格一版。
   */
  private pendingAiChange: { reason: SnapshotReason } | null = null;

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------------- React 绑定 ----------------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WorkflowDocumentState => this.state;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  // ---------------- 快照 ----------------

  /**
   * 落一条快照。AI 来源的变更只做「待定格」标记（run 粒度合并），
   * 用户/系统来源照常立即落版本。
   */
  private recordSnapshot(change: DslChange, outcome: SnapshotOutcome = 'ok'): void {
    if (change.source === 'ai') {
      this.pendingAiChange = this.pendingAiChange ?? {
        reason: this.state.snapshots.length === 0 ? 'ai-generate' : 'ai-edit',
      };
      return;
    }
    this.recordSnapshotImmediate(change, outcome);
  }

  /** run 结束时调用：本轮 AI 变更若有，定格为一个会话版本 */
  captureAiRunSnapshot(messageId?: string): void {
    const pending = this.pendingAiChange;
    this.pendingAiChange = null;
    if (!pending) return;
    this.recordSnapshotImmediate(
      { kind: 'replace', source: 'ai', reason: pending.reason, messageId },
      'ok'
    );
  }

  private recordSnapshotImmediate(change: DslChange, outcome: SnapshotOutcome = 'ok'): void {
    const dslJson = JSON.stringify(this.state.doc.toJSON());
    const dsl = JSON.parse(dslJson) as WorkflowDsl;
    if (!dsl.nodes.length) return;

    const current = this.state.snapshots[this.state.cursor];
    if (current && current.dslJson === dslJson) return;

    // 更早的快照里存在同一条内容 → 用户在回退，而不是在前进（字符串比对，不再逐条 stringify）
    let rollbackFrom: string | undefined;
    for (let i = 0; i < this.state.cursor; i += 1) {
      const prev = this.state.snapshots[i];
      const prevJson = prev.dslJson ?? JSON.stringify(prev.dsl);
      if (prevJson === dslJson) {
        rollbackFrom = prev.id;
        break;
      }
    }

    const prev = this.state.snapshots[this.state.cursor];
    const delta = computeSnapshotDelta(dsl, prev?.dsl);
    if (!rollbackFrom && !hasStructuralDelta(delta) && prev) return;

    // 手动编辑合并（少记版本）：连续手改更新同一条快照，而不是每步一条
    if (
      !rollbackFrom
      && change.source === 'user'
      && prev
      && prev.source === 'user'
      && (prev.reason === 'user-edit' || prev.reason === 'user-layout')
      && prev.outcome === 'ok'
      && this.state.cursor === this.state.snapshots.length - 1
    ) {
      const snapshots = this.state.snapshots.slice();
      snapshots[this.state.snapshots.length - 1] = {
        ...prev,
        at: Date.now(),
        dsl,
        dslJson,
        delta: computeSnapshotDelta(dsl, prev.prevDsl),
        nodeCount: dsl.nodes.length,
        edgeCount: (dsl.edges || []).length,
      };
      this.state = { ...this.state, snapshots };
      this.schedulePersist();
      return;
    }

    const reason: SnapshotReason = rollbackFrom
      ? 'rollback'
      : change.reason || deriveReason(change, current);

    const messageId =
      change.messageId ?? (change.source === 'ai' ? this.activeMessageId ?? undefined : undefined);

    // 站在中间快照上继续编辑 → 被跳过的那些仍保留，只是标记为「已被覆盖」
    const snapshots = this.state.snapshots.map((s, i) =>
      i > this.state.cursor && !s.superseded ? { ...s, superseded: true } : s
    );

    const snapshot: CanvasSnapshot = {
      id: `snap_${nanoid(8)}`,
      at: Date.now(),
      reason,
      source: change.source,
      outcome,
      ...(messageId ? { messageId } : {}),
      ...(rollbackFrom ? { rollbackFrom } : {}),
      dsl,
      dslJson,
      ...(prev ? { prevDsl: prev.dsl } : {}),
      delta,
      nodeCount: dsl.nodes.length,
      edgeCount: (dsl.edges || []).length,
    };

    snapshots.push(snapshot);
    while (snapshots.length > SNAPSHOT_LIMIT) snapshots.shift();

    this.state = {
      ...this.state,
      snapshots,
      cursor: snapshots.length - 1,
      ...(rollbackFrom
        ? { lastRollback: { fromId: current?.id || '', toId: snapshot.id, at: Date.now() } }
        : {}),
    };
    this.schedulePersist();
  }

  /**
   * 记录一次「失败轮」：模型产出的东西不合法，没有写入画布。
   */
  captureFailure(messageId: string | undefined, note: string): void {
    const failureMessageId = messageId ?? this.activeMessageId ?? undefined;
    const dsl = JSON.parse(JSON.stringify(this.state.doc.toJSON())) as WorkflowDsl;
    const snapshot: CanvasSnapshot = {
      id: `snap_fail_${nanoid(6)}`,
      at: Date.now(),
      reason: 'ai-edit',
      source: 'ai',
      outcome: 'failed',
      ...(failureMessageId ? { messageId: failureMessageId } : {}),
      failureNote: note,
      dsl,
      delta: { ...EMPTY_DELTA },
      nodeCount: dsl.nodes.length,
      edgeCount: (dsl.edges || []).length,
    };
    this.state = { ...this.state, snapshots: [...this.state.snapshots, snapshot] };
    this.schedulePersist();
    this.emit();
  }

  /** 回到某个快照。只移动游标，历史一条都不删。 */
  rollbackTo(snapshotId: string): boolean {
    const index = this.state.snapshots.findIndex((s) => s.id === snapshotId);
    if (index === -1) return false;
    const target = this.state.snapshots[index];
    if (!target.dsl.nodes.length) return false;

    const fromId = this.state.snapshots[this.state.cursor]?.id || '';
    this.state = {
      ...this.state,
      doc: WorkflowDocument.fromJSON(JSON.parse(JSON.stringify(target.dsl)) as WorkflowDsl),
      meta: { ...this.state.meta, updatedAt: Date.now(), dirtySinceSave: true },
      lastChange: { kind: 'replace', source: 'user', reason: 'rollback' },
      revision: this.state.revision + 1,
      cursor: index,
      lastRollback: { fromId, toId: snapshotId, at: Date.now() },
    };
    this.schedulePersist();
    this.emit();
    return true;
  }

  /** 当前所在的快照 */
  get currentSnapshot(): CanvasSnapshot | undefined {
    return this.state.snapshots[this.state.cursor];
  }

  // ---------------- 上下文（历史隔离） ----------------

  /** 标记当前生成轮对应的助手消息 id（供 AI 工具写快照时回落） */
  setActiveMessageId(id: string | null | undefined): void {
    this.activeMessageId = id ?? null;
  }

  /**
   * 切换历史归属。换上下文就换一套版本记录；快照从 IndexedDB 异步拾回
   * （只服务「空画布」：异步晚到时不顶掉眼前已承接的内容）。
   */
  setScope(key: string | null): void {
    if (key === this.scope) return;
    const carryDoc = this.state.doc.isEmpty || this.state.meta.ownerSession ? null : this.state.doc;
    this.scope = key;
    this.state = { ...this.state, snapshots: [], cursor: -1 };
    if (carryDoc) {
      this.state = { ...this.state, doc: carryDoc };
      this.recordSnapshot({ kind: 'replace', source: 'system', reason: 'import' });
    }
    this.emit();
    if (key) {
      const scopeKey = key;
      void loadSnapshots(scopeKey).then((restored) => {
        if (this.scope !== scopeKey || !restored) return;
        if (!this.state.doc.isEmpty) return;
        this.state = {
          ...this.state,
          doc: WorkflowDocument.fromJSON(restored.dsl),
          snapshots: restored.snapshots,
          cursor: restored.cursor,
          revision: this.state.revision + 1,
        };
        this.emit();
      });
    }
  }

  // ---------------- 写 API ----------------

  private commit(
    doc: WorkflowDocument,
    change: DslChange,
    options: { snapshot?: boolean } = {}
  ): void {
    if (doc === this.state.doc) return; // 无变更

    // 未保存标记：用户/AI 来源都算（含纯布局——拖完不保存就丢，必须如实显示）；
    // keepClean（应用服务端权威内容：恢复/对齐/增量对账）与系统加载不算——
    // 此刻本地内容就等于服务端草稿，「未保存」不成立。快照仍跳过纯布局，两件事分开。
    const affectsContent = change.source !== 'system' && !change.keepClean;
    this.state = {
      ...this.state,
      doc,
      meta: {
        ...this.state.meta,
        updatedAt: Date.now(),
        ...(affectsContent ? { dirtySinceSave: true } : {}),
      },
      lastChange: change,
      revision: this.state.revision + 1,
      snapshots: this.state.snapshots,
      cursor: this.state.cursor,
    };

    if (options.snapshot !== false && change.kind !== 'layout') {
      this.recordSnapshot(change);
    }
    this.emit();
  }

  /** 全量替换（AI document 全量 / 加载版本 / 导入） */
  replace(
    doc: WorkflowDocument,
    change: Omit<DslChange, 'kind'> & { kind?: DslChange['kind'] }
  ): void {
    this.commit(doc, { kind: change.kind || 'replace', ...change });
  }

  /** 增量修改：mutator 返回新文档 */
  mutate(mutator: (doc: WorkflowDocument) => WorkflowDocument, change: DslChange): void {
    this.commit(mutator(this.state.doc), change);
  }

  /**
   * 服务端 document 增量 ops 应用（版本对齐时）。
   * baseVersion 传入时做门禁：与本地 serverDocVersion 不符返回 false（调用方应拉全量）——
   * 契约此前只写在注释里、实现在调用方，任何新调用点漏检都会把增量写到错误基线上（静默丢更新）。
   * keepClean：会话草稿画布应用服务端权威内容 = 本地即服务端，不算未保存。
   * 返回 false = 版本不符或内容无变化。
   */
  applyServerOps(
    ops: DocumentOp[],
    version: number,
    baseVersion?: number,
    opts?: { keepClean?: boolean }
  ): boolean {
    if (baseVersion != null && baseVersion > 0 && this.state.serverDocVersion !== baseVersion) {
      return false;
    }
    if (!Array.isArray(ops) || ops.length === 0) {
      if (version > 0) this.state = { ...this.state, serverDocVersion: version };
      return true;
    }
    const json = this.state.doc.toJSON() as WorkflowDsl & { edges: any[] };
    const nodes = [...(json.nodes || [])];
    const edges = [...(json.edges || [])];
    let changed = false;
    for (const op of ops) {
      if (op.op === 'node_set') {
        const id = op.node?.id;
        if (!id) continue;
        const idx = nodes.findIndex((n: any) => n.id === id);
        if (idx >= 0) nodes[idx] = op.node;
        else nodes.push(op.node);
        changed = true;
      } else if (op.op === 'node_remove') {
        const before = nodes.length;
        const filtered = nodes.filter((n: any) => n.id !== op.id);
        if (filtered.length !== before) changed = true;
        nodes.length = 0;
        nodes.push(...filtered);
      } else if (op.op === 'edge_set') {
        const key = edgeKeyOf(op.edge);
        const idx = edges.findIndex((e: any) => edgeKeyOf(e) === key);
        if (idx >= 0) edges[idx] = op.edge;
        else edges.push(op.edge);
        changed = true;
      } else if (op.op === 'edge_remove') {
        const before = edges.length;
        const filtered = edges.filter((e: any) => edgeKeyOf(e) !== op.key);
        if (filtered.length !== before) changed = true;
        edges.length = 0;
        edges.push(...filtered);
      }
    }
    this.state = { ...this.state, serverDocVersion: version > 0 ? version : this.state.serverDocVersion };
    if (!changed) {
      this.emit();
      return true;
    }
    const next = { ...json, nodes, edges };
    this.replace(WorkflowDocument.fromJSON(next), {
      kind: 'replace',
      source: 'ai',
      reason: 'ai-edit',
      ...(opts?.keepClean ? { keepClean: true } : {}),
    });
    return true;
  }

  /** 服务端全量文档应用（含版本号）。keepClean 语义见 applyServerOps */
  applyServerDoc(dsl: WorkflowDsl, version: number, opts?: { keepClean?: boolean }): void {
    this.state = { ...this.state, serverDocVersion: version > 0 ? version : this.state.serverDocVersion };
    this.replace(WorkflowDocument.fromJSON(dsl), {
      kind: 'replace',
      source: 'ai',
      reason: 'ai-edit',
      ...(opts?.keepClean ? { keepClean: true } : {}),
    });
  }

  /**
   * 仅对齐服务端文档版本号（不触内容）：连接对账发现结构与本地一致时使用——
   * 后端重启会重置草稿版本计数，不重对齐的话后续增量 ops 的 baseVersion 永远对不上，
   * 每条 op 都触发一次全量拉取兜底。
   */
  alignServerDocVersion(version: number): void {
    if (version > 0 && version !== this.state.serverDocVersion) {
      this.state = { ...this.state, serverDocVersion: version };
      this.emit();
    }
  }

  get serverDocVersion(): number {
    return this.state.serverDocVersion;
  }

  setMeta(meta: Partial<WorkflowMeta>): void {
    this.state = { ...this.state, meta: { ...this.state.meta, ...meta } };
    this.emit();
  }

  /** 标记为已保存：把当前 DSL 记为基线，同时清除「未保存」标记 */
  markSaved(meta: Partial<WorkflowMeta> = {}): void {
    const dsl = this.state.doc.toJSON() as WorkflowDsl;
    this.state = {
      ...this.state,
      meta: {
        ...this.state.meta,
        ...meta,
        savedDsl: dsl,
        savedDslJson: JSON.stringify(dsl),
        dirtySinceSave: false,
        updatedAt: Date.now(),
      },
    };
    this.emit();
  }

  /**
   * 清空画布与历史。wipePersisted 控制是否连 IndexedDB 里的快照一起删除：
   * 只应在「同 scope 内换工作流」这类确实要丢弃历史的场景传 true。会话切换
   * 不能传 —— 切会话时 scope 往往已指向新会话，按旧实现会把新会话的快照
   * 历史误删（2026-10-27 修复），而旧会话的历史本就该留着供下次切回恢复。
   */
  clear(opts: { wipePersisted?: boolean } = {}): void {
    this.state = {
      doc: WorkflowDocument.empty(),
      meta: {},
      revision: this.state.revision + 1,
      snapshots: [],
      cursor: -1,
      serverDocVersion: 0,
    };
    if (opts.wipePersisted && this.scope) void saveSnapshots(this.scope, null);
    this.emit();
  }

  // ---------------- 撤销 / 重做（游标语义） ----------------

  undo(): void {
    if (this.state.cursor <= 0) return;
    this.rollbackTo(this.state.snapshots[this.state.cursor - 1].id);
  }

  redo(): void {
    if (this.state.cursor >= this.state.snapshots.length - 1) return;
    this.rollbackTo(this.state.snapshots[this.state.cursor + 1].id);
  }

  get canUndo(): boolean {
    return this.state.cursor > 0;
  }

  get canRedo(): boolean {
    return this.state.cursor < this.state.snapshots.length - 1;
  }

  // ---------------- 持久化（IndexedDB 异步，防抖） ----------------

  private schedulePersist(): void {
    if (!this.scope) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    const scopeKey = this.scope;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      const cursor = this.state.cursor;
      let snapshots = this.state.snapshots;
      // 预算裁剪：超限先裁旧快照（保命优先），再放不下就放弃持久化
      let total = snapshots.reduce((sum, s) => sum + (s.dslJson?.length ?? 0), 0) + 64 * snapshots.length;
      while (total > PERSIST_BUDGET && snapshots.length > 1) {
        total -= (snapshots[0].dslJson?.length ?? 0) + 64;
        snapshots = snapshots.slice(1);
      }
      if (total > PERSIST_BUDGET) return;
      const dsl = snapshots[Math.min(cursor, snapshots.length - 1)]?.dsl;
      void saveSnapshots(scopeKey, {
        dsl,
        snapshots,
        cursor: Math.min(cursor, snapshots.length - 1),
      });
    }, 800);
  }

  // ---------------- 派生 ----------------

  get isDirty(): boolean {
    const { savedDslJson } = this.state.meta;
    if (!savedDslJson) return !this.state.doc.isEmpty;
    return savedDslJson !== JSON.stringify(this.state.doc.toJSON());
  }
}

function deriveReason(change: DslChange, current?: CanvasSnapshot): SnapshotReason {
  if (change.reason) return change.reason;
  if (change.source === 'user') return 'user-edit';
  if (change.source === 'system') return 'import';
  return current && current.nodeCount > 0 ? 'ai-edit' : 'ai-generate';
}

export const workflowDocumentStore = new WorkflowDocumentStore();

// dev 调试钩子：控制台可直接检查画布事实源（脏标记/归属/lastChange），
// 生产构建剔除。排查「未保存为什么亮/归属对不对」时不必再加临时日志。
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__gaiaDocStore = workflowDocumentStore;
}

/** 订阅整份状态 */
export function useWorkflowDocumentState(): WorkflowDocumentState {
  return useSyncExternalStore(
    workflowDocumentStore.subscribe,
    workflowDocumentStore.getSnapshot
  );
}

/** 只订阅文档本体 */
export function useWorkflowDocument(): WorkflowDocument {
  return useSyncExternalStore(workflowDocumentStore.subscribe, workflowDocumentStore.getSnapshot)
    .doc;
}

/** 订阅画布快照时间线 */
export function useCanvasSnapshots(): {
  snapshots: CanvasSnapshot[];
  cursor: number;
  current?: CanvasSnapshot;
} {
  const state = useSyncExternalStore(
    workflowDocumentStore.subscribe,
    workflowDocumentStore.getSnapshot
  );
  return {
    snapshots: state.snapshots,
    cursor: state.cursor,
    current: state.snapshots[state.cursor],
  };
}
