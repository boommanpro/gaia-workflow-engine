/**
 * Agent 全局状态 Context
 * 管理：会话列表、当前会话、消息流、权限配置、对话编排
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
import { subscribeSessionEvents } from './sse-client';
import { getCurrentLocale } from '../i18n';
import { getCanvasContext } from './tools';
import { WorkflowDocument, workflowDocumentStore } from '../document';
import type {
  AgentSession,
  AgentMessage,
  DisplayMessage,
  PermissionPolicy,
  ToolCallEvent,
  PageContext,
  ActivePlan,
  WorkFolder,
  SseHandlers,
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
  permissions: Record<string, PermissionPolicy>;
  streaming: boolean;
  queueLength: number;
  pendingConfirm: ToolCallEvent | null;

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
  resolveConfirm: (approved: boolean) => void;

  createSession: (title?: string, opts?: { scope?: 'chat' | 'work'; folderId?: number | null }) => Promise<string>;
  switchSession: (sessionKey: string) => Promise<void>;
  renameSession: (sessionKey: string, title: string) => Promise<void>;
  deleteSession: (sessionKey: string) => Promise<void>;
  sendMessage: (text: string, images?: string[]) => Promise<void>;
  stopStreaming: () => void;
  updatePermission: (action: string, policy: PermissionPolicy) => Promise<void>;
  updateGlobalPermission: (action: string, policy: PermissionPolicy) => Promise<void>;

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

/** 后端消息 → 前端展示消息 */
export function convertMessages(msgs: AgentMessage[]): DisplayMessage[] {
  // 先建立 tool_call_id → tool 结果 content 映射，用于回填 toolCall.result
  const toolResultMap = new Map<string, string>();
  for (const msg of msgs) {
    if (msg.role === 'tool' && msg.toolCallId) {
      toolResultMap.set(msg.toolCallId, msg.content || '');
    }
  }

  const result: DisplayMessage[] = [];
  for (const msg of msgs) {
    const ts = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
    if (msg.role === 'user') {
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
    } else if (msg.role === 'assistant') {
      if (msg.content) {
        result.push({
          id: `msg-${msg.id}`,
          role: 'assistant',
          content: msg.content,
          timestamp: ts,
        });
      }
      if (msg.toolCalls) {
        try {
          const tcs = JSON.parse(msg.toolCalls);
          for (const tc of tcs) {
            let args = {};
            try {
              args = JSON.parse(tc.function?.arguments || '{}');
            } catch { /* ignore */ }
            // 从映射中回填执行结果，使刷新后工具卡片显示正确状态（done/error）
            const toolResult = toolResultMap.get(tc.id);
            const actionName = tc.function?.name || 'unknown';

            // createPlan: 从 args.steps 重建 planSteps，使刷新后 PlanCard 仍能展示
            let planSteps: DisplayMessage['planSteps'];
            const argsMap = args as Record<string, any>;
            if (actionName === 'createPlan' && Array.isArray(argsMap.steps)) {
              planSteps = argsMap.steps.map((s: any, idx: number) => ({
                id: `plan-restored-${msg.id}-${idx}`,
                intent: s.intent || s.description || `Step ${idx + 1}`,
                action: s.action || 'unknown',
                args: s.args || {},
                status: 'done' as const,
              }));
            }

            result.push({
              id: `msg-${msg.id}-tool-${tc.id}`,
              role: 'tool',
              content: '',
              toolCall: {
                id: tc.id,
                action: actionName,
                args,
                policy: 'always',
                result: toolResult !== undefined ? toolResult.substring(0, 200) : undefined,
              },
              planSteps,
              timestamp: ts,
            });
          }
        } catch { /* ignore */ }
      }
    } else if (msg.role === 'tool') {
      // tool 结果已通过上面的映射回填到对应 toolCall.result，这里跳过单独渲染
      // 仅当该 tool 消息没有对应 toolCallId 时（孤儿结果）才单独展示
      if (!msg.toolCallId) {
        result.push({
          id: `msg-${msg.id}`,
          role: 'tool',
          content: msg.content || '',
          timestamp: ts,
        });
      }
    }
  }
  return result;
}

/** 把一个后端 tool_call 事件 upsert 成工具卡片消息 */
function upsertToolCard(prev: DisplayMessage[], event: ToolCallEvent): DisplayMessage[] {
  const id = `toolcall-${event.id}`;
  const existingIdx = prev.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = { ...updated[existingIdx], toolCall: { ...updated[existingIdx].toolCall, ...event } };
    return updated;
  }
  return [...prev, { id, role: 'tool', content: '', toolCall: event, timestamp: Date.now() }];
}

/** 用运行快照里的工具调用批量 upsert（订阅建立 / 重连时） */
function upsertLiveToolCalls(
  prev: DisplayMessage[],
  calls: Array<{ id: string; name: string; args: any; status?: string; result?: string }>
): DisplayMessage[] {
  let next = prev;
  for (const call of calls) {
    if (!call?.id) continue;
    next = upsertToolCard(next, {
      id: call.id,
      action: call.name,
      args: call.args ?? {},
      policy: 'always',
      result: call.result ? call.result.substring(0, 200) : undefined,
    });
  }
  return next;
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
  const [permissions, setPermissions] = useState<Record<string, PermissionPolicy>>({});
  const [streaming, setStreaming] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [pendingConfirm, setPendingConfirm] = useState<ToolCallEvent | null>(null);
  // 工作空间文件夹
  const [folders, setFolders] = useState<WorkFolder[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

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
  const messageQueueRef = useRef<Array<{ sessionKey: string; text: string; images?: string[] }>>([]);
  const processingRef = useRef<boolean>(false);
  /** 当前正在流式渲染的助手占位消息 id */
  const liveAssistantIdRef = useRef<string | null>(null);

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
    agentApi.getPermissionDefaults().then(setPermissions).catch(() => {});
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

  // 切换会话时加载消息和权限
  useEffect(() => {
    if (!currentSessionKey) return;
    agentApi.getMessages(currentSessionKey).then((msgs) => {
      setMessages(convertMessages(msgs || []));
    }).catch(() => {});
    agentApi.getPermissions(currentSessionKey).then(setPermissions).catch(() => {});
  }, [currentSessionKey]);

  // 会话切换时从 localStorage 和后端 DB 加载调试历史
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
    agentApi.getDebugData(currentSessionKey).then((data) => {
      if (data && data.trim()) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDebugEntries(parsed);
            localStorage.setItem(`agent-debug-${currentSessionKey}`, data);
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [currentSessionKey]);

  // 调试信息变更时持久化到 localStorage + 后端 DB（debounced）
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
  }, [debugEntries]);

  const setToolExecutor = useCallback((executor: ToolExecutor) => {
    toolExecutorRef.current = executor;
  }, []);

  const resolveConfirm = useCallback((approved: boolean) => {
    const sessionKey = currentSessionKeyRef.current;
    const pending = pendingConfirm;
    setPendingConfirm(null);
    // 把裁决结果回传后端，唤醒 require 模式挂起的工具调用
    if (!sessionKey || !pending) return;
    agentApi.confirmTool(sessionKey, pending.id, approved).catch(() => {});
  }, [pendingConfirm]);

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
    // 新建对话只生成本地草稿 key，不请求后端；首条消息发送时（drainQueue）才真正创建会话
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

  const updatePermission = useCallback(async (action: string, policy: PermissionPolicy) => {
    setPermissions((prev) => ({ ...prev, [action]: policy }));
    if (currentSessionKey) {
      await agentApi.updatePermission(currentSessionKey, action, policy);
    }
  }, [currentSessionKey]);

  const updateGlobalPermission = useCallback(async (action: string, policy: PermissionPolicy) => {
    await agentApi.updateGlobalPermission(action, policy);
  }, []);

  /** 从后端 DB 重新加载消息（一轮结束 / 出错 / 会话切换后收敛 live 态） */
  const reloadMessages = useCallback((sessionKey: string) => {
    agentApi.getMessages(sessionKey).then((msgs) => {
      // 仅在仍处于该会话时应用，避免跨会话串数据
      if (currentSessionKeyRef.current === sessionKey) {
        setMessages(convertMessages(msgs || []));
      }
    }).catch(() => {});
    agentApi.listSessions().then((list) => {
      if (currentSessionKeyRef.current === sessionKey) {
        setSessions(list || []);
      }
    }).catch(() => {});
  }, []);

  /** 串行消费消息队列：每条消息触发一次后端自治 run */
  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    const item = messageQueueRef.current.shift();
    if (!item) return;
    processingRef.current = true;
    setQueueLength(messageQueueRef.current.length);
    setStreaming(true);
    try {
      const res = await agentApi.startRun(
        item.sessionKey,
        item.text,
        getPageContextJson(),
        item.images,
        getCurrentLocale()
      );
      if (!res?.accepted) {
        setStreaming(false);
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: 'assistant', content: `[错误] ${res?.error || '运行未受理'}`, timestamp: Date.now() },
        ]);
        processingRef.current = false;
        setQueueLength(messageQueueRef.current.length);
        void drainQueue();
        return;
      }
      // 成功受理后：streaming / 渲染由 SSE 事件驱动；done/error 事件会调用 drainQueue 继续
    } catch (e) {
      setStreaming(false);
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: 'assistant', content: `[错误] ${(e as Error).message}`, timestamp: Date.now() },
      ]);
      processingRef.current = false;
      setQueueLength(messageQueueRef.current.length);
      void drainQueue();
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

      messageQueueRef.current.push({ sessionKey, text, images });
      setQueueLength(messageQueueRef.current.length);
      void drainQueue();
    },
    [drainQueue, refreshFolders]
  );

  /** 停止当前运行：通知后端停止 + 清空队列（后端线程自然结束） */
  const stopStreaming = useCallback(() => {
    const sessionKey = currentSessionKeyRef.current;
    if (sessionKey && !sessionKey.startsWith('draft-')) {
      void agentApi.stopRun(sessionKey).catch(() => {});
    }
    messageQueueRef.current = [];
    setQueueLength(0);
    processingRef.current = false;
    liveAssistantIdRef.current = null;
    setStreaming(false);
  }, []);

  // ===== 会话级后端自治运行的事件订阅 =====
  // 会话切换时建立 SSE 订阅；事件驱动消息渲染 / 文档同步 / 队列推进
  useEffect(() => {
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    const sessionKey = currentSessionKey;

    // 会话切换时恢复服务端画布草稿（产物渲染）
    agentApi.getSessionDocument(sessionKey).then((dsl) => {
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

    const controller = new AbortController();
    let disposed = false;

    const handlers: SseHandlers = {
      onRunState: (data) => {
        if (disposed) return;
        const status = data?.status;
        if (status === 'running') {
          setStreaming(true);
          // 用快照内容建立/同步当前助手占位
          setMessages((prev) => {
            if (liveAssistantIdRef.current) {
              const idx = prev.findIndex((m) => m.id === liveAssistantIdRef.current);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], content: data.assistantContent ?? updated[idx].content };
                return updated;
              }
            }
            const id = `live-${data.runId || Date.now()}`;
            liveAssistantIdRef.current = id;
            return [...prev, { id, role: 'assistant', content: data.assistantContent || '', timestamp: Date.now() }];
          });
          // 用快照里的工具调用 upsert 工具卡片（重连恢复现场）
          const snapshotCalls = data.toolCalls || [];
          if (snapshotCalls.length > 0) {
            setMessages((prev) => upsertLiveToolCalls(prev, snapshotCalls));
          }
        } else {
          // idle / done / error / stopped
          liveAssistantIdRef.current = null;
          setStreaming(false);
          if (status === 'done' || status === 'error' || status === 'stopped') {
            reloadMessages(sessionKey);
            // 队列里还有消息则继续（如断线重连后补齐 done）
            processingRef.current = false;
            setQueueLength(messageQueueRef.current.length);
            void drainQueue();
          }
        }
      },
      onTurn: (data) => {
        if (disposed) return;
        setStreaming(true);
        setMessages((prev) => {
          // 若当前占位仍是空内容（订阅快照建立的那个），直接复用为这一轮
          if (liveAssistantIdRef.current) {
            const existing = prev.find((m) => m.id === liveAssistantIdRef.current);
            if (existing && !existing.content) {
              return prev;
            }
          }
          const id = `live-turn-${data.turn}`;
          liveAssistantIdRef.current = id;
          return [...prev, { id, role: 'assistant', content: '', timestamp: Date.now() }];
        });
      },
      onToken: (content) => {
        if (disposed) return;
        setMessages((prev) => {
          if (liveAssistantIdRef.current) {
            return prev.map((m) =>
              m.id === liveAssistantIdRef.current ? { ...m, content: m.content + content } : m
            );
          }
          const id = `live-${Date.now()}`;
          liveAssistantIdRef.current = id;
          return [...prev, { id, role: 'assistant', content, timestamp: Date.now() }];
        });
      },
      onToolCall: (event) => {
        if (disposed) return;
        setMessages((prev) => upsertToolCard(prev, event));
      },
      onToolResult: (data) => {
        if (disposed) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `toolcall-${data.toolCallId}` && m.toolCall
              ? { ...m, toolCall: { ...m.toolCall, result: (data.payload || '').substring(0, 200) } }
              : m
          )
        );
      },
      onPlan: (plan) => {
        if (disposed) return;
        setMessages((prev) => upsertPlanCard(prev, plan));
      },
      onDocument: (data) => {
        if (disposed) return;
        try {
          if (data?.dsl && Array.isArray(data.dsl.nodes) && data.dsl.nodes.length > 0) {
            workflowDocumentStore.replace(WorkflowDocument.fromJSON(data.dsl), {
              kind: 'replace',
              source: 'ai',
              reason: 'ai-edit',
            });
          }
        } catch { /* ignore */ }
      },
      onUiAction: (data) => {
        if (disposed) return;
        if (data?.type === 'navigate' && data.args?.target) {
          const path = navigatePathFor(data.args.target, data.args);
          if (path) navigateRef.current(path);
        }
      },
      onConfirmRequest: (data) => {
        if (disposed) return;
        // 仅 require 模式需要人工裁决；auto-approve / auto-reject 由后端直接决策，不打扰用户
        if (data?.mode !== 'require') return;
        setPendingConfirm({
          id: data.toolCallId,
          action: data.action,
          args: data.args || {},
          policy: 'confirm',
        });
      },
      onConfirmResolved: (data) => {
        if (disposed) return;
        setPendingConfirm((prev) => (prev && prev.id === data.toolCallId ? null : prev));
      },
      onDone: () => {
        if (disposed) return;
        liveAssistantIdRef.current = null;
        setStreaming(false);
        reloadMessages(sessionKey);
        // 队列里还有消息则继续
        processingRef.current = false;
        setQueueLength(messageQueueRef.current.length);
        void drainQueue();
      },
      onError: (msg) => {
        if (disposed) return;
        liveAssistantIdRef.current = null;
        setStreaming(false);
        setMessages((prev) => [
          ...prev,
          { id: nanoid(), role: 'assistant', content: `[错误] ${msg}`, timestamp: Date.now() },
        ]);
        reloadMessages(sessionKey);
        processingRef.current = false;
        setQueueLength(messageQueueRef.current.length);
        void drainQueue();
      },
    };

    // 断线自动重连：事件流中断后稍作退避重连，重连时后端会回放运行快照，
    // 因此「关窗期间跑完的 run」重新打开窗口也能立即收敛到最终状态。
    const connect = async () => {
      while (!disposed) {
        try {
          await subscribeSessionEvents(sessionKey, handlers, controller.signal);
          if (disposed || controller.signal.aborted) break;
          // 流被服务端正常结束（极少）：短暂等待后重连
          await sleep(1500);
        } catch (e) {
          if (disposed || controller.signal.aborted) break;
          console.warn('[agent] session event stream error, reconnecting...', e);
          await sleep(2000);
        }
      }
    };
    void connect();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [currentSessionKey, reloadMessages, drainQueue]);

  /** Task 2: 压缩上下文 */
  const compactContext = useCallback(async () => {
    const sessionKey = currentSessionKeyRef.current;
    if (!sessionKey) return;
    try {
      // 复用旧压缩端点；压缩完成后重新加载消息
      const { streamCompact } = await import('./sse-client');
      await streamCompact(sessionKey, {
        onDone: () => reloadMessages(sessionKey),
        onError: (msg) => console.error('Compact error:', msg),
      });
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
    permissions,
    streaming,
    queueLength,
    pendingConfirm,
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
    resolveConfirm,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    stopStreaming,
    updatePermission,
    updateGlobalPermission,
    debugNode,
    activePlan,
    injectCanvasInfo,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
