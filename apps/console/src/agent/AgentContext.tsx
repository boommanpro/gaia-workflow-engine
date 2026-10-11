/**
 * Agent 全局状态 Context
 * 管理：会话列表、当前会话、消息流、对话编排
 *
 * 对话编排已改为「纯后端自治」：
 *   sendMessage 只负责把消息 POST 给后端触发一次异步 run，
 *   后端在服务端跑完整循环（含工具执行），过程事件经 SSE 推给本 Context 渲染。
 * 因此前端只是数据的订阅者与展示者 —— 多窗口共享同一会话，关窗执行继续。
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

import { agentApi } from './api';
import { liveStreamStore } from './live-stream-store';
import { subscribeSessionEvents } from './sse-client';
import { artifactStore } from './artifact-store';
import { getCurrentLocale } from '../i18n';
import { getCanvasContext } from './tools';
import { WorkflowDocument, workflowDocumentStore } from '../document';
import type {
  AgentSession,
  AgentMessage,
  DisplayMessage,
  ToolCallEvent,
  PageContext,
  ActivePlan,
  WorkFolder,
  SseHandlers,
  AgentArtifactDto,
} from './types';

/** 工具执行器接口（由 AgentDock 注入；后端自治模式下不再被对话循环使用） */
export interface ToolExecutor {
  execute(action: string, args: Record<string, any>): Promise<{ result: string; rejected: boolean }>;
}

interface AgentContextValue {
  dockOpen: boolean;
  setDockOpen: (open: boolean) => void;

  sessions: AgentSession[];
  currentSessionKey: string | null;
  messages: DisplayMessage[];
  streaming: boolean;
  /** 流式中的 live 助手消息 id（渲染层据此走 store 订阅渲染，null=无流式） */
  liveMessageId: string | null;
  queueLength: number;

  // 工作空间（文件夹分组的对话）
  folders: WorkFolder[];
  refreshFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<WorkFolder | void>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
  /** 会话移入/移出文件夹 */
  moveSessionToFolder: (sessionKey: string, folderId: number | null) => Promise<void>;
  /** 置顶 / 取消置顶 */
  pinSession: (sessionKey: string, pinned: boolean) => Promise<void>;
  /** 归档 / 取消归档 */
  archiveSession: (sessionKey: string, archived: boolean) => Promise<void>;

  // Token usage tracking (Task 2)
  tokenUsage: { estimated: number; limit: number };
  compactContext: () => Promise<void>;

  // Debug entries (Task 3)
  debugEntries: Array<{
    id: string;
    timestamp: number;
    request?: any;
    response?: any;
    context?: any;
    toolResults?: any;
  }>;
  clearDebugEntries: () => void;
  /** 调试面板是否打开 */
  debugPanelOpen: boolean;
  setDebugPanelOpen: (open: boolean) => void;
  /** 当前聚焦的调试条目 ID（点击消息跳转时设置） */
  focusDebugEntryId: string | null;
  /** 打开调试面板并聚焦到指定条目 */
  openDebugEntry: (entryId: string) => void;

  setToolExecutor: (executor: ToolExecutor) => void;

  createSession: (title?: string, opts?: { scope?: 'chat' | 'work'; folderId?: number | null }) => Promise<string>;
  switchSession: (sessionKey: string) => Promise<void>;
  renameSession: (sessionKey: string, title: string) => Promise<void>;
  deleteSession: (sessionKey: string) => Promise<void>;
  sendMessage: (text: string, images?: string[]) => Promise<void>;
  stopStreaming: () => void;

  // Subagent debug flow
  debugNode: (nodeId: string, instruction: string) => Promise<void>;

  /** 当前活跃的执行计划（后端自治模式下由后端持有，此处恒为 null，仅供兼容） */
  activePlan: ActivePlan | null;

  /** 画布加载完成时注入画布摘要（进入编辑器时自动读取画布配置） */
  injectCanvasInfo: (summary: { nodes: Array<{ id: string; type: string; title: string }>; edges: Array<{ from: string; to: string }> }) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

/** 后端消息 → 前端展示消息。
 *
 * 对话维度合并（DeepSeek 式单条回复）：后端按轮次落库（assistant 行 + tool 行），
 * 前端以 user 行为界把一次 run 的所有行合并成**一条**助手回复——
 * 多轮的正文拼接为正文，工具调用收进 toolSteps 在消息内折叠展示。 */
export function convertMessages(msgs: AgentMessage[]): DisplayMessage[] {
  // 先建立 tool_call_id → tool 结果 content 映射，用于回填工具步骤结果
  const toolResultMap = new Map<string, string>();
  for (const msg of msgs) {
    if (msg.role === 'tool' && msg.toolCallId) {
      toolResultMap.set(msg.toolCallId, msg.content || '');
    }
  }

  interface RunGroup {
    firstId: string;
    ts: number;
    contents: string[];
    thinkings: string[];
    steps: ToolCallEvent[];
    /** 真实调用链路的交错时间线（思考 → 工具 → 思考 → … → 正文） */
    timeline: import('./types').TimelineItem[];
  }
  const result: DisplayMessage[] = [];
  let group: RunGroup | null = null;

  const flush = () => {
    if (!group) return;
    const g = group;
    group = null;
    const content = g.contents.filter(Boolean).join('\n\n');
    const thinking = g.thinkings.filter(Boolean).join('\n\n');
    if (!content && !thinking && g.steps.length === 0) return;

    let planSteps: DisplayMessage['planSteps'];
    const planStep = g.steps.find((s) => s.action === 'todo_write' || s.action === 'createPlan');
    if (planStep && Array.isArray((planStep.args as any)?.steps)) {
      planSteps = ((planStep.args as any).steps as any[]).map((s: any, idx: number) => ({
        id: `plan-restored-${planStep.id}-${idx}`,
        intent: s.intent || s.description || `Step ${idx + 1}`,
        action: s.action || 'unknown',
        args: s.args || {},
        status: 'done' as const,
      }));
    }

    result.push({
      id: `run-${g.firstId}`,
      role: 'assistant',
      content,
      ...(thinking ? { thinking } : {}),
      ...(g.steps.length ? { toolSteps: g.steps } : {}),
      ...(planSteps ? { planSteps } : {}),
      ...(g.timeline.length ? { timeline: g.timeline } : {}),
      timestamp: g.ts,
    });
  };

  for (const msg of msgs) {
    const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
    if (msg.role === 'user') {
      flush();
      let images: string[] | undefined;
      if (msg.images) {
        try {
          const parsed = JSON.parse(msg.images);
          if (Array.isArray(parsed)) images = parsed;
        } catch { /* ignore */ }
      }
      result.push({
        id: `msg-${msg.id}`,
        role: 'user',
        content: msg.content || '',
        images,
        timestamp: ts,
      });
      continue;
    }
    if (msg.role === 'assistant') {
      if (!group) group = { firstId: `msg-${msg.id}`, ts, contents: [], thinkings: [], steps: [], timeline: [] };
      // 时间线按真实落库顺序推进：思考 → （正文若有）→ 工具调用 → …
      if (msg.thinking) {
        group.thinkings.push(msg.thinking);
        group.timeline.push({ kind: 'thinking', id: `thk-${msg.id}`, text: msg.thinking });
      }
      if (msg.content) {
        group.contents.push(msg.content);
        group.timeline.push({ kind: 'text', id: `txt-${msg.id}`, text: msg.content });
      }
      if (msg.toolCalls) {
        try {
          const tcs = JSON.parse(msg.toolCalls);
          for (const tc of tcs) {
            let args = {};
            try {
              args = JSON.parse(tc.function?.arguments || '{}');
            } catch { /* ignore */ }
            const toolResult = toolResultMap.get(tc.id);
            const step: ToolCallEvent = {
              id: tc.id,
              action: tc.function?.name || 'unknown',
              args,
              result: toolResult !== undefined ? toolResult.substring(0, 600) : undefined,
            };
            group.steps.push(step);
            group.timeline.push({ kind: 'tool', id: tc.id, call: step });
          }
        } catch { /* ignore */ }
      }
      continue;
    }
    if (msg.role === 'tool') {
      // 工具结果已按 toolCallId 回填进对应 run 的 toolSteps；
      // 只有孤儿结果（无 toolCallId）才单独成条
      if (!msg.toolCallId && msg.content) {
        flush();
        result.push({
          id: `msg-${msg.id}`,
          role: 'tool',
          content: msg.content,
          timestamp: ts,
        });
      }
      continue;
    }
  }
  flush();
  return result;
}

/**
 * 幂等合并：把 live 占位行接回历史加载结果之后（dsh 式「本地回声原子退场」的对位物）。
 *
 * getMessages 与 SSE 快照并发返回时，整表替换会抹掉已建立的 live 占位行 ——
 * 一旦抹掉，liveAssistantIdRef 悬空，后续 token 只进 store 而没有任何行去渲染它，
 * 流式内容不可见直到 done 兜底重载。历史行落位前先摘出 live 行，落位后原样接回，
 * 流式现场不丢。
 */
export function appendLiveRow(
  history: DisplayMessage[],
  liveRow: DisplayMessage | null | undefined
): DisplayMessage[] {
  if (!liveRow) return history;
  const existing = history.findIndex((m) => m.id === liveRow.id);
  if (existing >= 0) {
    const next = [...history];
    next[existing] = liveRow;
    return next;
  }
  return [...history, liveRow];
}

/** 用后端 plan 事件 upsert PlanCard 消息 */
function upsertPlanCard(prev: DisplayMessage[], plan: { id: string; steps: any[] }): DisplayMessage[] {
  const planSteps = (plan.steps || []).map((s: any, idx: number) => ({
    id: `plan-${plan.id}-${idx}`,
    intent: s.intent || s.description || `Step ${idx + 1}`,
    action: s.action || 'unknown',
    args: s.args || {},
    status: (s.status as any) || 'pending',
    result: s.result,
  }));
  const id = 'plan-live';
  const existingIdx = prev.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = { ...updated[existingIdx], planSteps };
    return updated;
  }
  return [...prev, { id, role: 'tool', content: '', planSteps, timestamp: Date.now() }];
}

/** 产物卡消息 id（live upsert 与历史重放共用，保证不重复渲染） */
function artifactCardId(artifact: AgentArtifactDto): string {
  return `artifact-${artifact.artifactKey}`;
}

/** 用产物事件 upsert 一张产物卡消息（test_report / release） */
function upsertArtifactCard(prev: DisplayMessage[], artifact: AgentArtifactDto): DisplayMessage[] {
  const id = artifactCardId(artifact);
  const existingIdx = prev.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = { ...updated[existingIdx], artifact };
    return updated;
  }
  return [...prev, { id, role: 'tool', content: '', artifact, timestamp: Date.now() }];
}

/**
 * 历史消息重放时，把会话产物里的 test_report / release 卡按时间戳插回消息流
 * （后端 artifact 没有直接挂 messageId，用「插在最后一条更早的消息后面」归位；
 * live 运行时的卡由 upsertArtifactCard 追加，两者通过同一消息 id 去重）。
 */
function placeArtifactCards(msgs: DisplayMessage[], artifacts: AgentArtifactDto[]): DisplayMessage[] {
  if (!artifacts || artifacts.length === 0) return msgs;
  const cardArts = artifacts.filter(
    (a) => (a.type === 'test_report' || a.type === 'release') && !msgs.some((m) => m.id === artifactCardId(a))
  );
  if (cardArts.length === 0) return msgs;
  let next = [...msgs];
  for (const art of cardArts) {
    const at = art.updatedAt ? new Date(art.updatedAt).getTime() : Date.now();
    let insertAt = next.length;
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].timestamp <= at) {
        insertAt = i + 1;
        break;
      }
    }
    const card: DisplayMessage = {
      id: artifactCardId(art),
      role: 'tool',
      content: '',
      artifact: art,
      timestamp: at,
    };
    next = [...next.slice(0, insertAt), card, ...next.slice(insertAt)];
  }
  return next;
}

/** 后端 navigate ui_action 参数 → 路由路径 */
function navigatePathFor(target: string, args: any): string | null {
  switch (target) {
    case 'home': return '/';
    case 'admin': return args?.tab === 'templates' ? '/admin/templates' : '/admin/workflows';
    case 'releases': return '/releases';
    case 'editor': return args?.workflowCode ? `/editor/${args.workflowCode}` : '/editor';
    case 'templateEditor': return `/template-editor/${args?.templateCode}`;
    default: return null;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [dockOpen, setDockOpen] = useState(false);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  /** 订阅重启信号：草稿会话物化为真实会话时递增，强制 SSE 订阅 effect 重跑 */
  const [sessionEpoch, setSessionEpoch] = useState(0);
  // 工作空间文件夹
  const [folders, setFolders] = useState<WorkFolder[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // 路由快照 ref：事件处理器内读当前路由用。订阅 effect 的 deps 不得包含
  // location.pathname —— 否则流式中跳转 = live 现场被 reset + 重连回放（时间线闪烁）
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  // Token usage tracking
  const [tokenUsage, setTokenUsage] = useState<{ estimated: number; limit: number }>({ estimated: 0, limit: 32768 });

  // Debug entries
  const [debugEntries, setDebugEntries] = useState<Array<{
    id: string;
    timestamp: number;
    request?: any;
    response?: any;
    context?: any;
    toolResults?: any;
  }>>([]);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [focusDebugEntryId, setFocusDebugEntryId] = useState<string | null>(null);
  const openDebugEntry = (entryId: string) => {
    setFocusDebugEntryId(entryId);
    setDebugPanelOpen(true);
  };

  // 兼容占位：后端自治模式下工具/计划/确认都在后端，前端不再执行
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  void setActivePlan;
  const toolExecutorRef = useRef<ToolExecutor | null>(null);

  // refs
  const currentSessionKeyRef = useRef<string | null>(null);
  const draftMetaRef = useRef<Map<string, { scope: 'chat' | 'work'; folderId: number | null }>>(new Map());
  // steering 计数：run 进行中发出、由后端 turn 边界注入的消息数（仅排队指示用）
  /** 当前正在流式渲染的助手占位消息 id */
  const liveAssistantIdRef = useRef<string | null>(null);
  const [liveMessageId, setLiveMessageId] = useState<string | null>(null);

  useEffect(() => {
    currentSessionKeyRef.current = currentSessionKey;
  }, [currentSessionKey]);

  // 刷新文件夹列表
  const refreshFolders = useCallback(async () => {
    try {
      const list = await agentApi.listFolders();
      setFolders(list || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refreshFolders();
  }, [refreshFolders]);

  /** 置顶 / 取消置顶 */
  const pinSession = useCallback(async (sessionKey: string, pinned: boolean) => {
    await agentApi.updateSessionFlags(sessionKey, { pinned });
    setSessions((prev) =>
      prev.map((s) => (s.sessionKey === sessionKey ? { ...s, pinned: pinned ? 1 : 0 } : s))
    );
  }, []);

  /** 归档 / 取消归档 */
  const archiveSession = useCallback(async (sessionKey: string, archived: boolean) => {
    await agentApi.updateSessionFlags(sessionKey, { archived });
    setSessions((prev) =>
      prev.map((s) => (s.sessionKey === sessionKey ? { ...s, archived: archived ? 1 : 0 } : s))
    );
  }, []);

  /** 会话移入/移出文件夹 */
  const moveSessionToFolder = useCallback(async (sessionKey: string, folderId: number | null) => {
    await agentApi.setSessionFolder(sessionKey, folderId);
    setSessions((prev) =>
      prev.map((s) => (s.sessionKey === sessionKey ? { ...s, folderId } : s))
    );
    void refreshFolders();
  }, [refreshFolders]);

  const createFolder = useCallback(async (name: string) => {
    const folder = await agentApi.createFolder(name);
    void refreshFolders();
    return folder;
  }, [refreshFolders]);

  const renameFolder = useCallback(async (id: number, name: string) => {
    await agentApi.renameFolder(id, name);
    void refreshFolders();
  }, [refreshFolders]);

  const deleteFolder = useCallback(async (id: number) => {
    await agentApi.deleteFolder(id);
    setSessions((prev) =>
      prev.map((s) => (s.folderId === id ? { ...s, folderId: null } : s))
    );
    void refreshFolders();
  }, [refreshFolders]);

  // 初始化：加载会话列表 + 默认权限 + 模型配置
  useEffect(() => {
    agentApi.listSessions().then((list) => {
      setSessions(list || []);
      if (list && list.length > 0) {
        setCurrentSessionKey(list[0].sessionKey);
      }
    }).catch(() => {});
    agentApi.listConfigs('llm_config').then((configs) => {
      if (configs && configs.length > 0) {
        try {
          const cfg = JSON.parse(configs[0].configData || '{}');
          if (cfg.contextWindow && cfg.contextWindow > 0) {
            setTokenUsage((prev) => ({ estimated: prev.estimated, limit: cfg.contextWindow }));
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  // 切换会话时加载消息、权限和产物（artifact store 全量替换）
  useEffect(() => {
    if (!currentSessionKey) return;
    const sessionKey = currentSessionKey;
    // 立刻清空上一段会话的消息：否则旧会话内容会一直显示到新请求返回，
    // 快速切换时旧请求晚到还会把别段会话的内容盖进当前对话框（跨会话串数据）
    setMessages([]);
    liveAssistantIdRef.current = null;
    // 运行状态机是全局单例，必须随会话切换复位。
    // 若旧会话 run 仍在进行，切回时订阅回放快照会重建 streaming 状态（关窗继续语义不变）。
    setQueueLength(0);
    setStreaming(false);
    // 画布文档是模块级单例，切会话必须清空：否则上一段会话的工作流画布
    // 会残留在产物面板里，误导用户以为是当前会话的产物
    workflowDocumentStore.clear();
    agentApi.getMessages(sessionKey).then((msgs) => {
      // 竞态 guard：只有仍是当前会话的响应才允许落地
      if (currentSessionKeyRef.current !== sessionKey) return;
      // 幂等合并：若 SSE 快照先到并建了 live 占位行，历史整表替换不得抹掉它
      setMessages((prev) => {
        const liveId = liveAssistantIdRef.current;
        const liveRow = liveId ? prev.find((m) => m.id === liveId) ?? null : null;
        return appendLiveRow(convertMessages(msgs || []), liveRow);
      });
    }).catch(() => {});
    agentApi.getArtifacts(sessionKey).then((arts) => {
      if (currentSessionKeyRef.current !== sessionKey) return;
      artifactStore.setAll(sessionKey, arts || []);
      setMessages((prev) => placeArtifactCards(prev, arts || []));
    }).catch(() => {});
  }, [currentSessionKey]);

  // 会话切换时从 localStorage 和后端 DB 加载调试历史
  const refreshDebugData = useCallback((sessionKey: string) => {
    agentApi.getDebugData(sessionKey).then((data) => {
      if (data && data.trim()) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDebugEntries(parsed);
            localStorage.setItem(`agent-debug-${sessionKey}`, data);
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentSessionKey) {
      setDebugEntries([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`agent-debug-${currentSessionKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDebugEntries(Array.isArray(parsed) ? parsed : []);
      } else {
        setDebugEntries([]);
      }
    } catch {
      setDebugEntries([]);
    }
    refreshDebugData(currentSessionKey);
  }, [currentSessionKey, refreshDebugData]);

  // 调试信息变更时持久化到 localStorage + 后端 DB（debounced）
  // 依赖里带上 currentSessionKey：切换会话时取消旧会话的挂起写入，防止把 A 会话的条目写进 B
  const debugSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentSessionKey || debugEntries.length === 0) return;
    const key = `agent-debug-${currentSessionKey}`;
    const json = JSON.stringify(debugEntries.slice(-50));
    try {
      localStorage.setItem(key, json);
    } catch {
      // ignore quota errors
    }
    if (debugSaveTimerRef.current) {
      clearTimeout(debugSaveTimerRef.current);
    }
    debugSaveTimerRef.current = setTimeout(() => {
      agentApi.saveDebugData(currentSessionKey, json).catch(() => {});
    }, 2000);
    return () => {
      if (debugSaveTimerRef.current) {
        clearTimeout(debugSaveTimerRef.current);
      }
    };
  }, [debugEntries, currentSessionKey]);

  const setToolExecutor = useCallback((executor: ToolExecutor) => {
    toolExecutorRef.current = executor;
  }, []);

  const getPageContextJson = useCallback((): string => {
    const ctx: PageContext = { route: location.pathname };

    const editorMatch = location.pathname.match(/^\/editor\/(.+)$/);
    if (editorMatch) {
      ctx.workflowCode = decodeURIComponent(editorMatch[1]);
    }

    const canvas = getCanvasContext();
    if (canvas) {
      try {
        const json = canvas.toJSON();
        if (json && Array.isArray(json.nodes)) {
          ctx.canvasSummary = {
            nodes: json.nodes.map((n: any) => ({
              id: n.id || '',
              type: n.type || '',
              title: n.data?.title || n.data?.name || n.title || '',
            })),
            edges: (json.edges || []).map((e: any) => ({
              from: e.sourceNodeID || e.source || '',
              to: e.targetNodeID || e.target || '',
              fromPort: e.sourcePortID || e.sourcePort,
            })),
            selectedNodeId: canvas.selectedNodeId,
          };
        }
      } catch {
        // canvas not ready, skip
      }
    }

    return JSON.stringify(ctx);
  }, [location.pathname]);

  const createSession = useCallback(async (title?: string, opts?: { scope?: 'chat' | 'work'; folderId?: number | null }) => {
    // 新建对话只生成本地草稿 key，不请求后端；首条消息发送时（postMessage）才真正创建会话
    const key = `draft-${nanoid(8)}`;
    draftMetaRef.current.set(key, {
      scope: opts?.scope || 'chat',
      folderId: opts?.folderId ?? null,
    });
    setCurrentSessionKey(key);
    setMessages([]);
    setDockOpen(true);
    return key;
  }, []);

  const switchSession = useCallback(async (sessionKey: string) => {
    if (currentSessionKeyRef.current && currentSessionKeyRef.current !== sessionKey) {
      draftMetaRef.current.delete(currentSessionKeyRef.current);
    }
    setCurrentSessionKey(sessionKey);
    setDockOpen(true);
  }, []);

  const renameSession = useCallback(async (sessionKey: string, title: string) => {
    await agentApi.renameSession(sessionKey, title);
    setSessions((prev) =>
      prev.map((s) => (s.sessionKey === sessionKey ? { ...s, title } : s))
    );
  }, []);

  const deleteSession = useCallback(async (sessionKey: string) => {
    await agentApi.deleteSession(sessionKey);
    setSessions((prev) => prev.filter((s) => s.sessionKey !== sessionKey));
    if (currentSessionKeyRef.current === sessionKey) {
      setCurrentSessionKey(null);
      setMessages([]);
    }
  }, []);

  /** 从后端 DB 重新加载消息（一轮结束 / 出错 / 会话切换后收敛 live 态）。
   *  onSettled 在历史成功落位后回调（done→reload 交接协议：落位前 live 行不摘除）。 */
  const reloadMessages = useCallback((sessionKey: string, opts?: { onSettled?: () => void }) => {
    agentApi.getMessages(sessionKey).then((msgs) => {
      // 仅在仍处于该会话时应用，避免跨会话串数据。
      // placeArtifactCards 必须在这里同步做：messages 与 artifacts 两个请求是并发的，
      // 若 artifacts 先返回 place 完成、messages 后返回直接覆盖，产物卡会被冲掉。
      if (currentSessionKeyRef.current === sessionKey) {
        setMessages((prev) => {
          const liveId = liveAssistantIdRef.current;
          const liveRow = liveId ? prev.find((m) => m.id === liveId) ?? null : null;
          return placeArtifactCards(appendLiveRow(convertMessages(msgs || []), liveRow), artifactStore.latestAll(sessionKey));
        });
        opts?.onSettled?.();
      }
    }).catch(() => {
      // 重载失败：保留 live 现场（store.timeline 内容仍完整可见），不摘占位
    });
    agentApi.listSessions().then((list) => {
      if (currentSessionKeyRef.current === sessionKey) {
        setSessions(list || []);
      }
    }).catch(() => {});
    // 产物同样收敛一轮（test_report / release 在 run 期间落库）
    agentApi.getArtifacts(sessionKey).then((arts) => {
      if (currentSessionKeyRef.current !== sessionKey) return;
      artifactStore.setAll(sessionKey, arts || []);
      setMessages((prev) => placeArtifactCards(prev, arts || []));
    }).catch(() => {});
  }, []);

  /**
   * run 收敛（done / error / stopped / run_state 终态统一入口）：
   * store 落定（endRun 关闭全部打开条目）→ 历史重载 → 落位成功后才摘除 live 占位行。
   * 交接期 live 行继续从 store.timeline 渲染完整内容 —— 消灭「done 后闪一帧空回复」。
   */
  const settleRun = useCallback((sessionKey: string) => {
    liveStreamStore.endRun();
    setStreaming(false);
    reloadMessages(sessionKey, {
      onSettled: () => {
        if (currentSessionKeyRef.current !== sessionKey) return;
        liveAssistantIdRef.current = null;
        setLiveMessageId(null);
      },
    });
  }, [reloadMessages]);

  /**
   * 直发一条消息给后端（steering 语义）：run 进行中时后端把它注入当前运行的
   * turn 边界（或收尾时链接成新 run）—— 前端不再排队等上一条跑完。
   */
  const postMessage = useCallback(async (sessionKey: string, text: string, images?: string[]) => {
    setStreaming(true);
    try {
      const res = await agentApi.startRun(sessionKey, text, getPageContextJson(), images, getCurrentLocale());
      if (res?.accepted && !liveStreamStore.getSnapshot().streaming) {
        // 受理即开现场：turn 事件晚到时 token/thinking 也已有落点（store.streaming 语义完整）
        liveStreamStore.beginRun();
      }
      if (!res?.accepted) {
        setStreaming(false);
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: 'assistant', content: `[错误] ${res?.error || '运行未受理'}`, timestamp: Date.now() },
        ]);
      }
      // 成功受理后：streaming / 渲染由 SSE 事件驱动（run 进行中则是 steering 注入）
    } catch (e) {
      setStreaming(false);
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: 'assistant', content: `[错误] ${(e as Error).message}`, timestamp: Date.now() },
      ]);
    }
  }, [getPageContextJson]);

  /** 发送消息：入队，串行触发后端自治运行 */
  const sendMessage = useCallback(
    async (text: string, images?: string[]) => {
      let sessionKey = currentSessionKeyRef.current;
      if (!sessionKey) return;

      // 草稿会话：发送前先创建正式会话（scope/folderId 来自草稿元信息），失败则不发送
      const draft = draftMetaRef.current.get(sessionKey);
      if (draft) {
        draftMetaRef.current.delete(sessionKey);
        try {
          const real = await agentApi.createSession(text.slice(0, 30), {
            scope: draft.scope,
            folderId: draft.folderId,
          });
          sessionKey = real.sessionKey;
          currentSessionKeyRef.current = sessionKey;
          setCurrentSessionKey(sessionKey);
          // 强制订阅 effect 重跑：草稿 → 真实会话的切换发生过「effect 因 draft- 前缀
          // 直接 return」的情况，仅靠 currentSessionKey 变化不足以保证 SSE 订阅重建，
          // 表现为门禁误判「无订阅者」而自动放行落版。epoch 变化是确定性触发源。
          setSessionEpoch((e) => e + 1);
          setSessions((prev) => [real, ...prev]);
          if (draft.scope === 'work') void refreshFolders();
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            { id: nanoid(), role: 'assistant', content: `[错误] ${(e as Error).message}`, timestamp: Date.now() },
          ]);
          return;
        }
      }

      // 乐观渲染用户消息
      const userMsg: DisplayMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      if (images && images.length > 0) {
        userMsg.images = images;
      }
      setMessages((prev) => [...prev, userMsg]);

      // steering：run 进行中直接发送，后端在 turn 边界注入；本地仅维护排队指示
      if (liveStreamStore.getSnapshot().streaming) setQueueLength((q) => q + 1);
      void postMessage(sessionKey, text, images);
    },
    [postMessage, refreshFolders]
  );

  /** 停止当前运行：通知后端停止（协作式中断，主循环在下一个检查点退出）。
   *  live 占位保留到 done/interrupted 事件触发 reload 落位后再摘除；
   *  后端 10s 内没有终态事件时兜底强制收敛（防占位行悬挂）。 */
  const stopStreaming = useCallback(() => {
    const sessionKey = currentSessionKeyRef.current;
    if (sessionKey && !sessionKey.startsWith('draft-')) {
      void agentApi.stopRun(sessionKey).catch(() => {});
    }
    setQueueLength(0);
    // 停止也是一轮结束：把已发生的 AI 变更定格为会话版本
    workflowDocumentStore.captureAiRunSnapshot(liveAssistantIdRef.current ?? undefined);
    liveStreamStore.endRun();
    setStreaming(false);
    if (sessionKey) {
      setTimeout(() => {
        if (currentSessionKeyRef.current === sessionKey && liveAssistantIdRef.current) {
          settleRun(sessionKey);
        }
      }, 10000);
    }
  }, [settleRun]);

  // ===== 会话画布草稿恢复 =====
  // 独立于订阅 effect：路由切换不再重建 SSE 订阅（旧实现 pathname 在订阅 deps 里，
  // 流式中跳转 = live 现场被 reset + 重连回放，表现为时间线闪烁）。
  // 编辑器（专家模式）页面画布是主位，由工作流加载流程管理，这里不恢复。
  useEffect(() => {
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    if (/^\/(editor|template-editor)/.test(location.pathname)) return;
    const sessionKey = currentSessionKey;
    let cancelled = false;
    agentApi.getSessionDocument(sessionKey).then((dsl) => {
      if (cancelled) return;
      if (dsl && Array.isArray(dsl.nodes) && dsl.nodes.length > 0) {
        try {
          workflowDocumentStore.replace(WorkflowDocument.fromJSON(dsl), {
            kind: 'replace',
            source: 'ai',
            reason: 'ai-edit',
          });
        } catch { /* ignore */ }
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentSessionKey, location.pathname]);

  // ===== 会话级后端自治运行的事件订阅 =====
  // 会话切换时建立 SSE 订阅；事件驱动消息渲染 / 文档同步 / 队列推进
  useEffect(() => {
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    const sessionKey = currentSessionKey;

    const controller = new AbortController();
    let disposed = false;

    const handlers: SseHandlers = {
      onOpen: () => {
        if (disposed) return;
        liveStreamStore.markConnected();
      },
      onRunState: (data) => {
        if (disposed) return;
        const status = data?.status;
        if (status === 'running') {
          setStreaming(true);
          // 守卫：已在流式中（SSE 重连的快照回放）不得重置 store ——
          // 否则挂起的 timeline/排队指示被清空，现场丢失
          if (!liveStreamStore.getSnapshot().streaming) liveStreamStore.beginRun();
          // 建立/复用 live 占位行（工具/正文一律以 store 时间线为唯一渲染源）
          if (!liveAssistantIdRef.current) {
            const id = `live-${data.runId || Date.now()}`;
            liveAssistantIdRef.current = id;
            setLiveMessageId(id);
            setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }]);
          }
          // 快照正文走 store（live 行从 store 渲染，state.content 流式期间不再逐 token 更新）。
          // 后端快照带交错时间线（思考/正文/工具/通知）时按真实顺序整体重建现场；
          // 旧后端（无 timeline 字段）退化为单条文本坍缩。
          const snapTimeline = (data as any).timeline || [];
          if (snapTimeline.length > 0) {
            liveStreamStore.applySnapshot(snapTimeline, data.assistantContent || '', (data as any).thinking || '');
          } else if ((data.assistantContent || '').length > 0) {
            liveStreamStore.replaceContent(data.assistantContent || '');
          }
          // 快照里的工具调用按序补进时间线（仅旧快照无 timeline 时需要；新快照已含工具条目）
          if (snapTimeline.length === 0) {
            for (const call of data.toolCalls || []) {
              if (!call?.id) continue;
              liveStreamStore.recordTool({ id: call.id, action: call.name, args: call.args ?? {} });
              if (call.result) liveStreamStore.resolveTool(call.id, String(call.result).substring(0, 600));
            }
          }
          // 快照里的产物列表（SessionEventBus 反哺）对齐 store（断线重连恢复现场）
          const snapshotArts = (data as any).artifacts || [];
          if (snapshotArts.length > 0) {
            artifactStore.setAll(sessionKey, snapshotArts);
            setMessages((prev) => placeArtifactCards(prev, snapshotArts));
          }
        } else {
          // idle / done / error / stopped
          // run 结束：本轮 AI 画布变更定格为一个会话版本（run 粒度），再走收敛协议
          workflowDocumentStore.captureAiRunSnapshot(liveAssistantIdRef.current ?? undefined);
          settleRun(sessionKey);
          if (status === 'error' && data.error) {
            // 运行失败发生在 SSE 订阅建立之前时，error 事件不会被实时收到，
            // 只能从订阅回放的 run_state 快照里恢复 —— 必须在这里渲染，否则表现为「没反应」
            const errText = `[错误] ${data.error}`;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.content === errText) return prev;
              return [...prev, { id: nanoid(), role: 'assistant', content: errText, timestamp: Date.now() }];
            });
          }
          if (status === 'done' || status === 'error' || status === 'stopped') {
            setQueueLength(0);
          }
        }
      },
      onTurn: (data) => {
        if (disposed) return;
        setStreaming(true);
        if (!liveStreamStore.getSnapshot().streaming) liveStreamStore.beginRun();
        liveStreamStore.flush();
        liveStreamStore.beginTurn(data.turn, data.maxTurns || 0, data.contextTokens);
        // 单条回复语义：轮次不再切分消息，只保证有 live 占位可承接流式内容
        if (liveAssistantIdRef.current) return;
        const id = `live-turn-${data.turn}`;
        liveAssistantIdRef.current = id;
        setLiveMessageId(id);
        setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }]);
      },
      onToken: (content) => {
        if (disposed) return;
        // 高频路径：不进 React state，只入 store 缓冲（三重 rAF 合帧发布）。
        // live 占位尚未建立时（模型先出 token 后出 turn 的边界），先补占位再缓冲。
        if (!liveAssistantIdRef.current) {
          const id = `live-${Date.now()}`;
          liveAssistantIdRef.current = id;
          setLiveMessageId(id);
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }]);
        }
        if (!liveStreamStore.getSnapshot().streaming) liveStreamStore.beginRun();
        liveStreamStore.appendContent(content);
      },
      onThinking: (data) => {
        // 思考过程同样走高频缓冲（三重 rAF 合帧），live 行从 store 渲染
        if (disposed) return;
        const chunk = data?.content || '';
        if (!chunk) return;
        if (!liveAssistantIdRef.current) {
          const id = `live-${Date.now()}`;
          liveAssistantIdRef.current = id;
          setLiveMessageId(id);
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }]);
        }
        if (!liveStreamStore.getSnapshot().streaming) liveStreamStore.beginRun();
        liveStreamStore.appendThinking(chunk);
      },
      onToolCall: (event) => {
        if (disposed) return;
        // 结构性事件：先把缓冲的流式内容发布出去（状态行立即反映当前工具）
        liveStreamStore.flush();
        // store 时间线是工具的唯一渲染源 —— 不再双写 m.toolSteps（双路渲染已移除）
        if (!liveStreamStore.getSnapshot().streaming) liveStreamStore.beginRun();
        liveStreamStore.markTool(event.action);
        liveStreamStore.recordTool({ id: event.id, action: event.action, args: event.args });
        // live 占位尚未建立时先建一条
        if (!liveAssistantIdRef.current) {
          const id = `live-${Date.now()}`;
          liveAssistantIdRef.current = id;
          setLiveMessageId(id);
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }]);
        }
      },
      onToolResult: (data) => {
        if (disposed) return;
        liveStreamStore.flush();
        liveStreamStore.markTool(null);
        liveStreamStore.resolveTool(data.toolCallId, (data.payload || '').substring(0, 600));
        const lid = liveAssistantIdRef.current;
        setMessages((prev) =>
          prev.map((m) => {
            // live 回复内的工具步骤原地更新结果
            if (lid && m.id === lid && m.toolSteps?.some((s) => s.id === data.toolCallId)) {
              return {
                ...m,
                toolSteps: m.toolSteps.map((s) =>
                  s.id === data.toolCallId
                    ? { ...s, result: (data.payload || '').substring(0, 200) }
                    : s
                ),
              };
            }
            // 兼容：无 live 占位时落下的独立工具卡
            if (m.id === `toolcall-${data.toolCallId}` && m.toolCall) {
              return { ...m, toolCall: { ...m.toolCall, result: (data.payload || '').substring(0, 600) } };
            }
            return m;
          })
        );
      },
      onPlan: (plan) => {
        if (disposed) return;
        setMessages((prev) => upsertPlanCard(prev, plan));
      },
      onDocument: (data) => {
        if (disposed) return;
        // 编辑器（专家模式）页面画布是主位，AI 的 document 事件同样不得整表替换 ——
        // 否则对话中的画布产物会把用户正在编辑的工作流覆盖掉
        if (/^\/(editor|template-editor)/.test(pathnameRef.current)) return;
        try {
          if (data?.dsl && Array.isArray(data.dsl.nodes) && data.dsl.nodes.length > 0) {
            workflowDocumentStore.replace(WorkflowDocument.fromJSON(data.dsl), {
              kind: 'replace',
              source: 'ai',
              reason: 'ai-edit',
              // 归因到当前流式助手消息：对话流里的画布快照卡才能挂到产出它的消息下
              messageId: liveAssistantIdRef.current ?? undefined,
            });
          }
        } catch { /* ignore */ }
      },
      onArtifact: (data) => {
        if (disposed) return;
        if (data?.action === 'upsert' && data.artifact?.artifactKey) {
          const art = data.artifact;
          artifactStore.upsert(sessionKey, art);
          // test_report / release 直接成为对话流里的产物卡
          if (art.type === 'test_report' || art.type === 'release') {
            setMessages((prev) => upsertArtifactCard(prev, art));
          }
        } else if (data?.action === 'state' && data.artifactKey) {
          artifactStore.updateStatus(sessionKey, data.artifactKey, data.status || '');
        }
      },
      onUiAction: (data) => {
        if (disposed) return;
        if (data?.type === 'navigate' && data.args?.target) {
          const path = navigatePathFor(data.args.target, data.args);
          // 带上来源路径：编辑器「返回」据此回到当前会话，而不是兜底首页
          if (path) navigateRef.current(path, { state: { from: pathnameRef.current } });
        }
      },
      onGuardNotice: (data) => {
        if (disposed) return;
        // 护栏/韧性事件（复读警报、wrap_up、重试、中断、压缩播报）进 live 时间线：
        // 循环失控的痕迹必须对用户可见，而不是静默发生在后端
        liveStreamStore.flush();
        if (data.message) liveStreamStore.addNotice(data.message, data.source, data as any);
      },
      onRunEnd: (data) => {
        if (disposed) return;
        // run_end：时间账小结 + 结构化失败链进 live 时间线（持久视图在调试面板「执行追踪」）。
        // done 事件先于 run_end 到达（后端 finally 里发），此时 live 时间线尚未销毁，尽力插入。
        liveStreamStore.flush();
        liveStreamStore.addRunSummary(data);
      },
      onAssistantSettled: (data) => {
        if (disposed) return;
        // run 收尾结算：done 事件随即触发 reloadMessages 从 DB 重建（现在带 toolCalls），
        // 这里只需把缓冲的流式内容落定，避免收尾文本闪烁丢失
        liveStreamStore.flush();
        void data;
      },
      onDone: () => {
        if (disposed) return;
        workflowDocumentStore.captureAiRunSnapshot(liveAssistantIdRef.current ?? undefined);
        settleRun(sessionKey);
        // 后端 run 收尾时才把调用日志写入 debug_data（在 done 事件之后），稍等片刻再拉取
        setTimeout(() => refreshDebugData(sessionKey), 1200);
        // steering 残留消息由后端链接式 run 继续（turn 事件会重新拉起 streaming）
        setQueueLength(0);
      },
      onError: (msg) => {
        if (disposed) return;
        workflowDocumentStore.captureAiRunSnapshot(liveAssistantIdRef.current ?? undefined);
        settleRun(sessionKey);
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: 'assistant', content: `[错误] ${msg}`, timestamp: Date.now() },
        ]);
        setTimeout(() => refreshDebugData(sessionKey), 1200);
        setQueueLength(0);
      },
    };

    // 断线自动重连：事件流中断后稍作退避重连，重连时后端会回放运行快照，
    // 因此「关窗期间跑完的 run」重新打开窗口也能立即收敛到最终状态。
    // 重连退避期间标记 reconnecting：UI 显式呈现「连接中断」而不是假装还在流式。
    const connect = async () => {
      while (!disposed) {
        try {
          await subscribeSessionEvents(sessionKey, handlers, controller.signal);
          if (disposed || controller.signal.aborted) break;
          // 流被服务端正常结束（极少）：短暂等待后重连
          liveStreamStore.markReconnecting();
          await sleep(1500);
        } catch (e) {
          if (disposed || controller.signal.aborted) break;
          liveStreamStore.markReconnecting();
          console.warn('[agent] session event stream error, reconnecting...', e);
          await sleep(2000);
        }
      }
    };
    void connect();

    return () => {
      disposed = true;
      controller.abort();
      liveStreamStore.reset();
    };
  }, [currentSessionKey, sessionEpoch, reloadMessages, settleRun]);

  /** 压缩上下文：前半段历史摘要为「前情摘要」，压缩后重新加载消息 */
  const compactContext = useCallback(async () => {
    const sessionKey = currentSessionKeyRef.current;
    if (!sessionKey) return;
    try {
      const result = await agentApi.compactSession(sessionKey);
      if (result?.message) {
        console.info('[agent] compact:', result.message);
      }
      reloadMessages(sessionKey);
    } catch (e) {
      console.error('Compact failed:', e);
    }
  }, [reloadMessages]);

  /** 画布加载完成时注入画布摘要（兼容保留；画布摘要经 getPageContextJson 随每次 run 提交） */
  const injectCanvasInfo = useCallback(
    (summary: { nodes: Array<{ id: string; type: string; title: string }>; edges: Array<{ from: string; to: string }> }) => {
      void summary;
    },
    []
  );

  /** Subagent debug flow: triggers a subagent SSE session for a node debug task */
  const debugNode = useCallback(
    async (nodeId: string, instruction: string) => {
      const sessionKey = currentSessionKeyRef.current || `debug-${Date.now()}`;
      const subagentSessionKey = `subagent-${sessionKey}-${nodeId}-${Date.now()}`;

      const msgId = nanoid();
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: 'tool', content: '', subagentSteps: [], timestamp: Date.now() },
      ]);

      try {
        const { streamSubagent } = await import('./sse-client');
        await streamSubagent(subagentSessionKey, instruction, getPageContextJson(), {
          onToken: () => { /* ignore streaming text for subagent */ },
          onSubagentToolCall: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      subagentSteps: [
                        ...(m.subagentSteps || []),
                        { action: data.action, args: data.args, status: 'running' as const },
                      ],
                    }
                  : m
              )
            );
          },
          onSubagentRoundDone: () => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== msgId || !m.subagentSteps) return m;
                const steps = [...m.subagentSteps];
                if (steps.length > 0) {
                  steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'done' as const };
                }
                return { ...m, subagentSteps: steps };
              })
            );
          },
          onSubagentFinalResult: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, subagentResult: { success: true, content: data.content } }
                  : m
              )
            );
          },
          onSubagentDone: () => {},
          onError: (msg) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, subagentResult: { success: false, content: msg } }
                  : m
              )
            );
          },
        });
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, subagentResult: { success: false, content: (e as Error).message } }
              : m
          )
        );
      }
    },
    [getPageContextJson]
  );

  const value: AgentContextValue = {
    dockOpen,
    setDockOpen,
    sessions,
    currentSessionKey,
    messages,
    streaming,
    liveMessageId,
    queueLength,
    folders,
    refreshFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveSessionToFolder,
    pinSession,
    archiveSession,
    tokenUsage,
    compactContext,
    debugEntries,
    clearDebugEntries: () => setDebugEntries([]),
    debugPanelOpen,
    setDebugPanelOpen,
    focusDebugEntryId,
    openDebugEntry,
    setToolExecutor,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    stopStreaming,
    debugNode,
    activePlan,
    injectCanvasInfo,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
