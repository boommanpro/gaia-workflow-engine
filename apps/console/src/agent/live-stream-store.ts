/**
 * live-stream-store —— 流式正文/思考过程的帧合并发布层（对标 dsh assembly 的合帧发布）。
 *
 * 高频流式更新从 React state 挪到独立外部 store：
 *   token → 缓冲追加 → 三重 requestAnimationFrame 合帧（跨三个 paint 机会才发布一次，
 *   UI 更新上限 ~20fps）→ 仅订阅该 store 的 live 消息行重渲染。
 *
 * 结构性事件（turn / tool_call / done）走 immediate 立即发布。
 * 页面后台 rAF 停摆时由 240ms 兜底定时器接管，避免缓冲无限堆积。
 *
 * 状态收敛语义（dsh 纪律：UI 状态从条目自身完备性推导，不靠「等下一个事件」）：
 *   · 时间线上至多一个「打开」的 text/thinking 条目 —— 结构性事件（工具/通知）
 *     入场前先关闭尾部打开条目；新文本/思考在异类条目之后入场时同样先关闭尾部。
 *   · streaming=false（endRun）关闭全部打开条目 —— 任何终态路径漏发事件也不会
 *     遗留永远闪烁的思考块（2026-10-11 闪烁回归的根修）。
 *   · connection 独立于 streaming：断线重连期间 UI 显示「重连中」而非假装还在流式。
 */

import type { TimelineItem } from './types';

export type ConnectionState = 'idle' | 'connected' | 'reconnecting';

export interface LiveStreamState {
  /** 每次 publish 自增，订阅方以此感知变化（useSyncExternalStore 的 getSnapshot 依据） */
  version: number;
  /** 交错时间线（真实调用链路顺序：思考 → 工具 → 思考 → … → 正文） */
  timeline: TimelineItem[];
  /** 本次 run 累积的流式正文（全量） */
  content: string;
  /** 累积思考过程 */
  thinking: string;
  /** 是否有流在进行 */
  streaming: boolean;
  /** SSE 连接状态：断线重连期间 UI 必须显式呈现，不得冒充流式中 */
  connection: ConnectionState;
  /** 轮次信息（turn 事件） */
  turn: number;
  maxTurns: number;
  /** 当前上下文 token 估算（turn 事件携带；超过阈值触发自动压缩） */
  contextTokens: number;
  /** 当前执行中的工具名（tool_call 事件 → tool_result 清空） */
  currentTool: string | null;
  /** run 开始时间戳（状态行耗时用） */
  startedAt: number;
  /** 最近一次事件到达时间戳（「卡死中」判定：streaming 且 >90s 无事件） */
  lastEventAt: number;
}

const initial = (): LiveStreamState => ({
  version: 0,
  timeline: [],
  content: '',
  thinking: '',
  streaming: false,
  connection: 'idle',
  turn: 0,
  maxTurns: 0,
  contextTokens: 0,
  currentTool: null,
  startedAt: 0,
  lastEventAt: 0,
});

let state: LiveStreamState = initial();
const listeners = new Set<() => void>();

/** 缓冲中的增量（尚未发布） */
let pendingContent = '';
let pendingThinking = '';
let frameChain: number | undefined;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

function notify(): void {
  state.version += 1;
  // 每次真实事件发布都刷新活跃时间（「卡死中」提示的数据源）
  state.lastEventAt = Date.now();
  listeners.forEach((l) => l());
}

/** token 数缩写：3456 → 3.5k */
function fmtTokens(n?: number): string {
  if (!n) return '-';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** 关闭尾部打开的 text/thinking 条目（无打开条目时返回原数组引用，避免无谓拷贝） */
function closeOpenTail(timeline: TimelineItem[]): TimelineItem[] {
  const last = timeline[timeline.length - 1];
  if (last && (last.kind === 'text' || last.kind === 'thinking') && last.closed !== true) {
    return [...timeline.slice(0, -1), { ...last, closed: true }];
  }
  return timeline;
}

/** 三重 rAF 合帧发布（dsh assembly 同款），外加后台页兜底 */
function scheduleFramePublish(): void {
  if (frameChain !== undefined || fallbackTimer !== undefined) return;
  const flush = () => {
    frameChain = undefined;
    if (fallbackTimer !== undefined) {
      clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    publishNow();
  };
  if (typeof requestAnimationFrame === 'function') {
    frameChain = requestAnimationFrame(() => {
      frameChain = requestAnimationFrame(() => {
        frameChain = requestAnimationFrame(() => {
          frameChain = undefined;
          flush();
        });
      });
    });
    // 后台标签页 rAF 停摆：240ms 兜底发布，保证关窗/切页回来内容是新的
    fallbackTimer = setTimeout(flush, 240);
    return;
  }
  publishNow();
}

function publishNow(): void {
  if (pendingContent === '' && pendingThinking === '') return;
  let timeline = state.timeline;
  if (pendingContent !== '') {
    state = { ...state, content: state.content + pendingContent };
    // 末条是文本段则续写，否则新开文本条目（先关闭尾部打开条目，工具/思考之后出现的正文另起一段）
    const last = timeline[timeline.length - 1];
    if (last && last.kind === 'text' && last.closed !== true) {
      timeline = [...timeline.slice(0, -1), { ...last, text: last.text + pendingContent }];
    } else {
      timeline = [...closeOpenTail(timeline), { kind: 'text', id: `txt-${timeline.length}`, text: pendingContent, closed: false }];
    }
    pendingContent = '';
  }
  if (pendingThinking !== '') {
    state = { ...state, thinking: state.thinking + pendingThinking };
    const last = timeline[timeline.length - 1];
    if (last && last.kind === 'thinking' && last.closed !== true) {
      timeline = [...timeline.slice(0, -1), { ...last, text: last.text + pendingThinking }];
    } else {
      timeline = [...closeOpenTail(timeline), { kind: 'thinking', id: `thk-${timeline.length}`, text: pendingThinking, closed: false }];
    }
    pendingThinking = '';
  }
  state = { ...state, timeline };
  notify();
}

function cancelScheduled(): void {
  if (frameChain !== undefined && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frameChain);
  }
  frameChain = undefined;
  if (fallbackTimer !== undefined) clearTimeout(fallbackTimer);
  fallbackTimer = undefined;
}

export const liveStreamStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): LiveStreamState {
    return state;
  },

  /** token 增量（高频，合帧发布） */
  appendContent(chunk: string): void {
    if (!chunk) return;
    pendingContent += chunk;
    scheduleFramePublish();
  },
  /** thinking 增量（高频，合帧发布） */
  appendThinking(chunk: string): void {
    if (!chunk) return;
    pendingThinking += chunk;
    scheduleFramePublish();
  },
  /** 快照回放（重连恢复现场）：整体替换正文为单条文本时间线，立即发布 */
  replaceContent(full: string): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
    state = {
      ...state,
      content: full || '',
      timeline: full
        ? [{ kind: 'text', id: 'txt-replay', text: full, closed: false }]
        : closeOpenTail(state.timeline),
    };
    notify();
  },
  /**
   * 快照重建（订阅回放/刷新恢复）：用后端快照里的交错时间线整体重建 live 现场——
   * 思考/正文/工具/系统通知按真实顺序还原。快照不带 closed 标志，按「最后一条
   * text/thinking 仍在流式、其余全部已收尾」推断（与后端快照语义一致）。
   */
  applySnapshot(
    timeline: Array<{
      kind: 'text' | 'thinking' | 'tool' | 'notice';
      id: string;
      text?: string;
      source?: string;
      call?: { id: string; name: string; args?: any; result?: string };
    }>,
    content: string,
    thinking: string
  ): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
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
            ...(item.call?.result ? { result: String(item.call.result).substring(0, 600) } : {}),
          },
        });
      } else if (item.kind === 'notice') {
        rebuilt.push({ kind: 'notice', id: item.id || `notice-${rebuilt.length}`, text: item.text || '', source: item.source });
      } else {
        rebuilt.push({ kind: item.kind, id: item.id || `snap-${item.kind}-${rebuilt.length}`, text: item.text || '' });
      }
    }
    // 推断 closed：最后一条 text/thinking 仍打开（可能还在流式），其余全部收尾
    const last = rebuilt[rebuilt.length - 1];
    if (last && (last.kind === 'text' || last.kind === 'thinking')) {
      rebuilt[rebuilt.length - 1] = { ...last, closed: false };
    }
    for (let i = rebuilt.length - 2; i >= 0; i--) {
      const it = rebuilt[i];
      if (it.kind === 'text' || it.kind === 'thinking') rebuilt[i] = { ...it, closed: true };
    }
    state = {
      ...state,
      timeline: rebuilt,
      content: content || rebuilt.filter((i) => i.kind === 'text').map((i) => (i as any).text).join(''),
      thinking: thinking || rebuilt.filter((i) => i.kind === 'thinking').map((i) => (i as any).text).join(''),
    };
    notify();
  },
  /** 结构性：登记一次工具调用（进入时间线，带起始时间戳；关闭尾部打开条目） */
  recordTool(call: { id: string; action: string; args: Record<string, unknown> }): void {
    const item: TimelineItem = {
      kind: 'tool',
      id: call.id,
      call: { id: call.id, action: call.action, args: call.args },
      startedAt: Date.now(),
    };
    const timeline = [...closeOpenTail(state.timeline), item];
    state = { ...state, timeline };
    notify();
  },
  /** 结构性：系统通知入时间线（护栏警报/收尾/重试/中断/压缩播报），流式期间立即可见 */
  addNotice(text: string, source?: string, meta?: Record<string, any>): void {
    if (!text) return;
    const item: TimelineItem = {
      kind: 'notice',
      id: `notice-${Date.now()}-${state.timeline.length}`,
      text,
      ...(source ? { source } : {}),
      ...(meta ? { meta } : {}),
    };
    state = { ...state, timeline: [...closeOpenTail(state.timeline), item] };
    notify();
  },
  /**
   * run 终态时间账小结（run_end）：耗时/工具占比/最慢步骤/token/失败链，
   * 以富通知卡渲染（对标 OWB 收尾时间账）。live 时间线可能已随 done 重建，
   * 这里尽力插入；持久视图在调试面板「执行追踪」。
   */
  addRunSummary(runEnd: {
    outcome: string;
    turns: number;
    durationMs?: number;
    toolTimeMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    llmRetries?: number;
    failureChain?: string[];
  }): void {
    const secs = runEnd.durationMs != null ? (runEnd.durationMs / 1000).toFixed(1) : null;
    const toolSecs = runEnd.toolTimeMs != null ? (runEnd.toolTimeMs / 1000).toFixed(1) : null;
    const parts: string[] = [];
    if (secs) parts.push(`共 ${secs}s`);
    if (toolSecs) parts.push(`工具 ${toolSecs}s`);
    if (runEnd.turns) parts.push(`模型 ${runEnd.turns} 轮`);
    if (runEnd.promptTokens || runEnd.completionTokens) {
      parts.push(`tokens ${fmtTokens(runEnd.promptTokens)}→${fmtTokens(runEnd.completionTokens)}`);
    }
    if (runEnd.llmRetries) parts.push(`重试 ${runEnd.llmRetries} 次`);
    if (!parts.length) return;
    const text = `⏱ 本轮时间账：${parts.join(' · ')}`;
    state = {
      ...state,
      timeline: [
        ...closeOpenTail(state.timeline),
        { kind: 'notice', id: `run-summary-${Date.now()}`, text, source: 'run_summary', meta: { ...runEnd } },
      ],
    };
    notify();
  },
  /** 结构性：工具结果回填（附结束时间） */
  resolveTool(toolCallId: string, result?: string): void {
    const timeline = state.timeline.map((item) =>
      item.kind === 'tool' && item.id === toolCallId
        ? { ...item, endedAt: Date.now(), call: { ...item.call, result } }
        : item
    );
    state = { ...state, timeline };
    notify();
  },
  /** 结构性事件：立即发布缓冲（不清空已累积内容） */
  flush(): void {
    cancelScheduled();
    publishNow();
  },
  beginRun(): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
    state = {
      ...initial(),
      version: state.version + 1,
      streaming: true,
      startedAt: Date.now(),
      connection: state.connection,
    };
    notify();
  },
  /** run 终态：关闭全部打开条目 —— 任何终态路径都不会遗留闪烁中的思考块 */
  endRun(): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
    state = { ...state, timeline: closeOpenTail(state.timeline), streaming: false, currentTool: null };
    notify();
  },
  /** SSE 连接建立（订阅响应就绪） */
  markConnected(): void {
    if (state.connection === 'connected') return;
    state = { ...state, connection: 'connected' };
    notify();
  },
  /** 连接断开/正在重连：UI 显式呈现重连态，停止一切流式 shimmer */
  markReconnecting(): void {
    if (state.connection === 'reconnecting') return;
    state = { ...state, connection: 'reconnecting' };
    notify();
  },
  /** 重置（会话切换）：清空全部 */
  reset(): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
    state = initial();
    notify();
  },
  beginTurn(turn: number, maxTurns: number, contextTokens?: number): void {
    state = { ...state, turn, maxTurns: maxTurns || state.maxTurns, contextTokens: contextTokens ?? state.contextTokens };
    notify();
  },
  markTool(name: string | null): void {
    if (state.currentTool === name) return;
    state = { ...state, currentTool: name };
    notify();
  },
};
