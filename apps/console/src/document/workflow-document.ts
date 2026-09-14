/**
 * WorkflowDocument —— 不可变的工作流文档模型。
 *
 * 所有写操作都返回一个 **新的实例**（结构共享），因此可以直接作为
 * useSyncExternalStore 的 snapshot：引用变了就重渲染，没变就不重渲染。
 *
 * 这是「工作流为最终产物」的核心：AI 产出的是这个对象，画布渲染的也是这个对象。
 */
import { nanoid } from 'nanoid';
import { merge } from 'lodash-es';

import { createNodeByType } from '../agent/node-templates';
import { autoLayoutDsl } from './layout';
import { validateDsl } from './validate';
import type {
  DslEdge,
  DslNode,
  DslValidationResult,
  WorkflowDsl,
} from './types';

export interface AddNodeOptions {
  id?: string;
  title?: string;
  position?: { x: number; y: number };
  afterNodeId?: string;
  parentId?: string;
}

export class WorkflowDocument {
  constructor(public readonly dsl: WorkflowDsl) {}

  // ---------------- 构造 ----------------

  static empty(): WorkflowDocument {
    return new WorkflowDocument({ nodes: [], edges: [] });
  }

  /** 从任意 JSON（版本数据 / 模板数据 / LLM 输出）构造，自动归一化 */
  static fromJSON(raw: unknown): WorkflowDocument {
    if (raw instanceof WorkflowDocument) return raw;
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return WorkflowDocument.empty();
      }
    }
    const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Partial<WorkflowDsl>;
    return new WorkflowDocument({
      nodes: Array.isArray(obj.nodes) ? obj.nodes : [],
      edges: Array.isArray(obj.edges) ? obj.edges : [],
      ...(obj.globalVariable ? { globalVariable: obj.globalVariable } : {}),
    });
  }

  // ---------------- 读 ----------------

  get nodes(): DslNode[] {
    return this.dsl.nodes;
  }

  get edges(): DslEdge[] {
    return this.dsl.edges;
  }

  get isEmpty(): boolean {
    return this.dsl.nodes.length === 0;
  }

  getNode(id: string): DslNode | undefined {
    return this.dsl.nodes.find((n) => n.id === id);
  }

  getEdgesOf(nodeId: string): DslEdge[] {
    return this.dsl.edges.filter((e) => e.sourceNodeID === nodeId || e.targetNodeID === nodeId);
  }

  toJSON(): WorkflowDsl {
    return this.dsl;
  }

  clone(): WorkflowDocument {
    return new WorkflowDocument(JSON.parse(JSON.stringify(this.dsl)) as WorkflowDsl);
  }

  /** 结构性校验 */
  validate(): DslValidationResult {
    return validateDsl(this.dsl);
  }

  // ---------------- 写（全部返回新实例） ----------------

  private next(dsl: WorkflowDsl): WorkflowDocument {
    return new WorkflowDocument(dsl);
  }

  addNode(type: string, data?: Record<string, any>, options: AddNodeOptions = {}): WorkflowDocument {
    // start / end 唯一
    if ((type === 'start' || type === 'end') && this.dsl.nodes.some((n) => n.type === type)) {
      return this;
    }

    const built = createNodeByType(type, data, options.title);
    const id = options.id && !this.getNode(options.id) ? options.id : built.id;
    const position = options.position ?? this.resolvePosition(options.afterNodeId);

    const node: DslNode = {
      id,
      type: built.type,
      data: built.data,
      meta: { position },
      ...(options.parentId ? { parentId: options.parentId } : {}),
    };

    return this.next({
      ...this.dsl,
      nodes: [...this.dsl.nodes, node],
    });
  }

  updateNode(id: string, data: Record<string, any>): WorkflowDocument {
    const index = this.dsl.nodes.findIndex((n) => n.id === id);
    if (index === -1) return this;

    const current = this.dsl.nodes[index];
    const merged = merge({}, current.data || {}, data);
    if (data.title !== undefined) merged.title = data.title;

    const nodes = [...this.dsl.nodes];
    nodes[index] = { ...current, data: merged };
    return this.next({ ...this.dsl, nodes });
  }

  deleteNode(id: string): WorkflowDocument {
    const target = this.getNode(id);
    if (!target) return this;
    // start / end 不允许删除
    if (target.type === 'start' || target.type === 'end') return this;

    return this.next({
      ...this.dsl,
      nodes: this.dsl.nodes.filter((n) => n.id !== id),
      edges: this.dsl.edges.filter((e) => e.sourceNodeID !== id && e.targetNodeID !== id),
    });
  }

  connect(from: string, to: string, sourcePortID?: string): WorkflowDocument {
    if (!this.getNode(from) || !this.getNode(to) || from === to) return this;
    const exists = this.dsl.edges.some(
      (e) => e.sourceNodeID === from && e.targetNodeID === to
    );
    if (exists) return this;

    const edge: DslEdge = {
      sourceNodeID: from,
      targetNodeID: to,
      ...(sourcePortID ? { sourcePortID } : {}),
    };
    return this.next({ ...this.dsl, edges: [...this.dsl.edges, edge] });
  }

  disconnect(from: string, to: string): WorkflowDocument {
    return this.next({
      ...this.dsl,
      edges: this.dsl.edges.filter(
        (e) => !(e.sourceNodeID === from && e.targetNodeID === to)
      ),
    });
  }

  moveNode(id: string, position: { x: number; y: number }): WorkflowDocument {
    const index = this.dsl.nodes.findIndex((n) => n.id === id);
    if (index === -1) return this;
    const nodes = [...this.dsl.nodes];
    nodes[index] = { ...nodes[index], meta: { ...(nodes[index].meta || {}), position } };
    return this.next({ ...this.dsl, nodes });
  }

  autoLayout(): WorkflowDocument {
    const copy = this.clone();
    autoLayoutDsl(copy.dsl);
    return copy;
  }

  setNodes(nodes: DslNode[]): WorkflowDocument {
    const ids = new Set(nodes.map((n) => n.id));
    return this.next({
      ...this.dsl,
      nodes,
      edges: this.dsl.edges.filter((e) => ids.has(e.sourceNodeID) && ids.has(e.targetNodeID)),
    });
  }

  /** 全量替换（AI 一次成型的主入口） */
  replace(dsl: WorkflowDsl): WorkflowDocument {
    return new WorkflowDocument(dsl);
  }

  // ---------------- 辅助 ----------------

  private resolvePosition(afterNodeId?: string): { x: number; y: number } {
    if (afterNodeId) {
      const anchor = this.getNode(afterNodeId);
      const pos = anchor?.meta?.position;
      if (pos) return { x: pos.x + 320, y: pos.y };
    }
    const maxX = this.dsl.nodes.reduce(
      (max, n) => Math.max(max, n.meta?.position?.x ?? 0),
      0
    );
    return { x: maxX + 320, y: 120 };
  }

  /**
   * 生成给 LLM 看的精简摘要。
   * 只给结构，不给完整 inputsValues —— 省 token 且避免上下文污染。
   */
  toSummary(): string {
    if (this.isEmpty) return '(空工作流)';
    const lines = this.dsl.nodes.map((n) => {
      const title = n.data?.title || n.id;
      return `- ${n.id} [${n.type}] ${title}`;
    });
    const edgeLines = this.dsl.edges.map((e) => `  ${e.sourceNodeID} → ${e.targetNodeID}`);
    return [...lines, ...edgeLines].join('\n');
  }

  /** 统计信息，用于产物头部展示 */
  toStats(): { nodeCount: number; edgeCount: number; nodeTypes: Record<string, number> } {
    const nodeTypes: Record<string, number> = {};
    for (const n of this.dsl.nodes) {
      nodeTypes[n.type] = (nodeTypes[n.type] || 0) + 1;
    }
    return { nodeCount: this.dsl.nodes.length, edgeCount: this.dsl.edges.length, nodeTypes };
  }
}

/** 生成一个节点 id（供外部使用，保证格式统一） */
export function generateNodeId(type: string): string {
  return `${type}_${nanoid(6)}`;
}
