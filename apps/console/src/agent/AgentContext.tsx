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
import { pushCanvasDraftToSession, hasUnsyncedLocalEdits, markSyncedWithServer, isEchoOfLastPush } from './canvas-draft-sync';
import { getWorkflowOfSession, bindSessionToWorkflow } from '../ai-workspace/session-scope';
import { aiPendingChangeStore } from './ai-pending-change';
import { sessionEventStore } from './session-event-store';
import { subscribeSessionEvents } from './sse-client';
import { artifactStore } from './artifact-store';
import { getCurrentLocale } from '../i18n';
import { getCanvasContext } from './canvas-context';
import { WorkflowDocument, workflowDocumentStore } from '../document';
import type {
  AgentSession,
  AgentMessage,
  AskCardData,
  DisplayMessage,
  ToolCallEvent,
  PageContext,
  ActivePlan,
  PlanStep,
  WorkFolder,
  SseHandlers,
  AgentArtifactDto,
} from './types';

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
  /** 重新拉取会话列表（外部入口新建会话后左栏对齐；不改动 currentSessionKey） */
  refreshSessions: () => Promise<void>;
  /** 新任务草稿（draft- 会话）的选项：欢迎页「任务设置」面板读写；非草稿会话为 null */
  draftSetup: { folderId: number | null; inheritWorkflowCode: string | null } | null;
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


  createSession: (title?: string, opts?: { scope?: 'chat' | 'work'; folderId?: number | null }) => Promise<string>;
  switchSession: (sessionKey: string) => Promise<void>;
  renameSession: (sessionKey: string, title: string) => Promise<void>;
  deleteSession: (sessionKey: string) => Promise<void>;
  sendMessage: (text: string, images?: string[]) => Promise<boolean>;
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
 * 多轮的正文拼接为正文，工具调用收进 toolSteps 在消息内折叠展示。
 *
 * 交错还原优先级：assistant 行自带持久化时间线（run 收尾落库，对标 dsh「快照即结构」）
 * > 按行顺序重建（旧行为，行粒度粗：思考/正文各合并成一块）。 */
/** 持久化时间线条目 → 前端 TimelineItem（与 applySnapshot 同一映射口径；历史条目一律视为已收尾） */
function mapPersistedTimeline(
  entries: NonNullable<AgentMessage['timeline']> | null | undefined
): import('./types').TimelineItem[] {
  const raw: Array<{
    kind?: string;
    id?: string;
    text?: string;
    source?: string;
    call?: { id?: string; name?: string; args?: any; result?: string };
  }> = typeof entries === 'string'
    ? (() => { try { const parsed = JSON.parse(entries); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
    : (entries || []);
  const out: import('./types').TimelineItem[] = [];
  for (const item of raw) {
    if (!item || !item.kind) continue;
    if (item.kind === 'tool') {
      out.push({
        kind: 'tool',
        id: item.id || item.call?.id || `tl-tool-${out.length}`,
        call: {
          id: item.call?.id || item.id || '',
          action: item.call?.name || 'unknown',
          args: item.call?.args ?? {},
          ...(item.call?.result ? { result: String(item.call.result) } : {}),
        },
      });
    } else if (item.kind === 'notice') {
      out.push({ kind: 'notice', id: item.id || `tl-notice-${out.length}`, text: item.text || '', source: item.source });
    } else if (item.kind === 'text' || item.kind === 'thinking') {
      out.push({ kind: item.kind, id: item.id || `tl-${item.kind}-${out.length}`, text: item.text || '', closed: true });
    }
  }
  return out;
}

/**
 * 历史重建的 todo 步骤状态归一：词表对齐后端 TodoWriteToolExecutor.mapStatus
 * （落库的 tool args 是模型原始词表：completed/in_progress/pending…）。
 * 区别：历史 run 已结束，「进行中」不保留（落为 pending），
 * 避免刷新后任务清单里残留永远旋转的“进行中”步骤。
 */
function mapRestoredTodoStatus(raw: unknown): PlanStep['status'] {
  switch (String(raw ?? '').trim().toLowerCase()) {
    case 'completed':
    case 'done':
    case 'finished':
      return 'done';
    case 'blocked':
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'pending';
  }
}

export function convertMessages(msgs: AgentMessage[]): DisplayMessage[] {
  // 先建立 tool_call_id → tool 结果 content 映射，用于回填工具步骤结果
  const toolResultMap = new Map<string, string>();
  for (const msg of msgs) {
    if (msg.role === 'tool' && msg.toolCallId) {
      toolResultMap.set(msg.toolCallId, msg.content || '');
    }
  }

  interface AskCall {
    askId: string;
    question: string;
    options?: import('./types').AskOption[];
    answer?: string;
    auto?: boolean;
    answeredOnlyByTimeout?: boolean;
  }

  interface RunGroup {
    firstId: string;
    ts: number;
    contents: string[];
    thinkings: string[];
    steps: ToolCallEvent[];
    /** 真实调用链路的交错时间线（思考 → 工具 → 思考 → … → 正文） */
    timeline: import('./types').TimelineItem[];
    /** 本 run 里的 ask_user 调用（flush 时紧跟本组重建为已答提问卡，持久可见） */
    asks: AskCall[];
  }
  const result: DisplayMessage[] = [];
  let group: RunGroup | null = null;

  /** 从 ask_user 的落库 toolCalls + 结果行重建提问卡数据（历史视图的提问卡数据源） */
  const rebuildAsk = (callId: string, args: any, rawResult?: string): AskCall | null => {
    const question = String(args?.question || '');
    if (!question) return null;
    let answer: string | undefined;
    let auto = false;
    let answeredOnlyByTimeout = false;
    if (rawResult) {
      try {
        const parsed = JSON.parse(rawResult);
        answer = parsed.answer != null ? String(parsed.answer) : undefined;
        auto = parsed.auto === true;
        answeredOnlyByTimeout = parsed.timeout === true && parsed.auto !== true;
      } catch { /* 结果不是 JSON：当无答案处理 */ }
    }
    return {
      askId: callId,
      question,
      options: Array.isArray(args?.options) ? args.options : undefined,
      answer,
      auto,
      answeredOnlyByTimeout,
    };
  };

  const flush = () => {
    if (!group) return;
    const g = group;
    group = null;
    const content = g.contents.filter(Boolean).join('\n\n');
    const thinking = g.thinkings.filter(Boolean).join('\n\n');
    if (!content && !thinking && g.steps.length === 0 && g.asks.length === 0) return;

    let planSteps: DisplayMessage['planSteps'];
    // run 内模型会多次 todo_write 勾进度，取最后一次 = 最终状态（与 live plan 事件的 upsert 语义一致）
    let planStep: ToolCallEvent | undefined;
    for (const s of g.steps) {
      if (s.action === 'todo_write' || s.action === 'createPlan') planStep = s;
    }
    if (planStep && Array.isArray((planStep.args as any)?.steps)) {
      planSteps = ((planStep.args as any).steps as any[]).map((s: any, idx: number) => ({
        id: `plan-restored-${planStep.id}-${idx}`,
        // 落库的是模型原始参数（steps[].content 为标题）；后端只在实时广播前归一化成
        // intent —— 历史重建两条字段都要认，否则刷新后退化为「Step N」占位
        intent: s.intent || s.description || s.content || `Step ${idx + 1}`,
        action: s.action || 'todo',
        args: s.args || {},
        status: mapRestoredTodoStatus(s.status),
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
    // 本组里的 ask_user 调用重建为已答提问卡：紧跟 AI 回复之后、用户作答气泡之前 ——
    // 提问卡即模型回复的一部分，刷新后不能凭空消失（答案气泡本身已是落库的 user 行）
    for (const ask of g.asks) {
      result.push({
        id: `ask-${ask.askId}`,
        role: 'assistant',
        content: '',
        timestamp: g.ts,
        ask: {
          askId: ask.askId,
          question: ask.question,
          options: ask.options,
          answered: true,
          answer: ask.answer ?? (ask.answeredOnlyByTimeout ? '超时未回应' : undefined),
          auto: ask.auto,
        },
      });
    }
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
      if (!group) group = { firstId: `msg-${msg.id}`, ts, contents: [], thinkings: [], steps: [], timeline: [], asks: [] };
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
            // ask_user 调用重建为持久提问卡（详见 flush）
            if (tc.function?.name === 'ask_user') {
              const ask = rebuildAsk(tc.id, args, toolResult);
              if (ask) group.asks.push(ask);
            }
            const step: ToolCallEvent = {
              id: tc.id,
              action: tc.function?.name || 'unknown',
              args,
              result: toolResult,
            };
            group.steps.push(step);
            group.timeline.push({ kind: 'tool', id: tc.id, call: step });
          }
        } catch { /* ignore */ }
      }
      // 行自带持久化时间线（run 收尾落库）时整组替换：它才是真实调用链路，
      // 上面按行重建的只是行粒度粗的兜底（思考/正文各合并成一块）
      const persisted = mapPersistedTimeline(msg.timeline);
      if (persisted.length > 0) {
        group.timeline = persisted;
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
  // 顺序容错（历史数据）：作答轮的落库顺序曾是「工具结果 → 答案用户行 → 中断 assistant 行」，
  // 重放时答案气泡会排在提问卡前面。若提问卡前一条是 AI 回复、再前一条恰好是等值的用户气泡，
  // 旋转为 [AI 回复][提问卡][答案气泡] —— 只做相邻结构匹配，不误伤正常对话
  for (let i = 2; i < result.length; i++) {
    const card = result[i];
    if (card.ask?.answered && card.ask.answer) {
      const bubble = result[i - 2];
      if (result[i - 1].role === 'assistant' && bubble.role === 'user' && bubble.content === card.ask.answer) {
        result[i - 2] = result[i - 1];
        result[i - 1] = card;
        result[i] = bubble;
      }
    }
  }
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

/**
 * 历史整表替换时保留全部临时行（live 占位 + 未答的 ask 提问卡）。
 * ask 卡只存在于前端（ask_request 事件 / run_state 快照 pendingAsk 恢复），不落库 ——
 * 历史响应晚到时若不接回，挂起中的提问卡会被整表替换抹掉，用户从此无处作答。
 * 已作答的卡片不保留：答案已作为用户消息落库（新一轮对话），重载后由真实历史行呈现。
 */
export function appendEphemeralRows(
  history: DisplayMessage[],
  prev: DisplayMessage[],
  liveId: string | null | undefined
): DisplayMessage[] {
  const liveRow = liveId ? prev.find((m) => m.id === liveId) ?? null : null;
  let next = appendLiveRow(history, liveRow);
  for (const m of prev) {
    if (m.ask && !m.ask.answered && !next.some((n) => n.id === m.id)) {
      next = [...next, m];
    }
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

/** 产物卡消息 id（live upsert 与历史重放共用，保证不重复渲染） */
function artifactCardId(artifact: AgentArtifactDto): string {
  return `artifact-${artifact.artifactKey}`;
}

/**
 * document 事件的合并应用（模块级，随最新订阅生效）：
 * 搭建高峰每个节点/连线变更都广播一次 document，逐次整表 replace 会引发
 * store 订阅方（产物面板/活卡/快照逻辑）连环重渲染 —— 事件洪峰是
 * 「选完后页面无响应」的推手。250ms 尾沿合并（最新胜出）：中间帧丢弃
 * （预览语义），终态必达；归因（messageId/会话归属）在事件到达时定格。
 */
let docApplyTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDocumentApply(apply: () => void): void {
  if (docApplyTimer) clearTimeout(docApplyTimer);
  docApplyTimer = setTimeout(() => {
    docApplyTimer = null;
    try {
      apply();
    } catch { /* ignore */ }
  }, 250);
}

/** ask_user 提问卡 upsert（ask_request 事件与 run_state 快照 pendingAsk 恢复共用；id 稳定幂等） */
function upsertAskRow(prev: DisplayMessage[], ask: AskCardData): DisplayMessage[] {
  const row: DisplayMessage = {
    id: `ask-${ask.askId}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    ask,
  };
  const idx = prev.findIndex((m) => m.id === row.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = row;
    return next;
  }
  return [...prev, row];
}

/** 用产物事件 upsert 一张产物卡消息（release；test_report 走工具行不单独成卡） */
function upsertArtifactCard(prev: DisplayMessage[], artifact: AgentArtifactDto): DisplayMessage[] {
  if (artifact.type !== 'release') return prev;
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
 * 历史消息重放时，把会话产物里的 release 卡按时间戳插回消息流
 * （后端 artifact 没有直接挂 messageId，用「插在最后一条更早的消息后面」归位；
 * live 运行时的卡由 upsertArtifactCard 追加，两者通过同一消息 id 去重）。
 * test_report（试运行）不进对话流：run 本身就是工具调用，IN/OUT 由工具行承载（dsh 同款）。
 */
function placeArtifactCards(msgs: DisplayMessage[], artifacts: AgentArtifactDto[]): DisplayMessage[] {
  if (!artifacts || artifacts.length === 0) return msgs;
  const cardArts = artifacts.filter(
    (a) => a.type === 'release' && !msgs.some((m) => m.id === artifactCardId(a))
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

/**
 * runs（agent_session_event 派生，含 token 账）→ assistant 回复的 token 用量配对。
 * run.startedAt 落在「触发消息之后、本轮首条 assistant 行之前」——按时间贪心推进即可
 * 一一对应；live 占位行跳过（它的用量由 run 小结卡 live 承接）。
 * turnUsage（/turn-usage 按 run 聚合的账本）补缓存命中与模型 —— run_end 事件没带这两项。
 */
function attachRunUsage(
  msgs: DisplayMessage[],
  runs: any[],
  skipId?: string | null,
  turnUsage?: Array<{ runId: string; cachedTokens: number; model?: string }>,
): DisplayMessage[] {
  const usageByRun = new Map((turnUsage ?? []).map((u) => [u.runId, u]));
  const usable = (Array.isArray(runs) ? runs : []).filter(
    (r) => Number(r?.promptTokens) > 0 || Number(r?.completionTokens) > 0
  );
  if (usable.length === 0) return msgs;
  const asc = [...usable].sort((a, b) =>
    String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
  const ts = (raw: unknown) => {
    const t = new Date(String(raw || '')).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const next = msgs.map((m) => ({ ...m }));
  let ri = 0;
  for (const m of next) {
    if (m.role !== 'assistant' || m.id === skipId) continue;
    while (ri < asc.length && ts(asc[ri].startedAt) <= m.timestamp) ri += 1;
    const run = asc[ri - 1];
    if (run) {
      const agg = usageByRun.get(String(run.runId ?? ''));
      m.tokenUsage = {
        promptTokens: Number(run.promptTokens) || 0,
        completionTokens: Number(run.completionTokens) || 0,
        durationMs: run.durationMs != null ? Number(run.durationMs) : undefined,
        cachedTokens: agg && agg.cachedTokens > 0 ? Number(agg.cachedTokens) : undefined,
        model: agg?.model,
      };
    }
  }
  return next;
}

/** 后端 navigate ui_action 参数 → 路由路径 */
function navigatePathFor(target: string, args: any): string | null {  switch (target) {
    case 'home': return '/chat';
    case 'admin':
      // 设置二级区（对话优先 IA）：模板/Agent 配置；工作流管理是应用态一级页面
      if (args?.tab === 'templates') return '/manage/templates';
      if (args?.tab === 'agent') return '/manage/agent-config';
      return '/workflows';
    case 'releases': return '/releases';
    case 'editor': return args?.workflowCode ? `/editor/${args.workflowCode}` : '/editor';
    case 'templateEditor': return `/template-editor/${args?.templateCode}`;
    default: return null;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 草稿会话（draft- 前缀的本地 key）的元信息：首条消息发送时据此物化真实会话。
 * inheritWorkflowCode = 新建任务选择的「继承已有工作流」：物化后 seedDraft 带上其当前落版。
 */
interface DraftMeta {
  scope: 'chat' | 'work';
  folderId: number | null;
  inheritWorkflowCode?: string | null;
}

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
  /** 新任务草稿的选项（所属项目 / 继承工作流）；仅 currentSessionKey 是 draft- 时非空 */
  const [draftSetup, setDraftSetup] = useState<{ folderId: number | null; inheritWorkflowCode: string | null } | null>(null);

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

  // 兼容占位：后端自治模式下工具/计划/确认都在后端，前端不再执行
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  void setActivePlan;

  // refs
  const currentSessionKeyRef = useRef<string | null>(null);
  const draftMetaRef = useRef<Map<string, DraftMeta>>(new Map());
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
    // 画布文档是模块级单例：切会话时只保留「不属于任何会话」的页面级内容
    // （编辑器/工作流库载入，ownerSession 为空）。带归属的画布（AI 产出/草稿恢复）
    // 若归属的不是这个会话，一律清空 —— 旧会话的产物不许漏进新会话的产物面板。
    const canvasSnapshot = workflowDocumentStore.getSnapshot();
    const canvasOwner = canvasSnapshot.meta.ownerSession;
    const canvasForeign = !canvasSnapshot.doc.isEmpty && (
      (canvasOwner != null && canvasOwner !== sessionKey) ||
      // 兼容没有归属标记的旧现场：仅回收「AI 产出、此后没人动过」的内容
      (canvasOwner == null && canvasSnapshot.meta.producedBy === 'ai')
    );
    if (canvasForeign) {
      workflowDocumentStore.clear();
    }
    agentApi.getMessages(sessionKey).then((msgs) => {
      // 竞态 guard：只有仍是当前会话的响应才允许落地
      if (currentSessionKeyRef.current !== sessionKey) return;
      // 幂等合并：若 SSE 快照先到并建了 live 占位行 / ask 提问卡，历史整表替换不得抹掉它们
      setMessages((prev) => appendEphemeralRows(convertMessages(msgs || []), prev, liveAssistantIdRef.current));
    }).catch(() => {});
    // run 级 token 账：挂在各轮 assistant 回复尾部（dsh turn-usage 持久化对位物）；
    // turn-usage 聚合补缓存命中/模型，两路任一失败不阻塞另一方
    Promise.all([
      agentApi.getSessionRuns(sessionKey).catch(() => []),
      agentApi.getTurnUsage(sessionKey).catch(() => []),
    ]).then(([runs, turnUsage]) => {
      if (currentSessionKeyRef.current !== sessionKey) return;
      setMessages((prev) => attachRunUsage(prev, runs, liveAssistantIdRef.current, turnUsage));
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
    // 新建对话只生成本地草稿 key，不请求后端；首条消息发送时（postMessage）才真正创建会话。
    // 归属项目 / 继承工作流等「新任务选项」在欢迎页调整，由 updateDraftSetup 写回元信息。
    const key = `draft-${nanoid(8)}`;
    draftMetaRef.current.set(key, {
      scope: opts?.scope || 'chat',
      folderId: opts?.folderId ?? null,
      inheritWorkflowCode: null,
    });
    setDraftSetup({ folderId: opts?.folderId ?? null, inheritWorkflowCode: null });
    setCurrentSessionKey(key);
    setMessages([]);
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
      };
      const meta = draftMetaRef.current.get(key);
      if (meta) {
        draftMetaRef.current.set(key, {
          scope: next.folderId != null ? 'work' : 'chat',
          folderId: next.folderId,
          inheritWorkflowCode: next.inheritWorkflowCode,
        });
      }
      return next;
    });
  }, []);

  const switchSession = useCallback(async (sessionKey: string) => {
    if (currentSessionKeyRef.current && currentSessionKeyRef.current !== sessionKey) {
      draftMetaRef.current.delete(currentSessionKeyRef.current);
      if (currentSessionKeyRef.current.startsWith('draft-')) setDraftSetup(null);
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
        setMessages((prev) =>
          placeArtifactCards(
            appendEphemeralRows(convertMessages(msgs || []), prev, liveAssistantIdRef.current),
            artifactStore.latestAll(sessionKey)
          )
        );
        opts?.onSettled?.();
      }
    }).catch(() => {
      // 重载失败：保留 live 现场（store.timeline 内容仍完整可见），不摘占位
    });
    // run 级 token 账随历史一起收敛（run_end 先于 done，但 live 小结卡会随占位行退场——
    // 持久化展示靠这里的回复尾部用量）
    Promise.all([
      agentApi.getSessionRuns(sessionKey).catch(() => []),
      agentApi.getTurnUsage(sessionKey).catch(() => []),
    ]).then(([runs, turnUsage]) => {
      if (currentSessionKeyRef.current !== sessionKey) return;
      setMessages((prev) => attachRunUsage(prev, runs, liveAssistantIdRef.current, turnUsage));
    }).catch(() => {});
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

  /** 发送消息：入队，串行触发后端自治运行。返回 false = 发送前被拦截（输入应保留） */
  const sendMessage = useCallback(
    async (text: string, images?: string[]): Promise<boolean> => {
      let sessionKey = currentSessionKeyRef.current;
      if (!sessionKey) return false;

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
          setDraftSetup(null);
          // 「继承已有工作流」：物化后把所选工作流当前落版 seed 进会话草稿，
          // AI 的上下文起点即该工作流（服务端草稿，本地空画布不会覆盖它）
          if (draft.inheritWorkflowCode) {
            try {
              await agentApi.seedDraft(sessionKey, draft.inheritWorkflowCode);
              bindSessionToWorkflow(sessionKey, draft.inheritWorkflowCode);
            } catch (e) {
              setMessages((prev) => [
                ...prev,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: `[提示] 工作流继承失败：${(e as Error).message}。任务已创建，可继续对话，或在任务列表重新发起。`,
                  timestamp: Date.now(),
                },
              ]);
            }
          }
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            { id: nanoid(), role: 'assistant', content: `[错误] ${(e as Error).message}`, timestamp: Date.now() },
          ]);
          return false;
        }
      }

      // 提问前同步（阶段 2.1 → 全会话）：AI 读的是服务端会话草稿，而用户手改可能
      // 只落在本地 —— 不先推上去 AI 就基于旧参数回答。/chat 与编辑器一视同仁
      // （空画布自动跳过）；同步失败则拦截本次提问并保留输入（宁可明确失败，
      // 不让 AI 抢答一份过时上下文）。
      if (!liveStreamStore.getSnapshot().streaming) {
        const sync = await pushCanvasDraftToSession(sessionKey, { source: 'ask' });
        if (!sync.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: 'assistant',
              content: `[错误] 画布同步失败：${sync.error || '未知错误'}。本次未发送，请检查网络后重试。`,
              timestamp: Date.now(),
            },
          ]);
          return false;
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
      return true;
    },
    [postMessage, refreshFolders, location.pathname]
  );

  /** 停止当前运行：通知后端停止（协作式中断，主循环在下一个检查点退出）。
   *
   * 阶段 3.2 语义：停止请求发出后进入「停止中」（stopping），流仍视为进行中 ——
   * 后端确认（done/interrupted 终态事件 → settleRun）之前不显示「已停止」；
   * 请求失败回到运行态并提示可重试，不再吞错假装停了。终态事件 10s 未到时
   * 兜底强制收敛（连接可能已断，live 占位行不能永远悬挂）。 */
  const stopStreaming = useCallback(() => {
    const sessionKey = currentSessionKeyRef.current;
    setQueueLength(0);

    const finishStopLocally = () => {
      // 停止也是一轮结束：把已发生的 AI 变更定格为会话版本
      workflowDocumentStore.captureAiRunSnapshot(liveAssistantIdRef.current ?? undefined);
      liveStreamStore.endRun();
      setStreaming(false);
    };

    if (!sessionKey || sessionKey.startsWith('draft-')) {
      finishStopLocally(); // 本地草稿没有可停的后端 run
      return;
    }
    if (liveStreamStore.getSnapshot().stopping) return; // 停止请求已发出，等待确认

    liveStreamStore.beginStop();
    void agentApi.stopRun(sessionKey).then(
      () => {
        // 请求已受理：终态事件（done/interrupted）经 run 收敛入口 settleRun 真正结束；
        // 10s 兜底防占位行悬挂（SSE 断线时终态永远不来）
        setTimeout(() => {
          if (currentSessionKeyRef.current === sessionKey && liveStreamStore.getSnapshot().streaming) {
            finishStopLocally();
            if (liveAssistantIdRef.current) settleRun(sessionKey);
          }
        }, 10_000);
      },
      (error) => {
        // 停止失败：回到运行态，明确报错可重试（旧行为吞错 + 立即假停止）
        liveStreamStore.cancelStop();
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: 'assistant',
            content: `[错误] 停止请求失败：${(error as Error).message}。运行仍在进行，可重试停止。`,
            timestamp: Date.now(),
          },
        ]);
      }
    );
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
          // 显式归属：草稿恢复填进来的画布属于本会话 —— 切到别的会话（含新建对话）
          // 时按归属清空。只靠 replace(source:'ai') 不写 meta，producedBy/lastChange
          // 守卫全都看不到它，产物残留就是这么漏出去的
          workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: sessionKey });
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
    // 事件活账本随订阅生命周期重置：派生视图（轨迹面板）从这里增量读取
    sessionEventStore.reset(sessionKey);

    const controller = new AbortController();
    let disposed = false;

    const handlers: SseHandlers = {
      onOpen: () => {
        if (disposed) return;
        liveStreamStore.markConnected();
      },
      onRawEvent: (type, data) => {
        if (disposed) return;
        sessionEventStore.append(sessionKey, type, data);
      },
      onRunState: (data) => {
        if (disposed) return;
        const status = data?.status;
        if (status === 'running') {
          setStreaming(true);
          // 新 run 边界：账本清零计当前 run，派生方在边界处做一次权威重拉
          sessionEventStore.markRunStart(data.runId);
          // 守卫：已在流式中（SSE 重连的快照回放）不得重置 store ——
          // 否则挂起的 timeline/排队指示被清空，现场丢失。
          // 快照带后端 run 真实起点：刷新后秒表从原点续走，而不是从 0 重计
          if (!liveStreamStore.getSnapshot().streaming) {
            liveStreamStore.beginRun(Number((data as any).startedAt) || undefined);
          }
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
              if (call.result) liveStreamStore.resolveTool(call.id, String(call.result));
            }
          }
          // 快照里的产物列表（SessionEventBus 反哺）对齐 store（断线重连恢复现场）
          const snapshotArts = (data as any).artifacts || [];
          if (snapshotArts.length > 0) {
            artifactStore.setAll(sessionKey, snapshotArts);
            setMessages((prev) => placeArtifactCards(prev, snapshotArts));
          }
          // 快照里的挂起提问（刷新/断线重连后恢复交互卡，后端仍在等待这个回答；
          // 否则卡片永久丢失，run 挂到 5 分钟超时才继续）
          const pendingAsk = (data as any).pendingAsk;
          if (pendingAsk?.askId) {
            setMessages((prev) => upsertAskRow(prev, {
              askId: String(pendingAsk.askId),
              question: pendingAsk.question || '',
              options: pendingAsk.options,
              answered: false,
            }));
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
        liveStreamStore.resolveTool(data.toolCallId, data.payload || '');
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
        // 编辑器（专家模式）页面画布归工作流所有：只有「归属本工作流的会话」的
        // document 才允许进入应用/待应用 —— 无关会话（如「最近会话」自动恢复的
        // 别处对话）的草稿事件不得顶掉工作流画布（实测会把首挂竞争中的画布顶成空白）
        if (/^\/(editor|template-editor)/.test(pathnameRef.current)) {
          const wfCode = workflowDocumentStore.getSnapshot().meta.workflowCode;
          if (wfCode && getWorkflowOfSession(sessionKey) !== wfCode) return;
        }
        // 守卫按需化：本地有「尚未同步到服务端草稿的手改」时才拦截成
        // 「待应用变更」（防 AI 整表替换冲掉手改）；本地干净
        // （手改已自动同步 / 没动过）则直接应用 —— 编辑器是草稿区，改错有快照/回滚兜底。
        if (/^\/(editor|template-editor)/.test(pathnameRef.current) && hasUnsyncedLocalEdits()) {
          try {
            if (data?.dsl && Array.isArray(data.dsl.nodes) && data.dsl.nodes.length > 0) {
              const base = workflowDocumentStore.getSnapshot().doc.toJSON();
              aiPendingChangeStore.set(data.dsl, base, liveAssistantIdRef.current ?? undefined);
            }
          } catch { /* ignore */ }
          return;
        }
        try {
          if (data?.dsl && Array.isArray(data.dsl.nodes) && data.dsl.nodes.length > 0) {
            const dsl = data.dsl;
            // 归因到当前流式助手消息（事件到达时定格）；应用走 250ms 合并（见 scheduleDocumentApply）
            const owner = { sessionKey, messageId: liveAssistantIdRef.current ?? undefined };
            scheduleDocumentApply(() => {
              if (currentSessionKeyRef.current !== owner.sessionKey) return;
              // 回声抑制：手改自动同步 / 保存回推触发的服务端广播回到自己手上时，
              // 再应用一次会误置「未保存」标记、污染快照归属（阶段 1.3 实测：
              // 保存成功后「未保存」复发的根因）。按「推送指纹」识别 —— 画布侧
              // 与 store 侧序列化字段集不同，与本地直接对比判不出这种回声
              if (isEchoOfLastPush(dsl)) {
                markSyncedWithServer();
                return;
              }
              workflowDocumentStore.replace(WorkflowDocument.fromJSON(dsl), {
                kind: 'replace',
                source: 'ai',
                reason: 'ai-edit',
                messageId: owner.messageId,
              });
              // 归属当前会话：切走后按归属清空（见草稿恢复处的注释）
              workflowDocumentStore.setMeta({ producedBy: 'ai', ownerSession: owner.sessionKey });
              // store 内容此刻即服务端草稿内容：恢复「已同步」状态，后续 AI 修改继续直通
              markSyncedWithServer();
            });
          }
        } catch { /* ignore */ }
      },
      onArtifact: (data) => {
        if (disposed) return;
        if (data?.action === 'upsert' && data.artifact?.artifactKey) {
          const art = data.artifact;
          artifactStore.upsert(sessionKey, art);
          // release 直接成为对话流里的产物卡（test_report 由 run 工具行承载）
          if (art.type === 'release') {
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
      onAskRequest: (data) => {
        if (disposed) return;
        if (!data?.askId || currentSessionKeyRef.current !== sessionKey) return;
        // ask_user 提问卡：独立消息行（id 稳定，ask_resolved 与重放快照都能幂等 upsert）
        setMessages((prev) => upsertAskRow(prev, {
          askId: data.askId,
          question: data.question || '',
          options: data.options,
          answered: false,
        }));
      },
      onAskResolved: (data) => {
        if (disposed) return;
        if (!data?.askId) return;
        // 本窗口作答的乐观收敛 + 其他窗口代答/超时自动代答的同步收敛共用此路径
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.ask && m.ask.askId === data.askId && !m.ask.answered
              ? { ...m, ask: { ...m.ask, answered: true, answer: data.answer, auto: !!data.auto } }
              : m
          );
          // 答案成为新一轮对话：立即以用户消息上屏（后端已落库，
          // run 收敛重载后由真实历史行接管，气泡 id 稳定保证多窗口幂等）
          const bubbleId = `ask-answer-${data.askId}`;
          if (data.answer && !next.some((m) => m.id === bubbleId)) {
            next.push({ id: bubbleId, role: 'user', content: data.answer, timestamp: Date.now() });
          }
          return next;
        });
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
        // 失败原因由后端 persistRunError 落库（先落库再发 error 事件），
        // settleRun 的 reload 会带回 —— 前端再追加一条 [错误] 行会与库里的
        // 「⚠️ 本次执行失败」同时渲染，出现两个 AI 头像的重复错误行
        settleRun(sessionKey);
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
      if (docApplyTimer) {
        clearTimeout(docApplyTimer);
        docApplyTimer = null;
      }
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
    activePlan,
    injectCanvasInfo,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}
