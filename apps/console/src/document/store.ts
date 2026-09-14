/**
 * WorkflowDocumentStore —— 全局单一事实源。
 *
 * 关键点：
 *  1. 它是 **唯一的** 工作流数据持有者，画布只是它的一个渲染/编辑端。
 *  2. AI（tool 执行器）和用户（画布）都写这个 store，互不感知对方是否存在。
 *  3. 通过 useSyncExternalStore 接入 React，避免 context 层层透传。
 *  4. 每次实质变更都会留下一个 **快照**（CanvasSnapshot），因此画布是有版本、
 *     可回滚的 —— AI 一整轮改错了，用户一键就能回到这一轮之前。
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
import type { DslChange, SnapshotReason, WorkflowDsl } from './types';

export interface WorkflowMeta {
  workflowCode?: string;
  workflowName?: string;
  versionNumber?: string;
  /** 最近一次已保存的 DSL，用于计算 dirty 与 Diff */
  savedDsl?: WorkflowDsl;
  /** 这份产物是谁产出的 */
  producedBy?: 'ai' | 'user' | 'import';
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
}

type Listener = () => void;

/** 快照数量上限（防止长对话把内存吃满） */
const SNAPSHOT_LIMIT = 60;
/** sessionStorage 里的持久化上限（超过就放弃持久化，避免超配额） */
const PERSIST_BUDGET = 1_400_000;
const PERSIST_KEY = 'gaia.canvasSnapshots';

const EMPTY_DELTA = {
  addedNodes: 0,
  removedNodes: 0,
  updatedNodes: 0,
  addedEdges: 0,
  removedEdges: 0,
};

class WorkflowDocumentStore {
  private state: WorkflowDocumentState = {
    doc: WorkflowDocument.empty(),
    meta: {},
    revision: 0,
    snapshots: [],
    cursor: -1,
  };

  private listeners = new Set<Listener>();
  /**
   * 当前历史归属的上下文（通常是一段会话）。
   * 换上下文时历史跟着换 —— 否则打开 A 工作流会看到 B 的版本记录。
   */
  private scope: string | null = null;

  /**
   * 当前生成轮对应的 assistant 消息 id。
   * AgentContext 在一轮对话开始时写入，工具执行（applyWorkflow 等）写 store 时
   * 没有消息上下文，靠它把「AI 改动画布」的那条快照挂到正确的助手消息下，
   * 于是对话栏里才会出现对应的画布快照卡。
   */
  private activeMessageId: string | null = null;

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
   * 落一条快照。三种情况会直接跳过：
   *   · 内容和当前快照完全一致（例如刷新后重新应用同一份产物）
   *   · 空文档
   * 命中更早的快照时，说明这是一次「回到旧版」的操作，标成 rollback 更好读。
   */
  private recordSnapshot(change: DslChange, outcome: SnapshotOutcome = 'ok'): void {
    const dsl = this.state.doc.toJSON();
    if (!dsl.nodes.length) return;

    const current = this.state.snapshots[this.state.cursor];
    if (current && sameJson(current.dsl, dsl)) return;

    // 更早的快照里存在同一条内容 → 用户在回退，而不是在前进
    let rollbackFrom: string | undefined;
    for (let i = 0; i < this.state.cursor; i += 1) {
      if (sameJson(this.state.snapshots[i].dsl, dsl)) {
        rollbackFrom = this.state.snapshots[i].id;
        break;
      }
    }

    const prev = this.state.snapshots[this.state.cursor];
    const delta = computeSnapshotDelta(dsl, prev?.dsl);
    if (!rollbackFrom && !hasStructuralDelta(delta) && prev) return;

    const reason: SnapshotReason = rollbackFrom
      ? 'rollback'
      : change.reason || deriveReason(change, current);

    // AI 来源的快照若调用方没带 messageId，则回落到当前生成轮（activeMessageId），
    // 这样对话栏里这张卡才能正确挂到那条助手消息下面。
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
      dsl: clone(dsl),
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
    this.persist();
  }

  /**
   * 记录一次「失败轮」：模型产出的东西不合法，没有写入画布。
   * 不落画布，只留一条记录 —— 对话里那张卡会因此显示成红色的「已保护」。
   */
  captureFailure(messageId: string | undefined, note: string): void {
    const failureMessageId = messageId ?? this.activeMessageId ?? undefined;
    const snapshot: CanvasSnapshot = {
      id: `snap_fail_${nanoid(6)}`,
      at: Date.now(),
      reason: 'ai-edit',
      source: 'ai',
      outcome: 'failed',
      ...(failureMessageId ? { messageId: failureMessageId } : {}),
      failureNote: note,
      dsl: clone(this.state.doc.toJSON()),
      delta: { ...EMPTY_DELTA },
      nodeCount: this.state.doc.toJSON().nodes.length,
      edgeCount: this.state.doc.toJSON().edges.length,
    };
    this.state = { ...this.state, snapshots: [...this.state.snapshots, snapshot] };
    this.persist();
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
      doc: WorkflowDocument.fromJSON(clone(target.dsl)),
      meta: { ...this.state.meta, updatedAt: Date.now() },
      lastChange: { kind: 'replace', source: 'user', reason: 'rollback' },
      revision: this.state.revision + 1,
      cursor: index,
      lastRollback: { fromId, toId: snapshotId, at: Date.now() },
    };
    this.persist();
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
   * 切换历史归属。换上下文就换一套版本记录，并尝试把该上下文上次的历史捞回来，
   * 这样刷新页面 / 切走再切回来，撤销深度还在。
   *
   * 若新上下文没有任何历史，就把「眼前这份内容」当作它的起点记一笔 ——
   * 想想这个场景：先在工作流库打开一个工作流进了编辑器，会话身份随后才确定下来；
   * 如果这时把画布内容丢掉，用户会看到刚打开的工作流凭空消失。
   */
  setScope(key: string | null): void {
    if (key === this.scope) return;
    const carryDoc = this.state.doc.isEmpty ? null : this.state.doc;
    this.scope = key;

    const restored = key ? this.loadPersisted(key) : null;
    if (restored) {
      this.state = {
        ...this.state,
        doc: WorkflowDocument.fromJSON(restored.dsl),
        snapshots: restored.snapshots,
        cursor: restored.cursor,
        revision: this.state.revision + 1,
      };
      this.emit();
      return;
    }

    this.state = { ...this.state, snapshots: [], cursor: -1 };
    if (carryDoc) {
      this.state = { ...this.state, doc: carryDoc };
      this.recordSnapshot({ kind: 'replace', source: 'system', reason: 'import' });
    }
    this.emit();
  }

  private loadPersisted(
    key: string
  ): { dsl: WorkflowDsl; snapshots: CanvasSnapshot[]; cursor: number } | null {
    try {
      const raw = sessionStorage.getItem(`${PERSIST_KEY}:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { snapshots?: CanvasSnapshot[]; cursor?: number };
      const snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
      if (snapshots.length === 0) return null;
      const cursor = Math.max(0, Math.min(parsed.cursor ?? snapshots.length - 1, snapshots.length - 1));
      const dsl = snapshots[cursor]?.dsl;
      if (!dsl?.nodes?.length) return null;
      return { dsl, snapshots, cursor };
    } catch {
      return null;
    }
  }

  // ---------------- 写 API ----------------

  private commit(
    doc: WorkflowDocument,
    change: DslChange,
    options: { snapshot?: boolean } = {}
  ): void {
    if (doc === this.state.doc) return; // 无变更

    this.state = {
      doc,
      meta: { ...this.state.meta, updatedAt: Date.now() },
      lastChange: change,
      revision: this.state.revision + 1,
      snapshots: this.state.snapshots,
      cursor: this.state.cursor,
    };

    // 纯坐标变化（拖节点）不该污染版本历史
    if (options.snapshot !== false && change.kind !== 'layout') {
      this.recordSnapshot(change);
    }
    this.emit();
  }

  /** 全量替换（AI 一次成型 / 加载版本 / 导入） */
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

  setMeta(meta: Partial<WorkflowMeta>): void {
    this.state = { ...this.state, meta: { ...this.state.meta, ...meta } };
    this.emit();
  }

  /** 标记为已保存：把当前 DSL 记为基线 */
  markSaved(meta: Partial<WorkflowMeta> = {}): void {
    this.state = {
      ...this.state,
      meta: {
        ...this.state.meta,
        ...meta,
        savedDsl: clone(this.state.doc.toJSON()),
        updatedAt: Date.now(),
      },
    };
    this.emit();
  }

  clear(): void {
    this.state = {
      doc: WorkflowDocument.empty(),
      meta: {},
      revision: this.state.revision + 1,
      snapshots: [],
      cursor: -1,
    };
    try {
      if (this.scope) sessionStorage.removeItem(`${PERSIST_KEY}:${this.scope}`);
    } catch {
      /* 隐私模式下忽略 */
    }
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

  // ---------------- 持久化（同一上下文刷新后仍可回滚） ----------------

  private persist(): void {
    if (!this.scope) return;
    const key = `${PERSIST_KEY}:${this.scope}`;
    try {
      const payload = JSON.stringify({
        snapshots: this.state.snapshots,
        cursor: this.state.cursor,
      });
      if (payload.length > PERSIST_BUDGET) {
        // 太大就只留最近 10 条，保命优先
        const trimmed = {
          snapshots: this.state.snapshots.slice(-10),
          cursor: Math.min(this.state.cursor, 9),
        };
        const small = JSON.stringify(trimmed);
        if (small.length > PERSIST_BUDGET) {
          sessionStorage.removeItem(key);
          return;
        }
        sessionStorage.setItem(key, small);
        return;
      }
      sessionStorage.setItem(key, payload);
    } catch {
      /* 超配额 / 隐私模式：放弃持久化，不影响本次会话 */
    }
  }

  // ---------------- 派生 ----------------

  get isDirty(): boolean {
    const { savedDsl } = this.state.meta;
    if (!savedDsl) return !this.state.doc.isEmpty;
    return !sameJson(savedDsl, this.state.doc.toJSON());
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 依据变更来源与上下文推断一个可读的快照原因 */
function deriveReason(change: DslChange, current?: CanvasSnapshot): SnapshotReason {
  if (change.reason) return change.reason;
  if (change.source === 'user') return 'user-edit';
  if (change.source === 'system') return 'import';
  return current && current.nodeCount > 0 ? 'ai-edit' : 'ai-generate';
}

export const workflowDocumentStore = new WorkflowDocumentStore();

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
