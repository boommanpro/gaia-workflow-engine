/**
 * AgentProvider —— 会话编排与运行时绑定层。
 *
 * v3 架构（对话数据全部进 SessionRuntime，React 只做视图）：
 *  · `AgentActionsContext`：全部动作（send/stop/create/switch…），引用恒稳定；
 *  · `WorkspaceAgentContext`：会话列表 / 文件夹 / 当前会话 / 草稿选项 —— 低频变化；
 *  · `useAgent()`：上两者的合并门面（冷组件用；不再包含 messages/streaming ——
 *    高频字段一律走 `useRuntime` 选择器，杜绝整树重渲染）；
 *  · SSE 订阅绑定：帧 → runtime.dispatch + 少量宿主副作用（画布应用 / 路由跳转 /
 *    终态收敛）。事件到状态的换算在 runtime/reducer（纯函数、全量单测）。
 *
 * 对话编排仍是「纯后端自治」：sendMessage 只把消息 POST 给后端触发一次异步 run，
 * 后端在服务端跑完整循环（含工具执行），过程事件经 SSE 推给 runtime 渲染。
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

import { agentApi } from './api';
import {
  hasUnsyncedLocalEdits,
  isEchoOfLastPush,
  saveCanvasDraft,
} from './canvas-draft-sync';
import { getWorkflowOfSession, bindSessionToWorkflow } from '../ai-workspace/session-scope';
import { aiPendingChangeStore } from './ai-pending-change';
import { sessionEventStore } from './session-event-store';
import { subscribeSessionEvents } from './sse-client';
import { sessionRuntime, useRuntime } from './runtime/store';
import type { RuntimeState } from './runtime/state';
import { workflowDocumentStore, type DocumentOp } from '../document';
import { getCurrentLocale } from '../i18n';
import { splitAttachments } from '../chat/attachments';
import { getCanvasContext } from './canvas-context';
import type {
  AgentSession,
  PageContext,
  WorkFolder,
  AgentArtifactDto,
} from './types';

// 运行时纯函数与类型重导出（旧测试与外部引用兼容）
export { convertMessages, appendLiveRow } from './runtime/messages';

/** 会话切换时序：终态收敛（done→历史落位→live 行退场）的统一入口类型 */
interface AgentContextValue {
  dockOpen: boolean;
  setDockOpen: (open: boolean) => void;

  sessions: AgentSession[];
  currentSessionKey: string | null;
  refreshFolders: () => Promise<void>;
  /** 重新拉取会话列表（外部入口新建会话后左栏对齐；不改动 currentSessionKey） */
  refreshSessions: () => Promise<void>;
  /** 新任务草稿（draft- 会话）的选项：欢迎页「任务设置」面板读写；非草稿会话为 null。 */
  draftSetup: { folderId: number | null; inheritWorkflowCode: string | null; carryDraft?: boolean } | null;
  updateDraftSetup: (patch: { folderId?: number | null; inheritWorkflowCode?: string | null }) => void;
  createFolder: (name: string) => Promise<WorkFolder | void>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
  /** 会话移入/移出文件夹 */
  moveSessionToFolder: (sessionKey: string, folderId: number | null) => Promise<void>;
  /** 置顶 / 取消置顶 */
  pinSession: (sessionKey: string, pinned: boolean) => Promise<void>;
  /** 归档 / 取消归档 */
  archiveSession: (sessionKey: string, archived: boolean) => Promise<void>;

  folders: WorkFolder[];

  // Token usage tracking
  tokenUsage: { estimated: number; limit: number };
  compactContext: () => Promise<void>;

  // Debug entries
  debugEntries: Array<{
    id: string;
    timestamp: number;
    request?: any;
    response?: any;
    context?: any;
    toolResults?: any;
  }>;
  clearDebugEntries: () => void;

  createSession: (title?: string, opts?: {
    scope?: 'chat' | 'work';
    folderId?: number | null;
    inheritWorkflowCode?: string | null;
    inheritDsl?: boolean;
  }) => Promise<string>;
  switchSession: (sessionKey: string) => Promise<void>;
  renameSession: (sessionKey: string, title: string) => Promise<void>;
  deleteSession: (sessionKey: string) => Promise<void>;
  sendMessage: (text: string, images?: string[]) => Promise<boolean>;
  stopStreaming: () => void;

  // Subagent debug flow
  debugNode: (nodeId: string, instruction: string) => Promise<void>;

  /** 兼容占位：后端自治模式下计划在后端 */
  activePlan: null;

  /** 画布加载完成时注入画布摘要（兼容保留；画布摘要经 getPageContextJson 随每次 run 提交） */
  injectCanvasInfo: (summary: { nodes: Array<{ id: string; type: string; title: string }>; edges: Array<{ from: string; to: string }> }) => void;
}

const AgentActionsContext = createContext<AgentContextValue | null>(null);

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentActionsContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

/** 后端 navigate ui_action 参数 → 路由路径 */
function navigatePathFor(target: string, args: any): string | null {
  switch (target) {
    case 'home': return '/chat';
    case 'admin':
      if (args?.tab === 'templates') return '/manage/templates';
      if (args?.tab === 'agent') return '/manage/agent-config';
      return '/workflows';
    case 'releases': return '/releases';
    case 'editor': return args?.workflowCode ? `/editor/${args.workflowCode}` : '/editor';
    case 'templateEditor': return `/template-editor/${args?.templateCode}`;
    default: return null;
  }
}

/**
 * 草稿会话（draft- 前缀的本地 key）的元信息：首条消息发送时据此物化真实会话。
 */
interface DraftMeta {
  scope: 'chat' | 'work';
  folderId: number | null;
  inheritWorkflowCode?: string | null;
  inheritDslJson?: string | null;
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [dockOpen, setDockOpen] = useState(false);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentSessionKey, setCurrentSessionKey] = useState<string | null>(null);
  const [folders, setFolders] = useState<WorkFolder[]>([]);
  /** 新任务草稿的选项（所属项目 / 继承工作流）；仅 currentSessionKey 是 draft- 时非空 */
  const [draftSetup, setDraftSetup] = useState<{ folderId: number | null; inheritWorkflowCode: string | null; carryDraft?: boolean } | null>(null);
  /** 订阅重启信号：草稿会话物化为真实会话时递增，强制 SSE 订阅 effect 重跑 */
  const [sessionEpoch, setSessionEpoch] = useState(0);

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

  const location = useLocation();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // 路由快照 ref：事件处理器内读当前路由用。订阅 effect 的 deps 不得包含
  // location.pathname —— 否则流式中跳转 = 重连回放（时间线闪烁）
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  // refs
  const currentSessionKeyRef = useRef<string | null>(null);
  const draftMetaRef = useRef<Map<string, DraftMeta>>(new Map());

  useEffect(() => {
    currentSessionKeyRef.current = currentSessionKey;
  }, [currentSessionKey]);

  // ---------------- 工作空间数据（低频） ----------------

  const refreshFolders = useCallback(async () => {
    try {
      const list = await agentApi.listFolders();
      setFolders(list || []);
    } catch { /* ignore */ }
  }, []);

  /** 重新拉取会话列表（新建任务弹窗等外部入口落库后，左栏立即对齐） */
  const refreshSessions = useCallback(async () => {
    try {
      const list = await agentApi.listSessions();
      setSessions(list || []);
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

  // ---------------- 历史加载 / 会话切换 ----------------

  /** 从后端 DB 加载并整表重建消息（一轮结束 / 出错 / 会话切换后收敛 live 态）。 */
  const reloadMessages = useCallback((sessionKey: string, opts?: { onSettled?: () => void }) => {
    Promise.all([
      agentApi.getMessages(sessionKey).catch(() => []),
      agentApi.getSessionRuns(sessionKey).catch(() => []),
      agentApi.getTurnUsage(sessionKey).catch(() => []),
      agentApi.getArtifacts(sessionKey).catch(() => []),
    ]).then(([msgs, runs, turnUsage, arts]) => {
      // 仅在仍处于该会话时应用，避免跨会话串数据
      if (currentSessionKeyRef.current !== sessionKey) return;
      sessionRuntime.dispatch({
        type: 'history',
        history: (msgs || []) as any,
        runs: runs as any,
        turnUsage: turnUsage as any,
        artifacts: (arts || []) as AgentArtifactDto[],
      });
      opts?.onSettled?.();
    });
    agentApi.listSessions().then((list) => {
      if (currentSessionKeyRef.current === sessionKey) {
        setSessions(list || []);
      }
    }).catch(() => {});
  }, []);

  /**
   * run 收敛（done / error / stopped / run_state 终态统一入口）：
   * runtime 落定（reducer 关闭全部条目）→ 历史重载 → 落位成功后才摘除 live 占位行。
   */
  const settleRun = useCallback((sessionKey: string) => {
    sessionRuntime.dispatch({ type: 'end-run' });
    reloadMessages(sessionKey, {
      onSettled: () => {
        if (currentSessionKeyRef.current !== sessionKey) return;
        sessionRuntime.dispatch({ type: 'live-clear' });
      },
    });
  }, [reloadMessages]);

  // 会话切换：runtime 复位 + 历史加载 + 画布归属清空 + 服务端草稿恢复
  // （未保存修改的守卫在 switchSession 里：确认弹窗「保存并离开 / 直接离开」）
  useEffect(() => {
    if (!currentSessionKey) return;
    const sessionKey = currentSessionKey;
    // 立刻清空上一段会话的消息：旧会话内容不得显示到新请求返回（快速切换跨会话串数据）
    sessionRuntime.reset(sessionKey);
    // 画布文档是模块级单例：切会话时只保留「不属于任何会话」的页面级内容
    const canvasSnapshot = workflowDocumentStore.getSnapshot();
    const canvasOwner = canvasSnapshot.meta.ownerSession;
    const canvasForeign = !canvasSnapshot.doc.isEmpty && (
      (canvasOwner != null && canvasOwner !== sessionKey) ||
      (canvasOwner == null && canvasSnapshot.meta.producedBy === 'ai')
    );
    if (canvasForeign) {
      workflowDocumentStore.clear();
    }
    reloadMessages(sessionKey);
    // 服务端会话草稿恢复（独立于订阅 effect：路由切换不重建 SSE 订阅）
    if (!/^\/(editor|template-editor)/.test(location.pathname)) {
      agentApi.getSessionDocument(sessionKey).then((doc: any) => {
        if (currentSessionKeyRef.current !== sessionKey) return;
        const dsl = doc && Array.isArray(doc.nodes) ? doc : null;
        if (dsl && dsl.nodes.length > 0) {
          try {
            // 会话草稿恢复 = 应用服务端权威内容，本地即服务端，不算未保存
            workflowDocumentStore.applyServerDoc(dsl, Number(doc?.version) || 0, { keepClean: true });
            // 显式归属：草稿恢复填进来的画布属于本会话 —— 切走时按归属清空
            workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
          } catch { /* ignore */ }
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionKey, reloadMessages]);

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

  // ---------------- 发送 / 停止 ----------------

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

  const createSession = useCallback(async (title?: string, opts?: {
    scope?: 'chat' | 'work';
    folderId?: number | null;
    inheritWorkflowCode?: string | null;
    inheritDsl?: boolean;
  }) => {
    // 新建对话只生成本地草稿 key，不请求后端；首条消息发送时（postMessage）才真正创建会话。
    const key = `draft-${nanoid(8)}`;
    let inheritDslJson: string | null = null;
    let inheritCode = opts?.inheritWorkflowCode ?? null;
    if (opts?.inheritDsl) {
      // 「换新会话继续」：把当前画布（含未保存手改）快照进草稿元信息
      try {
        const snap = workflowDocumentStore.getSnapshot();
        if (!snap.doc.isEmpty) {
          inheritDslJson = JSON.stringify(snap.doc.toJSON());
          if (snap.meta.workflowCode) inheritCode = snap.meta.workflowCode;
        }
      } catch { /* 快照失败退化为普通新任务 */ }
    }
    draftMetaRef.current.set(key, {
      scope: opts?.scope || 'chat',
      folderId: opts?.folderId ?? null,
      inheritWorkflowCode: inheritCode,
      inheritDslJson,
    });
    setDraftSetup({
      folderId: opts?.folderId ?? null,
      inheritWorkflowCode: inheritDslJson != null ? (inheritCode ?? '') : inheritCode,
      carryDraft: inheritDslJson != null,
    });
    setCurrentSessionKey(key);
    sessionRuntime.reset(key);
    setDockOpen(true);
    return key;
  }, []);

  /** 新任务草稿的当前选项（仅 draft- 会话非空）：欢迎页「任务设置」面板的数据源 */
  const updateDraftSetup = useCallback((patch: { folderId?: number | null; inheritWorkflowCode?: string | null }) => {
    const key = currentSessionKeyRef.current;
    if (!key || !key.startsWith('draft-')) return;
    setDraftSetup((prev) => {
      const next = {
        folderId: patch.folderId !== undefined ? patch.folderId : prev?.folderId ?? null,
        inheritWorkflowCode: patch.inheritWorkflowCode !== undefined ? patch.inheritWorkflowCode : prev?.inheritWorkflowCode ?? null,
        carryDraft: patch.inheritWorkflowCode !== undefined ? false : prev?.carryDraft ?? false,
      };
      const meta = draftMetaRef.current.get(key);
      if (meta) {
        draftMetaRef.current.set(key, {
          scope: next.folderId != null ? 'work' : 'chat',
          folderId: next.folderId,
          inheritWorkflowCode: next.inheritWorkflowCode,
          inheritDslJson: patch.inheritWorkflowCode !== undefined ? null : meta.inheritDslJson ?? null,
        });
      }
      return next;
    });
  }, []);

  const switchSession = useCallback(async (sessionKey: string) => {
    const prevKey = currentSessionKeyRef.current;
    if (prevKey && prevKey !== sessionKey) {
      draftMetaRef.current.delete(prevKey);
      if (prevKey.startsWith('draft-')) setDraftSetup(null);
    }
    // 保存制守卫（2026-10-27）：画布归属某段会话且有未保存修改、目标又不是归属
    // 会话本身时，切换会按归属清空画布 —— 先问「保存并离开 / 直接离开」。
    // 按画布归属（ownerSession）判断而不是 prevKey：编辑器页整页刷新后
    // AgentContext 的会话上下文是空的（prevKey=null），但画布归属仍在 store 里。
    // 流式运行中不打断（此时推送会与 AI 的服务端写入互相覆盖，维持旧行为）。
    const canvasMeta = workflowDocumentStore.getSnapshot().meta;
    const switchingAwayFromDirtyCanvas =
      canvasMeta.ownerSession != null
      && canvasMeta.ownerSession !== sessionKey
      && hasUnsyncedLocalEdits()
      && !sessionRuntime.getState().streaming;
    if (switchingAwayFromDirtyCanvas) {
      const leave = await new Promise<boolean>((resolve) => {
        // 动态加载：AgentContext 会被 node 环境单测导入，semi-ui 顶层 import 会连坐
        // CJS 依赖破坏测试；弹窗只在守卫触发时才需要
        void import('@douyinfe/semi-ui').then(({ Modal }) => {
          Modal.confirm({
            title: '有未保存修改',
            content: '离开将丢失未保存的画布修改，是否保存后离开？',
            okText: '保存并离开',
            cancelText: '直接离开',
            maskClosable: false,
            onOk: () =>
              saveCanvasDraft({ source: 'manual-save' }).then((res) => {
                if (!res.ok) {
                  sessionRuntime.dispatch({
                    type: 'error-row',
                    text: `[错误] 画布保存失败：${res.error || '未知错误'}。已留在当前会话，可重试或直接离开。`,
                  });
                  return Promise.reject(new Error(res.error || 'save failed'));
                }
                resolve(true);
              }),
            onCancel: () => resolve(true),
          });
        });
      });
      if (!leave) return;
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
      sessionRuntime.reset(null);
    }
  }, []);

  /** 直发一条消息给后端（steering 语义）：run 进行中时后端在 turn 边界注入。 */
  const postMessage = useCallback(async (sessionKey: string, text: string, images?: string[]) => {
    sessionRuntime.dispatch({ type: 'run-accepted' });
    try {
      const res = await agentApi.startRun(sessionKey, text, getPageContextJson(), images, getCurrentLocale());
      if (!res?.accepted) {
        sessionRuntime.dispatch({ type: 'end-run' });
        sessionRuntime.dispatch({ type: 'error-row', text: `[错误] ${res?.error || '运行未受理'}` });
      }
    } catch (e) {
      sessionRuntime.dispatch({ type: 'end-run' });
      sessionRuntime.dispatch({ type: 'error-row', text: `[错误] ${(e as Error).message}` });
    }
  }, [getPageContextJson]);

  /** 发送消息：入队，串行触发后端自治运行。返回 false = 发送前被拦截（输入应保留） */
  const sendMessage = useCallback(
    async (text: string, images?: string[]): Promise<boolean> => {
      let sessionKey = currentSessionKeyRef.current;
      if (!sessionKey) return false;

      // 草稿会话：发送前先创建正式会话，失败则不发送（元信息保留供原地重试）
      const draft = draftMetaRef.current.get(sessionKey);
      if (draft) {
        try {
          // 标题取正文（附件块剥离；纯附件消息用第一个附件名兜底），不让【附件 …】混进标题
          const { text: bodyText, files: attFiles } = splitAttachments(text);
          const title = (bodyText.trim() || attFiles[0] || '新任务').slice(0, 30);
          const real = await agentApi.createSession(title, {
            scope: draft.scope,
            folderId: draft.folderId,
          });
          draftMetaRef.current.delete(sessionKey);
          sessionKey = real.sessionKey;
          currentSessionKeyRef.current = sessionKey;
          setCurrentSessionKey(sessionKey);
          // 强制订阅 effect 重跑：draft → 真实会话的确定性触发源
          setSessionEpoch((e) => e + 1);
          setSessions((prev) => [real, ...prev]);
          if (draft.scope === 'work') void refreshFolders();
          setDraftSetup(null);
          if (draft.inheritDslJson) {
            try {
              await agentApi.pushDraft(sessionKey, {
                dsl: JSON.parse(draft.inheritDslJson),
                workflowCode: draft.inheritWorkflowCode || undefined,
              });
              if (draft.inheritWorkflowCode) bindSessionToWorkflow(sessionKey, draft.inheritWorkflowCode);
            } catch (e) {
              sessionRuntime.dispatch({ type: 'error-row', text: `[提示] 草稿携带失败：${(e as Error).message}。任务已创建，可继续对话。` });
            }
          } else if (draft.inheritWorkflowCode) {
            try {
              await agentApi.seedDraft(sessionKey, draft.inheritWorkflowCode);
              bindSessionToWorkflow(sessionKey, draft.inheritWorkflowCode);
            } catch (e) {
              sessionRuntime.dispatch({ type: 'error-row', text: `[提示] 工作流继承失败：${(e as Error).message}。任务已创建，可继续对话。` });
            }
          }
        } catch (e) {
          sessionRuntime.dispatch({ type: 'error-row', text: `[错误] ${(e as Error).message}` });
          return false;
        }
      }

      // 防御：没有草稿元信息却还是 draft- 伪键 —— 伪键无法被 SSE 订阅，明确拦下杜绝静默失败
      if (sessionKey.startsWith('draft-')) {
        sessionRuntime.dispatch({ type: 'error-row', text: '[错误] 会话尚未创建成功，请新建任务后重新发送。' });
        return false;
      }

      // 提问前保存（保存制兜底，2026-10-27 产品决策）：仅当有未保存修改时自动保存，
      // AI 基于所见内容回答；保存失败则拦截本次提问并保留输入。
      if (!sessionRuntime.getState().streaming && hasUnsyncedLocalEdits()) {
        const sync = await saveCanvasDraft({ source: 'ask' });
        if (!sync.ok) {
          sessionRuntime.dispatch({ type: 'error-row', text: `[错误] 画布保存失败：${sync.error || '未知错误'}。本次未发送，请检查网络后重试。` });
          return false;
        }
      }

      // 乐观渲染用户消息
      sessionRuntime.dispatch({ type: 'optimistic-user', text, images });

      // steering：run 进行中直接发送，后端在 turn 边界注入；本地仅维护排队指示
      if (sessionRuntime.getState().streaming) sessionRuntime.dispatch({ type: 'queue-inc' });
      void postMessage(sessionKey, text, images);
      return true;
    },
    [postMessage, refreshFolders]
  );

  /** 停止当前运行（协作式中断 + 10s 兜底防占位行悬挂）。 */
  const stopStreaming = useCallback(() => {
    const sessionKey = currentSessionKeyRef.current;
    sessionRuntime.dispatch({ type: 'queue-reset' });

    if (!sessionKey || sessionKey.startsWith('draft-')) {
      // 本地草稿没有可停的后端 run：直接定格画布快照并收尾
      workflowDocumentStore.captureAiRunSnapshot(undefined);
      sessionRuntime.dispatch({ type: 'end-run' });
      return;
    }
    if (sessionRuntime.getState().stopping) return; // 停止请求已发出，等待确认

    sessionRuntime.dispatch({ type: 'begin-stop' });
    void agentApi.stopRun(sessionKey).then(
      () => {
        // 请求已受理：终态事件（done/interrupted）经 settleRun 真正结束；
        // 10s 兜底（SSE 断线时终态永远不来）
        setTimeout(() => {
          if (currentSessionKeyRef.current === sessionKey && sessionRuntime.getState().streaming) {
            workflowDocumentStore.captureAiRunSnapshot(undefined);
            settleRun(sessionKey);
          }
        }, 10_000);
      },
      (error) => {
        // 停止失败：回到运行态，明确报错可重试（不吞错假装停了）
        sessionRuntime.dispatch({ type: 'cancel-stop' });
        sessionRuntime.dispatch({ type: 'error-row', text: `[错误] 停止请求失败：${(error as Error).message}。运行仍在进行，可重试停止。` });
      }
    );
  }, [settleRun]);

  /**
   * 连接（重）建立即对账：拉服务端草稿与本地比对，结构（节点 id 集 + 边集）漂移则整卡替换。
   * 自愈「不存在的节点」类漂移——长活 tab 跨后端重启（草稿版本计数重置）/ 漏事件 / 任何
   * 未知的增量应用缺陷，都会在下次连接时收敛到服务端权威草稿（P-03 后端权威）。
   * 编辑器页有未应用本地改动时跳过：本地优先，由既有「待应用变更」手动合并流程兜底。
   */
  const reconcileDocumentOnConnect = useCallback((sessionKey: string) => {
    if (/^\/(editor|template-editor)/.test(pathnameRef.current) && hasUnsyncedLocalEdits()) return;
    agentApi.getSessionDocument(sessionKey).then((doc: any) => {
      if (!doc?.nodes?.length) return;
      if (currentSessionKeyRef.current !== sessionKey) return;
      const structureKeyOf = (d: any) => [
        (d?.nodes || []).map((n: any) => n.id).sort().join(','),
        (d?.edges || []).map((e: any) => `${e.sourceNodeID}->${e.targetNodeID}`).sort().join(','),
      ].join('|');
      const local = workflowDocumentStore.getSnapshot().doc.toJSON();
      const version = Number(doc?.version) || 0;
      if (structureKeyOf(local) === structureKeyOf(doc)) {
        // 结构一致只对齐版本号（后端重启会重置计数），避免无谓的画布重挂
        workflowDocumentStore.alignServerDocVersion(version);
        return;
      }
      workflowDocumentStore.applyServerDoc(doc, version, {
        // 会话草稿画布（未绑正式编码）：对齐服务端权威内容不算未保存；
        // 正式工作流画布保持脏语义（AI 改完与落版基线有差异，须保存版本）
        keepClean: !workflowDocumentStore.getSnapshot().meta.workflowCode,
      });
      workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
    }).catch(() => { /* 拉取失败静默：下一轮重连再对账 */ });
  }, []);

  // ---------------- SSE 订阅绑定（帧 → runtime + 宿主副作用） ----------------

  /** document 事件应用：全量 / 增量 ops / 失步拉全量（编辑器页守卫与旧版一致） */
  const applyDocumentEvent = useCallback((sessionKey: string, data: any) => {
    // 编辑器（专家模式）页面画布归工作流所有：无关会话的草稿事件不得顶掉工作流画布
    if (/^\/(editor|template-editor)/.test(pathnameRef.current)) {
      const wfCode = workflowDocumentStore.getSnapshot().meta.workflowCode;
      if (wfCode && getWorkflowOfSession(sessionKey) !== wfCode) return;
    }
    const editorPage = /^\/(editor|template-editor)/.test(pathnameRef.current);
    const version = Number(data?.version) || 0;

    if (data?.dsl && Array.isArray(data.dsl.nodes) && data.dsl.nodes.length > 0) {
      if (editorPage && hasUnsyncedLocalEdits()) {
        try {
          const base = workflowDocumentStore.getSnapshot().doc.toJSON();
          aiPendingChangeStore.set(data.dsl, base, sessionRuntime.getState().liveMessageId ?? undefined);
        } catch { /* ignore */ }
        return;
      }
      // 自己刚推上去的草稿被服务端广播回来（manual-edit/rollback 推送的回声）：
      // 内容与本地一致，只需对齐版本号。整份 applyServerDoc 会平白推进 store 修订，
      // 让 canvas-sync 重推一轮并把用户视野拽回全图（2026-10-26 缩放闪回诱因之一）。
      if (isEchoOfLastPush(data.dsl)) {
        workflowDocumentStore.alignServerDocVersion(version);
        sessionRuntime.dispatch({ type: 'doc-synced', version });
        return;
      }
      workflowDocumentStore.applyServerDoc(data.dsl, version, {
        keepClean: !workflowDocumentStore.getSnapshot().meta.workflowCode,
      });
      workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
      sessionRuntime.dispatch({ type: 'doc-synced', version });
      return;
    }
    if (Array.isArray(data?.ops)) {
      if (editorPage && hasUnsyncedLocalEdits()) return; // 待应用变更由用户手动应用
      const base = Number(data?.baseVersion);
      const applied = workflowDocumentStore.applyServerOps(
        data.ops as DocumentOp[],
        version,
        base > 0 ? base : undefined,
        { keepClean: !workflowDocumentStore.getSnapshot().meta.workflowCode }
      );
      if (applied) {
        workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
      } else {
        // 本地版本落后（服务端重启 / 错过事件）：拉全量兜底
        agentApi.getSessionDocument(sessionKey).then((doc: any) => {
          if (currentSessionKeyRef.current !== sessionKey || !doc?.nodes?.length) return;
          workflowDocumentStore.applyServerDoc(doc, Number(doc?.version) || 0, {
            keepClean: !workflowDocumentStore.getSnapshot().meta.workflowCode,
          });
          workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
          sessionRuntime.dispatch({ type: 'doc-synced', version: Number(doc?.version) || 0 });
        }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!currentSessionKey || currentSessionKey.startsWith('draft-')) return;
    const sessionKey = currentSessionKey;
    // 事件活账本随订阅生命周期重置：派生视图（轨迹面板）从这里增量读取
    sessionEventStore.reset(sessionKey);

    const controller = new AbortController();
    let disposed = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    /** run 终态收敛（done/error/run_state 终态）—— 收敛后延迟拉调试数据 */
    const settleFromStream = () => {
      workflowDocumentStore.captureAiRunSnapshot(sessionRuntime.getState().liveMessageId ?? undefined);
      settleRun(sessionKey);
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => refreshDebugData(sessionKey), 1200);
    };

    const onFrame = (frame: { event: string; data: string; id?: string }) => {
      if (disposed) return;
      let data: any = {};
      try {
        data = frame.data ? JSON.parse(frame.data) : {};
      } catch {
        return; // 忽略无法解析的帧
      }
      const name = frame.event || 'message';
      const seq = frame.id != null && Number.isFinite(Number(frame.id)) ? Number(frame.id) : undefined;
      // 活账本记账（派生视图数据源；高频流式帧不记）
      sessionEventStore.append(sessionKey, name, data);
      // 宿主副作用（先于 dispatch，画布/路由与状态同步生效）
      if (name === 'document') applyDocumentEvent(sessionKey, data);
      if (name === 'ui_action' && data?.type === 'navigate' && data.args?.target) {
        const path = navigatePathFor(data.args.target, data.args);
        if (path) navigateRef.current(path, { state: { from: pathnameRef.current } });
      }
      if (name === 'done' || name === 'error') settleFromStream();
      if (name === 'run_state' && data?.status && data.status !== 'running') settleFromStream();
      // 状态换算（seq 单调去重在 reducer 内）
      sessionRuntime.dispatch({ type: 'event', seq, name, data });
    };

    void subscribeSessionEvents(
      sessionKey,
      {
        onFrame,
        onOpen: () => {
          if (!disposed) {
            sessionRuntime.dispatch({ type: 'connected' });
            // 连接（含断线重连）即对账一次：收敛本地与服务端草稿的结构漂移
            reconcileDocumentOnConnect(sessionKey);
          }
        },
        onReconnecting: () => {
          if (!disposed) sessionRuntime.dispatch({ type: 'reconnecting' });
        },
        getLastEventId: () => {
          const seq = sessionRuntime.getState().lastSeq;
          return seq > 0 ? seq : null;
        },
      },
      controller.signal
    );

    return () => {
      disposed = true;
      controller.abort();
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [currentSessionKey, sessionEpoch, settleRun, refreshDebugData, applyDocumentEvent, reconcileDocumentOnConnect]);

  /** 压缩上下文：前半段历史摘要为「前情摘要」，压缩后重新加载消息 */
  const compactContext = useCallback(async () => {
    const sessionKey = currentSessionKeyRef.current;
    if (!sessionKey) return;
    try {
      await agentApi.compactSession(sessionKey);
    } catch (e) {
      console.error('Compact failed:', e);
    }
    reloadMessages(sessionKey);
  }, [reloadMessages]);

  /** 画布加载完成时注入画布摘要（兼容保留） */
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
      sessionRuntime.dispatch({ type: 'subagent-open', id: msgId });

      const patch = (mutate: (m: any) => any) => {
        sessionRuntime.dispatch({ type: 'subagent-patch', id: msgId, mutate });
      };

      try {
        const { streamSubagent } = await import('./sse-client');
        await streamSubagent(subagentSessionKey, instruction, getPageContextJson(), (name, data) => {
          if (name === 'subagent_tool_call') {
            patch((m) => ({
              ...m,
              subagentSteps: [...(m.subagentSteps || []), { action: data.action, args: data.args, status: 'running' as const }],
            }));
          } else if (name === 'subagent_round_done') {
            patch((m) => {
              if (!m.subagentSteps) return m;
              const steps = [...m.subagentSteps];
              if (steps.length > 0) steps[steps.length - 1] = { ...steps[steps.length - 1], status: 'done' as const };
              return { ...m, subagentSteps: steps };
            });
          } else if (name === 'subagent_final_result') {
            patch((m) => ({ ...m, subagentResult: { success: true, content: data.content } }));
          } else if (name === 'error') {
            patch((m) => ({ ...m, subagentResult: { success: false, content: String(data?.message || '子代理执行失败') } }));
          }
        });
      } catch (e) {
        patch((m) => ({ ...m, subagentResult: { success: false, content: (e as Error).message } }));
      }
    },
    [getPageContextJson]
  );

  // ---------------- Context value（低频变化；高频对话数据在 runtime） ----------------

  const value = useMemo<AgentContextValue>(() => ({
    dockOpen,
    setDockOpen,
    sessions,
    currentSessionKey,
    folders,
    refreshFolders,
    refreshSessions,
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
    createSession,
    updateDraftSetup,
    draftSetup,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    stopStreaming,
    debugNode,
    activePlan: null,
    injectCanvasInfo,
  }), [
    dockOpen, sessions, currentSessionKey, folders, refreshFolders, refreshSessions,
    createFolder, renameFolder, deleteFolder, moveSessionToFolder, pinSession, archiveSession,
    tokenUsage, compactContext, debugEntries, createSession, updateDraftSetup, draftSetup,
    switchSession, renameSession, deleteSession, sendMessage, stopStreaming, debugNode,
  ]);

  return <AgentActionsContext.Provider value={value}>{children}</AgentActionsContext.Provider>;
}

/** 运行态便捷选择器（高频字段一律从这里订阅，别走 useAgent） */
export function useRunStreaming(): boolean {
  return useRuntime((s) => s.streaming);
}

export function useRunStopping(): boolean {
  return useRuntime((s) => s.stopping);
}

export function useLiveMessageId(): string | null {
  return useRuntime((s) => s.liveMessageId);
}

export function useQueueLength(): number {
  return useRuntime((s) => s.queueLength);
}

export function useSessionArtifacts(): AgentArtifactDto[] {
  return useRuntime((s) => s.artifacts);
}

export function useLatestArtifact(type: AgentArtifactDto['type']): AgentArtifactDto | null {
  return useRuntime((s) => {
    for (let i = s.artifacts.length - 1; i >= 0; i -= 1) {
      if (s.artifacts[i].type === type) return s.artifacts[i];
    }
    return null;
  });
}

export type { RuntimeState };
