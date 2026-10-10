/**
 * Agent 对话类型定义
 */

/** 会话 */
export interface AgentSession {
  id?: number;
  sessionKey: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  // 工作空间 / 列表增强
  scope?: string;      // chat / work，两套逻辑隔离
  folderId?: number | null;
  pinned?: number;     // 0/1
  archived?: number;   // 0/1
  // 人工审查标记
  reviewRating?: string | null;   // good / bad / null
  reviewIssue?: string | null;
  reviewStatus?: string;          // pending / analyzing / fixed / ignored
  reviewFixNote?: string | null;
  // 双引擎架构：local（自研编排，默认）/ ark（火山方舟 Managed Agents 托管）
  engine?: string;
  remoteSessionId?: string | null;
  /** 累计 token 用量（engine=ark 时由后端聚合） */
  tokenUsage?: string | null;
}

/** 工作空间文件夹 */
export interface WorkFolder {
  id: number;
  name: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  sessionCount?: number;
}

/** 权限策略 */
export type PermissionPolicy = 'always' | 'confirm' | 'forbid';

/** 消息 */
export interface AgentMessage {
  id?: number;
  sessionKey: string;
  role: 'user' | 'assistant' | 'tool';
  content?: string;
  toolCalls?: string;
  /** 思考过程（assistant 消息持久化的 reasoning 输出，回放折叠展示） */
  thinking?: string;
  toolCallId?: string;
  pageContext?: string;
  /** 多模态图片（JSON 字符串数组，仅 user 消息） */
  images?: string;
  createdAt?: string;
}

/** 工具调用事件（SSE tool_call） */
export interface ToolCallEvent {
  id: string;
  action: string;
  args: Record<string, any>;
  policy: PermissionPolicy;
  /** 执行位置：backend（本服务）/ ark-sandbox（方舟云沙箱）/ ark-mcp（方舟 MCP 工具） */
  executedBy?: string;
  /** 执行结果（执行完成后原地更新） */
  result?: string;
}

/** Plan 步骤 */
export interface PlanStep {
  id: string;
  intent: string;
  action: string;
  args?: Record<string, any>;
  status: 'pending' | 'running' | 'done' | 'error' | 'testing' | 'testFailed';
  result?: string;
}

/** 活跃的执行计划（todo 机制） */
export interface ActivePlan {
  id: string;
  steps: PlanStep[];
  /** 跟踪 addNode 返回的 nodeId，供 connect 步骤 $0/$1 占位符解析 */
  createdNodeIds: string[];
}

/** 页面上下文 */
export interface PageContext {
  route: string;
  workflowCode?: string;
  canvasSummary?: {
    nodes: { id: string; type: string; title: string }[];
    edges: { from: string; to: string; fromPort?: string }[];
    selectedNodeId?: string;
  };
}

/** 产物（与后端 agent_artifact 表 / SessionArtifactStore.toPublicJson 对应） */
export interface AgentArtifactDto {
  artifactKey: string;
  sessionKey?: string;
  runId?: string;
  type: 'workflow' | 'plan' | 'test_report' | 'release';
  status: string;
  title?: string;
  summary?: string;
  version: number;
  payload?: any;
  createdAt?: string;
  updatedAt?: string;
}

/** 前端展示的消息（含 plan 卡片等扩展） */
export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCall?: ToolCallEvent;
  planSteps?: PlanStep[];
  timestamp: number;
  // New: for multimodal images
  images?: string[];
  /** New: for debug panel */
  debugInfo?: {
    request?: any;
    response?: any;
  };
  /** 产物卡（test_report / release）：由 artifact 事件 upsert，key 即消息 id 的一部分 */
  artifact?: AgentArtifactDto;
  /**
   * 本条回复内合并的工具调用（DeepSeek 式单条回复）：
   * 一次 run 的所有 tool_call 不再各自成卡，而是折进这条助手消息里按序折叠展示。
   */
  toolSteps?: ToolCallEvent[];
  // 关联的调试条目 ID，用于点击消息跳转调试面板
  debugEntryId?: string;
  // New: for subagent
  subagentSteps?: Array<{
    action: string;
    args?: any;
    status: 'pending' | 'running' | 'done' | 'error';
    result?: string;
  }>;
  subagentResult?: {
    success: boolean;
    content: string;
  };
  /** 思考过程增量累积（方舟托管引擎 agent.thinking 事件；可折叠展示） */
  thinking?: string;
  /**
   * 时间线（真实调用链路的交错顺序：思考 → 工具 → 思考 → 工具 → 正文）。
   * 历史（convertMessages 构建）与 live（live-stream-store）共用该结构；
   * 渲染层优先用 timeline，缺失时回退到 content/thinking/toolSteps 合并视图。
   */
  timeline?: TimelineItem[];
}

/** 时间线条目：kind 决定渲染样式 */
export type TimelineItem =
  | { kind: 'thinking'; id: string; text: string }
  | { kind: 'tool'; id: string; call: ToolCallEvent; startedAt?: number; endedAt?: number }
  | { kind: 'text'; id: string; text: string };

/** SSE 事件处理器 */
export interface SseHandlers {
  onToken?: (content: string) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  // New debug events
  onDebugRequest?: (data: { messages: any[]; model: string; temperature: number; timestamp: number }) => void;
  onDebugResponse?: (data: { content: string; toolCalls: any[]; toolCallsCount: number; durationMs: number }) => void;
  /** 工具执行结果调试事件 — 展示每个 tool_call 的实际执行结果 */
  onDebugToolResult?: (data: { results: Array<{ toolCallId: string; rejected: boolean; result: string }>; count: number }) => void;
  /** 上下文加载详情 — 展示本次请求加载了哪些工具/知识/图谱 */
  onContextLoaded?: (data: {
    model: string;
    apiHost: string;
    temperature: number;
    maxTokens: number;
    contextWindow: number;
    historyMessages: number;
    systemPromptChars: number;
    ragChunks: number;
    ragMs: number;
    ragContext?: string;
    nodeKbCount?: number;
    nodeKbMs?: number;
    nodeKbContext?: string;
    graphNodes: number;
    graphMs: number;
    graphContext?: string;
    toolsCount: number;
    toolsMs: number;
    totalMessages: number;
    estimatedTokens: number;
    tokenPercentage: number;
  }) => void;
  /** Token 用量警告 — 上下文达到 80% 时触发 */
  onTokenWarning?: (data: { percentage: number; estimated: number; limit: number; message: string }) => void;
  // New subagent events
  onSubagentToolCall?: (data: { id: string; action: string; args: any }) => void;
  onSubagentRoundDone?: (data: { round: number; toolCalls: number }) => void;
  onSubagentFinalResult?: (data: { content: string }) => void;
  onSubagentDone?: () => void;
  // New: 会话级后端自治运行事件（纯后端 / 多窗口 / 关窗继续）
  /** 订阅连接建立时回放的运行快照 */
  onRunState?: (data: {
    status: string;        // running / done / error / stopped / idle
    phase?: string;        // llm / tools / done
    runId?: string;
    sessionKey?: string;
    turn?: number;
    assistantContent?: string;
    toolCalls?: Array<{ id: string; name: string; args: any; status?: string; result?: string }>;
    error?: string;
  }) => void;
  /** 新回合开始 */
  onTurn?: (data: { turn: number; maxTurns?: number }) => void;
  /** 工具执行结果（后端执行，无需前端回灌） */
  onToolResult?: (data: { toolCallId: string; name?: string; rejected?: boolean; payload?: string }) => void;
  /** 执行计划（createPlan 产出，PlanCard 渲染） */
  onPlan?: (data: { id: string; steps: any[]; createdNodeIds?: string[] }) => void;
  /** 服务端画布文档快照（前端据此重渲染产物） */
  onDocument?: (data: { dsl: any }) => void;
  /** 产物事件（SessionArtifactStore 广播）：upsert 全量 / state 仅状态迁移 */
  onArtifact?: (data: { action: 'upsert' | 'state'; artifact?: AgentArtifactDto; artifactKey?: string; status?: string }) => void;
  /** 需要前端配合的 UI 指令（如 navigate 跳转） */
  onUiAction?: (data: { type: string; args: any }) => void;
  /** 工具确认请求（confirm 策略）：mode=require 时需前端弹窗，其余为后端自动决策的通知 */
  onConfirmRequest?: (data: {
    toolCallId: string;
    action: string;
    args: Record<string, any>;
    mode?: string;       // require / auto-approve / auto-reject
    decision?: string;   // approved / rejected（非 require 模式由后端直接给出）
  }) => void;
  /** 工具确认已裁决（require 模式下等待结束后广播） */
  onConfirmResolved?: (data: { toolCallId: string; approved: boolean }) => void;
  /** 思考过程增量（方舟托管引擎的 agent.thinking 事件） */
  onThinking?: (data: { content: string }) => void;
  /** 模型请求用量（方舟托管引擎的 span.model_request_end 聚合） */
  onUsage?: (data: {
    last?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number };
    total: Record<string, number>;
  }) => void;
}
