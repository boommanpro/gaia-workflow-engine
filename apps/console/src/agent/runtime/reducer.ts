/**
 * 会话运行时 reducer —— 事件 → 状态的唯一换算点（纯函数，可全量单测）。
 *
 * 取代旧架构里散落在 AgentContext 的 20 个 SSE handler + live-stream-store 的
 * 时间线维护 + artifact-store 的产物表：所有事件进一个 switch，产出新的规范化状态。
 *
 * 状态收敛纪律（沿承 dsh：UI 状态从条目自身完备性推导，不靠「等下一个事件」）：
 *  · 时间线上至多一个「打开」的 text/thinking 条目 —— 异类条目入场先关闭尾部；
 *  · 终态（done/error/stopped）关闭全部打开条目；
 *  · tool_call 按 id 幂等（断线重放不重复），tool_result 按 id 回填；
 *  · seq 单调去重：重连重放的旧事件直接忽略。
 */
import type {
  AgentArtifactDto,
  AgentMessage,
  DisplayMessage,
  TimelineItem,
} from '../types';
import type { RuntimeState } from './state';
import {
  rebuildMessages,
  upsertArtifactCard,
  upsertAskRow,
  upsertPlanCard,
} from './messages';

export type RuntimeAction =
  | { type: 'reset'; sessionKey: string | null }
  | { type: 'connected' }
  | { type: 'reconnecting' }
  /** POST /run 受理（turn 事件晚到时也已有现场） */
  | { type: 'run-accepted' }
  | { type: 'begin-stop' }
  | { type: 'cancel-stop' }
  /** run 终态落定（timeline 条目全部收尾、streaming=false；历史收敛由宿主驱动） */
  | { type: 'end-run' }
  /** 历史收敛完成：摘除 live 占位行 */
  | { type: 'live-clear' }
  | { type: 'optimistic-user'; text: string; images?: string[] }
  | { type: 'error-row'; text: string }
  | { type: 'queue-inc' }
  | { type: 'queue-reset' }
  /** document 全量已由宿主应用（GET /document 兜底 / 首次加载） */
  | { type: 'doc-synced'; version: number }
  /** 会话切换/加载时的全量历史（history + artifacts + token 账） */
  | {
      type: 'history';
      history: AgentMessage[];
      artifacts?: AgentArtifactDto[];
      runs?: any[];
      turnUsage?: any[];
    }
  /** 开始拉取整段会话历史（切换目标会话时置位；history 落位时清除） */
  | { type: 'history-begin' }
  /** 子代理调试：开一条子代理行（SubagentCard 渲染） */
  | { type: 'subagent-open'; id: string }
  /** 子代理调试：原地更新该行的 subagentSteps/Result（mutate 为纯函数） */
  | { type: 'subagent-patch'; id: string; mutate: (m: DisplayMessage) => DisplayMessage }
  | { type: 'event'; seq?: number; name: string; data: any };

/** 高频流式帧（rAF 合帧发布的判定依据） */
export function isStreamFrame(action: RuntimeAction): boolean {
  return action.type === 'event' && (action.name === 'token' || action.name === 'thinking');
}

export function reduce(state: RuntimeState, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case 'reset':
      return RuntimeStateInitial(action.sessionKey);
    case 'connected':
      if (state.connection === 'connected') return state;
      return { ...state, connection: 'connected' };
    case 'reconnecting':
      if (state.connection === 'reconnecting') return state;
      return { ...state, connection: 'reconnecting' };
    case 'run-accepted':
      // run 进行中再发 = steering（同一 run 的 turn 边界注入），现场不动
      if (state.streaming) return { ...state, stopping: false };
      // 新 run 起点：上一轮的流式现场必须清空（timeline/content/thinking 属于上一个 run），
      // 否则本轮 live 行一建立就把上一轮回复原样渲染出来（用户实测：第二轮回复 = 上一轮内容）
      return {
        ...freshRunScene(state),
        streaming: true,
        stopping: false,
        startedAt: Date.now(),
        lastEventAt: Date.now(),
      };
    case 'begin-stop':
      if (!state.streaming || state.stopping) return state;
      return { ...state, stopping: true };
    case 'cancel-stop':
      if (!state.stopping) return state;
      return { ...state, stopping: false };
    case 'end-run':
      return {
        ...state,
        streaming: false,
        stopping: false,
        currentTool: null,
        timeline: closeOpenTail(state.timeline),
      };
    case 'live-clear': {
      if (!state.liveMessageId) return state;
      // 上一轮的 settle 晚于新一轮起跑（steering 链式起跑 / 快速连发）：新 run 正在复用这条
      // live 行流式输出，此时摘除会让进行中的回复从对话流消失——留给本轮自己的 settle 摘
      if (state.streaming) return state;
      const messages = state.messages.filter((m) => m.id !== state.liveMessageId);
      return { ...state, messages, liveMessageId: null };
    }
    case 'optimistic-user':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `local-${state.messages.length}-${Date.now()}`,
            role: 'user',
            content: action.text,
            ...(action.images && action.images.length ? { images: action.images } : {}),
            timestamp: Date.now(),
          },
        ],
      };
    case 'error-row': {
      const last = state.messages[state.messages.length - 1];
      if (last && last.role === 'assistant' && last.content === action.text) return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: `err-${state.messages.length}-${Date.now()}`, role: 'assistant', content: action.text, timestamp: Date.now() },
        ],
      };
    }
    case 'queue-inc':
      return { ...state, queueLength: state.queueLength + 1 };
    case 'queue-reset':
      if (state.queueLength === 0) return state;
      return { ...state, queueLength: 0 };
    case 'doc-synced':
      if (state.docVersion === action.version && !state.docDesync) return state;
      return { ...state, docVersion: action.version, docDesync: false };
    case 'history-begin':
      if (state.historyLoading) return state;
      return { ...state, historyLoading: true };
    case 'history':
      return {
        ...state,
        historyLoading: false,
        artifacts: action.artifacts ?? state.artifacts,
        messages: rebuildMessages({
          history: action.history,
          prev: state.messages,
          liveId: state.liveMessageId,
          artifacts: action.artifacts ?? state.artifacts,
          runs: action.runs,
          turnUsage: action.turnUsage,
        }),
      };
    case 'subagent-open':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.id, role: 'tool', content: '', subagentSteps: [], timestamp: Date.now() },
        ],
      };
    case 'subagent-patch': {
      const idx = state.messages.findIndex((m) => m.id === action.id);
      if (idx < 0) return state;
      const messages = [...state.messages];
      messages[idx] = action.mutate(messages[idx]);
      return { ...state, messages };
    }
    case 'event':
      return reduceEvent(state, action);
    default:
      return state;
  }
}

function reduceEvent(state: RuntimeState, action: Extract<RuntimeAction, { type: 'event' }>): RuntimeState {
  const { name, data, seq } = action;
  // seq 单调去重：断线重放的旧事件直接忽略（未带 seq 的旧协议帧放行）
  if (seq != null && Number.isFinite(seq) && seq <= state.lastSeq) {
    // run_state 从不入缓冲重放（只有 setState 广播 + 订阅快照），其 seq 回退只可能是服务端
    // 频道已重建（后端重启 / 空闲回收）从头计数——不对齐游标，这条频道之后的所有事件都会
    // 被当作旧帧丢弃，表现为「刷新前永远收不到新回复」
    const channelRebuilt = name === 'run_state' && seq < state.lastSeq;
    if (!channelRebuilt) return state;
  }
  let next: RuntimeState = { ...state, lastEventAt: Date.now() };
  if (seq != null && Number.isFinite(seq)) {
    next.lastSeq = seq;
  }

  switch (name) {
    case 'run_state':
      return reduceRunState(next, data);
    case 'turn': {
      next.streaming = true;
      next.turn = data?.turn ?? next.turn;
      next.maxTurns = data?.maxTurns || next.maxTurns;
      if (data?.contextTokens != null) next.contextTokens = data.contextTokens;
      next.timeline = closeOpenTail(next.timeline);
      next = ensureLiveRow(next, `live-turn-${data?.turn ?? Date.now()}`);
      return next;
    }
    case 'token': {
      const chunk = data?.content;
      if (!chunk) return state;
      if (!next.streaming) next.streaming = true;
      next = appendTimelineText(next, 'text', chunk);
      next.content += chunk;
      return ensureLiveRow(next);
    }
    case 'thinking': {
      const chunk = data?.content;
      if (!chunk) return state;
      if (!next.streaming) next.streaming = true;
      next = appendTimelineText(next, 'thinking', chunk);
      next.thinking += chunk;
      return ensureLiveRow(next);
    }
    case 'tool_call': {
      next.streaming = true;
      next.currentTool = data?.name ?? null;
      next.timeline = closeOpenTail(next.timeline);
      const id = data?.id ?? `call-${next.timeline.length}`;
      if (!next.timeline.some((i) => i.kind === 'tool' && i.id === id)) {
        next.timeline = [
          ...next.timeline,
          {
            kind: 'tool',
            id,
            call: { id, action: data?.name ?? 'unknown', args: data?.args ?? {} },
            startedAt: Date.now(),
          },
        ];
      }
      return ensureLiveRow(next);
    }
    case 'tool_result': {
      const id = data?.toolCallId;
      if (!id) return next;
      next.currentTool = null;
      const result = data?.payload ?? '';
      next.timeline = next.timeline.map((item) =>
        item.kind === 'tool' && item.id === id
          ? { ...item, endedAt: Date.now(), call: { ...item.call, result } }
          : item
      );
      return next;
    }
    case 'plan': {
      // plan 行进消息流（TodoCard 顶部提取 + 历史回放兜底）；upsertPlanCard 内部幂等
      next.messages = upsertPlanCard(next.messages, { id: data?.id || 'todo', steps: data?.steps || [] });
      return next;
    }
    case 'document': {
      // DSL 本体由宿主应用到画布 store；这里只跟踪版本与失步标记
      const version = Number(data?.version);
      if (Number.isFinite(version) && version > 0) {
        next.docVersion = version;
        if (!data?.dsl) {
          const base = Number(data?.baseVersion);
          next.docDesync = !(Number.isFinite(base) && base === state.docVersion);
        } else {
          next.docDesync = false;
        }
      }
      return next;
    }
    case 'artifact': {
      if (data?.action === 'upsert' && data.artifact?.artifactKey) {
        const art = data.artifact as AgentArtifactDto;
        const idx = next.artifacts.findIndex((a) => a.artifactKey === art.artifactKey);
        next.artifacts =
          idx >= 0
            ? next.artifacts.map((a, i) => (i === idx ? { ...a, ...art } : a))
            : [...next.artifacts, art];
        // release 直接成为对话流里的产物卡（test_report 由 run 工具行承载）
        if (art.type === 'release') {
          next.messages = upsertArtifactCard(next.messages, art);
        }
      } else if (data?.action === 'state' && data.artifactKey) {
        next.artifacts = next.artifacts.map((a) =>
          a.artifactKey === data.artifactKey ? { ...a, status: data.status || a.status } : a
        );
      }
      return next;
    }
    case 'ui_action':
      // 路由跳转等宿主副作用，无状态
      return next;
    case 'ask_request': {
      if (!data?.askId) return next;
      next.messages = upsertAskRow(next.messages, {
        askId: String(data.askId),
        question: data.question || '',
        options: data.options,
        answered: false,
      });
      return next;
    }
    case 'ask_resolved': {
      if (!data?.askId) return next;
      let messages = next.messages.map((m) =>
        m.ask && m.ask.askId === data.askId && !m.ask.answered
          ? { ...m, ask: { ...m.ask, answered: true, answer: data.answer, auto: !!data.auto } }
          : m
      );
      // 答案成为新一轮对话：立即以用户消息上屏（历史收敛后由真实行接管，id 稳定幂等）
      const bubbleId = `ask-answer-${data.askId}`;
      if (data.answer && !messages.some((m) => m.id === bubbleId)) {
        messages = [
          ...messages,
          { id: bubbleId, role: 'user', content: data.answer as string, timestamp: Date.now() },
        ];
      }
      next.messages = messages;
      return next;
    }
    case 'repeat_reminder':
    case 'wrap_up':
    case 'delivery_warning':
    case 'llm_retry':
    case 'interrupted':
    case 'run_interrupted':
    case 'compaction':
      return addNotice(next, noticeFor(name, data));
    case 'run_end':
      return addRunSummary(next, data);
    case 'assistant_settled':
      // 正文落定：无状态（历史收敛由 done 驱动）
      return next;
    case 'steering_queued':
      return next;
    case 'done':
    case 'error': {
      // 终态：关闭全部打开条目；历史收敛 / 错误行由宿主（settle 协议）驱动
      return {
        ...next,
        streaming: false,
        stopping: false,
        currentTool: null,
        queueLength: 0,
        timeline: closeOpenTail(next.timeline),
      };
    }
    default:
      // llm_request / llm_end / run_input / skill_loaded / debug_* 等：账本事件，无运行时状态
      return next;
  }
}

function reduceRunState(state: RuntimeState, data: any): RuntimeState {
  let next = state;
  const status = data?.status;
  if (status === 'running') {
    const incomingRunId = data?.runId != null ? String(data.runId) : null;
    if (incomingRunId && incomingRunId !== state.runId) {
      // 新 run 边界：起跑快照没有 timeline（后端 startExecution 建的是空现场），
      // 沿用旧现场等于把上一轮回复带进本轮 live 行；同 runId 的重连快照不走这里
      next = freshRunScene(next);
    }
    next.streaming = true;
    next.runId = incomingRunId ?? next.runId;
    const startedAt = Number(data?.startedAt);
    if (Number.isFinite(startedAt) && startedAt > 0) next.startedAt = startedAt;
    if (data?.turn != null) next.turn = Number(data.turn);
    // 快照带交错时间线时按真实顺序整体重建现场；旧后端（无 timeline）退化为单条文本坍缩
    const snapTimeline = data?.timeline || [];
    if (snapTimeline.length > 0) {
      next.timeline = timelineFromSnapshot(snapTimeline);
      next.content = data.assistantContent
        || snapTimeline.filter((i: any) => i.kind === 'text').map((i: any) => i.text || '').join('');
      next.thinking = data.thinking
        || snapTimeline.filter((i: any) => i.kind === 'thinking').map((i: any) => i.text || '').join('');
    } else if ((data?.assistantContent || '').length > 0 || (data?.thinking || '').length > 0) {
      next.timeline = data.assistantContent
        ? [{ kind: 'text', id: 'txt-replay', text: data.assistantContent, closed: false }]
        : closeOpenTail(next.timeline);
      next.content = data.assistantContent || '';
    }
    // 快照里的工具调用按序补进时间线（仅旧快照无 timeline 时需要）
    if (snapTimeline.length === 0 && Array.isArray(data?.toolCalls)) {
      for (const call of data.toolCalls) {
        if (!call?.id) continue;
        if (!next.timeline.some((i) => i.kind === 'tool' && i.id === call.id)) {
          next.timeline = [
            ...closeOpenTail(next.timeline),
            {
              kind: 'tool',
              id: call.id,
              call: { id: call.id, action: call.name || 'unknown', args: call.args ?? {}, ...(call.result != null ? { result: String(call.result) } : {}) },
              startedAt: Date.now(),
            },
          ];
        }
      }
    }
    // 快照产物（SessionEventBus 反哺）对齐（断线重连恢复现场）
    const snapshotArts = (data?.artifacts || []) as AgentArtifactDto[];
    if (snapshotArts.length > 0) {
      next.artifacts = mergeArtifacts(next.artifacts, snapshotArts);
      for (const art of snapshotArts) {
        if (art.type === 'release') next.messages = upsertArtifactCard(next.messages, art);
      }
    }
    // 快照里的挂起提问（刷新/断线重连后恢复交互卡，后端仍在等待这个回答）
    const pendingAsk = data?.pendingAsk;
    if (pendingAsk?.askId) {
      next.messages = upsertAskRow(next.messages, {
        askId: String(pendingAsk.askId),
        question: pendingAsk.question || '',
        options: pendingAsk.options,
        answered: false,
      });
    }
    // 快照画布版本（失步时宿主拉全量）
    if (Number.isFinite(Number(data?.docVersion))) {
      next.docVersion = Number(data.docVersion);
    }
    return ensureLiveRow(next, data?.runId ? `live-${data.runId}` : undefined);
  }

  // idle / done / error / stopped
  next = {
    ...next,
    streaming: false,
    stopping: false,
    currentTool: null,
    queueLength: 0,
    timeline: closeOpenTail(next.timeline),
  };
  if (Number.isFinite(Number(data?.docVersion))) {
    next.docVersion = Number(data.docVersion);
  }
  // 运行失败发生在订阅建立之前时，error 只能从快照恢复 —— 必须渲染，否则表现为「没反应」
  if (status === 'error' && data?.error) {
    const errText = `[错误] ${data.error}`;
    const last = next.messages[next.messages.length - 1];
    if (!(last && last.role === 'assistant' && last.content === errText)) {
      next.messages = [
        ...next.messages,
        { id: `err-snap-${next.messages.length}`, role: 'assistant', content: errText, timestamp: Date.now() },
      ];
    }
  }
  return next;
}

// ---------------- 时间线工具（沿承 live-stream-store 语义） ----------------

/**
 * 新 run 的空现场：流式现场（timeline/content/thinking/currentTool/turn）属于单个 run，
 * 跨 run 复用会把上一轮回复渲染进本轮 live 行。消息列表、产物、seq 游标、连接状态
 * 都是会话级的，这里不动；live 行 id 也不动（stale 行由 live-clear 按 settle 协议摘除）。
 */
function freshRunScene(state: RuntimeState): RuntimeState {
  return { ...state, timeline: [], content: '', thinking: '', currentTool: null, turn: 0 };
}

function closeOpenTail(timeline: TimelineItem[]): TimelineItem[] {
  const last = timeline[timeline.length - 1];
  if (last && (last.kind === 'text' || last.kind === 'thinking') && last.closed !== true) {
    return [...timeline.slice(0, -1), { ...last, closed: true }];
  }
  return timeline;
}

function appendTimelineText(state: RuntimeState, kind: 'text' | 'thinking', chunk: string): RuntimeState {
  const timeline = state.timeline;
  const last = timeline[timeline.length - 1];
  if (last && last.kind === kind && last.closed !== true) {
    return { ...state, timeline: [...timeline.slice(0, -1), { ...last, text: last.text + chunk }] };
  }
  return {
    ...state,
    timeline: [...closeOpenTail(timeline), { kind, id: `${kind === 'text' ? 'txt' : 'thk'}-${timeline.length}`, text: chunk, closed: false }],
  };
}

/** 快照时间线 → 现场时间线（「最后一条 text/thinking 仍流式、其余已收尾」推断） */
function timelineFromSnapshot(timeline: any[]): TimelineItem[] {
  const rebuilt: TimelineItem[] = [];
  for (const item of timeline || []) {
    if (!item || !item.kind) continue;
    if (item.kind === 'tool') {
      rebuilt.push({
        kind: 'tool',
        id: item.id || item.call?.id || `tool-${rebuilt.length}`,
        call: {
          id: item.call?.id || item.id || '',
          action: item.call?.name || 'unknown',
          args: item.call?.args ?? {},
          ...(item.call?.result != null ? { result: String(item.call.result) } : {}),
        },
      });
    } else if (item.kind === 'notice') {
      rebuilt.push({ kind: 'notice', id: item.id || `notice-${rebuilt.length}`, text: item.text || '', source: item.source });
    } else {
      rebuilt.push({ kind: item.kind, id: item.id || `snap-${item.kind}-${rebuilt.length}`, text: item.text || '' });
    }
  }
  const last = rebuilt[rebuilt.length - 1];
  if (last && (last.kind === 'text' || last.kind === 'thinking')) {
    rebuilt[rebuilt.length - 1] = { ...last, closed: false };
  }
  for (let i = rebuilt.length - 2; i >= 0; i--) {
    const it = rebuilt[i];
    if (it.kind === 'text' || it.kind === 'thinking') rebuilt[i] = { ...it, closed: true };
  }
  return rebuilt;
}

function addNotice(state: RuntimeState, notice: { text: string; source?: string; meta?: Record<string, any> }): RuntimeState {
  if (!notice.text) return state;
  return {
    ...state,
    timeline: [
      ...closeOpenTail(state.timeline),
      { kind: 'notice', id: `notice-${Date.now()}-${state.timeline.length}`, text: notice.text, ...(notice.source ? { source: notice.source } : {}), ...(notice.meta ? { meta: notice.meta } : {}) },
    ],
  };
}

function noticeFor(name: string, data: any): { text: string; source: string; meta?: Record<string, any> } {
  switch (name) {
    case 'repeat_reminder':
      return { source: 'repeat', text: data?.message || '', meta: { hardStop: !!data?.hardStop } };
    case 'wrap_up':
      return { source: 'wrap_up', text: data?.message || data?.reason || '' };
    case 'delivery_warning':
      return { source: 'delivery', text: data?.message || '交付未经验证' };
    case 'llm_retry':
      return {
        source: 'llm_retry',
        text: `模型响应异常（${data?.code || 'RETRY'}），第 ${data?.attempt ?? '-'} 次自动重试…`,
        meta: { attempt: data?.attempt, delayMs: data?.delayMs },
      };
    case 'interrupted':
    case 'run_interrupted':
      return { source: 'interrupted', text: '⏹ 本次运行已被中断，已完成的部分保持有效。' };
    case 'compaction':
      if (data?.kind === 'prune') {
        return { source: 'compaction', text: `📜 历史过长，已裁剪 ${data.dropped ?? '?'} 条（保留最近 ${data.after ?? '?'} 条）` };
      }
      return { source: 'compaction', text: `📜 已压缩历史：摘要了 ${data?.removed ?? '?'} 条消息（压缩前 ≈${data?.tokenPercentageBefore ?? '?'}% 上下文）` };
    default:
      return { source: name, text: data?.message || '' };
  }
}

function addRunSummary(state: RuntimeState, runEnd: any): RuntimeState {
  const secs = runEnd?.durationMs != null ? (runEnd.durationMs / 1000).toFixed(1) : null;
  const toolSecs = runEnd?.toolTimeMs != null ? (runEnd.toolTimeMs / 1000).toFixed(1) : null;
  const parts: string[] = [];
  if (secs) parts.push(`共 ${secs}s`);
  if (toolSecs) parts.push(`工具 ${toolSecs}s`);
  if (runEnd?.turns) parts.push(`模型 ${runEnd.turns} 轮`);
  if (runEnd?.llmRetries) parts.push(`重试 ${runEnd.llmRetries} 次`);
  if (!parts.length && !(runEnd?.promptTokens || runEnd?.completionTokens)) return state;
  const text = `⏱ 本轮时间账：${parts.join(' · ')}`;
  return {
    ...state,
    timeline: [
      ...closeOpenTail(state.timeline),
      { kind: 'notice', id: `run-summary-${Date.now()}`, text, source: 'run_summary', meta: { ...runEnd } },
    ],
  };
}

function mergeArtifacts(current: AgentArtifactDto[], incoming: AgentArtifactDto[]): AgentArtifactDto[] {
  let next = current;
  for (const art of incoming) {
    const idx = next.findIndex((a) => a.artifactKey === art.artifactKey);
    next = idx >= 0 ? next.map((a, i) => (i === idx ? { ...a, ...art } : a)) : [...next, art];
  }
  return next;
}

/** 建立/复用 live 占位行（工具/正文一律以时间线为唯一渲染源） */
function ensureLiveRow(state: RuntimeState, preferredId?: string): RuntimeState {
  if (state.liveMessageId) return state;
  const id = preferredId || `live-${Date.now()}`;
  return {
    ...state,
    liveMessageId: id,
    messages: [...state.messages, { id, role: 'assistant', content: '', timestamp: Date.now() }],
  };
}

/** 会话切换/初始状态工厂（模块内使用；对外经 store.reset） */
export function RuntimeStateInitial(sessionKey: string | null): RuntimeState {
  return {
    sessionKey,
    connection: 'idle',
    lastSeq: 0,
    streaming: false,
    stopping: false,
    runId: null,
    startedAt: 0,
    lastEventAt: 0,
    turn: 0,
    maxTurns: 0,
    contextTokens: 0,
    currentTool: null,
    timeline: [],
    content: '',
    thinking: '',
    messages: [],
    liveMessageId: null,
    historyLoading: false,
    artifacts: [],
    docVersion: 0,
    docDesync: false,
    queueLength: 0,
  };
}
