/**
 * Workflow DSL —— 单一事实源（headless）
 *
 * 设计目标：让 AI 可以在 **没有画布实例** 的情况下读写工作流。
 * 画布（flowgram）退化为一个「视图/编辑器」，不再是数据的宿主。
 */

/** 节点坐标 */
export interface NodePosition {
  x: number;
  y: number;
}

/** DSL 节点 */
export interface DslNode {
  id: string;
  type: string;
  meta?: {
    position?: NodePosition;
    [key: string]: any;
  };
  data?: Record<string, any>;
  /** 子画布父节点（loop / group 容器） */
  parentId?: string;
  [key: string]: any;
}

/** DSL 连线 */
export interface DslEdge {
  sourceNodeID: string;
  targetNodeID: string;
  sourcePortID?: string;
  targetPortID?: string;
}

/** 完整工作流 DSL（与后端 gaia_workflow_version.workflow_data 同构） */
export interface WorkflowDsl {
  nodes: DslNode[];
  edges: DslEdge[];
  globalVariable?: Record<string, any>;
}

/** 校验结果 */
export interface DslIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  /** 相关节点/边，便于画布高亮 */
  nodeId?: string;
  edge?: DslEdge;
}

export interface DslValidationResult {
  valid: boolean;
  issues: DslIssue[];
  errors: DslIssue[];
  warnings: DslIssue[];
}

/** 变更类型，供画布增量同步与 AI 上下文使用 */
export type DslChangeKind =
  | 'init'
  | 'replace'
  | 'add-node'
  | 'update-node'
  | 'delete-node'
  | 'add-edge'
  | 'delete-edge'
  | 'layout';

export interface DslChange {
  kind: DslChangeKind;
  nodeIds?: string[];
  edge?: DslEdge;
  /** 变更来源：ai = AI 工具产出，user = 画布人工编辑，system = 初始化/导入 */
  source: 'ai' | 'user' | 'system';
  /**
   * 触发这次变更的对话消息 id。
   * 有了它，画布快照才能挂回「是哪一轮对话把图改成这样的」。
   */
  messageId?: string;
  /** 变更原因，决定快照在时间线上的标签 */
  reason?: SnapshotReason;
}

/** 快照产生原因（与 document/history.ts 同源，放在此处避免循环依赖） */
export type SnapshotReason =
  | 'ai-generate'
  | 'ai-edit'
  | 'user-edit'
  | 'user-layout'
  | 'import'
  | 'rollback'
  | 'init';

/** 支持被 LLM 生成的节点类型 */
export const GENERATABLE_NODE_TYPES = [
  'start',
  'end',
  'llm',
  'code',
  'http',
  'condition',
  'branches',
  'loop',
  'variable',
  'string-format',
  'assignee',
  'comment',
] as const;

export type GeneratableNodeType = (typeof GENERATABLE_NODE_TYPES)[number];
