/**
 * 画布上下文桥 —— editor / 工作区把当前画布实例注入这里，
 * AgentContext 据此生成页面上下文摘要（选中节点、画布 JSON）。
 */
/** 画布上下文（由 editor 页面注入） */
export interface CanvasContext {
  /** 获取画布 JSON */
  toJSON: () => any;
  /** 通过类型创建节点 */
  createNodeByType: (type: string, position: { x: number; y: number } | undefined, data: any, parentId?: string) => any;
  /** 按 ID 获取节点 */
  getNodeById: (id: string) => any;
  /** 删除节点 */
  deleteNode: (id: string) => void;
  /** 添加连线 */
  addLine: (line: { sourceNodeID: string; targetNodeID: string; sourcePortID?: string }) => void;
  /** 删除连线 */
  removeLine: (from: string, to: string) => void;
  /** 自动布局 */
  autoLayout: () => void;
  /** Deep merge node data (arrays replaced wholesale) */
  updateNodeData: (nodeId: string, data: Record<string, any>) => boolean;
  /** Get available variables grouped by source node */
  getAvailableVariables: () => Array<{
    nodeId: string;
    nodeTitle: string;
    nodeType: string;
    outputs: Array<{ name: string; type: string }>;
  }>;
  /** Run the entire workflow (opens test run panel) */
  runWorkflow: (inputs?: Record<string, any>) => Promise<{ success: boolean; result?: any; error?: string }>;
  /** Run a single node (opens single node test panel) */
  runNode: (nodeId: string, inputs?: Record<string, any>) => Promise<{ success: boolean; result?: any; error?: string }>;
  /** 选中的节点 ID */
  selectedNodeId?: string;
}

let canvasCtx: CanvasContext | null = null;

export function setCanvasContext(ctx: CanvasContext | null): void {
  canvasCtx = ctx;
}

export function getCanvasContext(): CanvasContext | null {
  return canvasCtx;
}
