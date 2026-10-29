/**
 * 会话运行时状态形状 —— reducer / store / 选择器共用的单一类型定义。
 */
import type { AgentArtifactDto, DisplayMessage, TimelineItem } from '../types';

export type ConnectionState = 'idle' | 'connected' | 'reconnecting';

export interface RuntimeState {
  sessionKey: string | null;
  /** SSE 连接状态：断线重连期间 UI 显式呈现，不得冒充流式中 */
  connection: ConnectionState;
  /** 已应用的最新事件 seq（Last-Event-ID 续传游标；0 = 尚未收到任何带序号事件） */
  lastSeq: number;

  // ---- 运行态 ----
  streaming: boolean;
  /** 用户已请求停止、等待后端终态确认：停止中不算已停止 */
  stopping: boolean;
  runId: string | null;
  startedAt: number;
  /** 最近一次事件到达时间戳（「卡死中」判定：streaming 且 >90s 无事件） */
  lastEventAt: number;
  turn: number;
  maxTurns: number;
  contextTokens: number;
  currentTool: string | null;

  // ---- 流式现场（live 行的唯一渲染源） ----
  /** 交错时间线（真实调用链路顺序：思考 → 工具 → 思考 → … → 正文） */
  timeline: TimelineItem[];
  content: string;
  thinking: string;

  // ---- 会话消息（历史 + live 占位 + ask 卡 + 产物卡） ----
  messages: DisplayMessage[];
  liveMessageId: string | null;
  /** 正在拉取整段会话历史（会话切换的加载占位依据；此刻 messages 为空是「加载中」而非「空会话」） */
  historyLoading: boolean;

  // ---- 产物（当前会话） ----
  artifacts: AgentArtifactDto[];

  // ---- 画布版本跟踪（DSL 本体在 workflowDocumentStore，这里只跟版本与失步标记） ----
  docVersion: number;
  /** 增量事件对不上本地版本：宿主应 GET /document 拉全量 */
  docDesync: boolean;

  /** steering 排队指示 */
  queueLength: number;
}
