/**
 * live-stream-store —— 流式正文/思考过程的帧合并发布层（对标 dsh assembly 的合帧发布）。
 *
 * 现状问题：onToken 每个 token 一次 setMessages，Qwen 流式每秒几十次全列表
 * React reconciliation + Markdown 全量重解析，越写越卡。
 *
 * 本模块把高频流式更新从 React state 挪到独立外部 store：
 *   token → 缓冲追加 → 三重 requestAnimationFrame 合帧（dsh 同款：跨三个 paint
 *   机会才发布一次，UI 更新上限 ~20fps，与浏览器渲染对齐）→ 仅订阅该 store 的
 *   live 消息行重渲染，历史行与 messages state 完全不动。
 *
 * 结构性事件（turn / tool_call / done）走 immediate 立即发布。
 * 页面后台 rAF 停摆时由 240ms 兜底定时器接管，避免缓冲无限堆积。
 */

import type { TimelineItem } from './types';

export interface LiveStreamState {
  /** 每次 publish 自增，订阅方以此感知变化（useSyncExternalStore 的 getSnapshot 依据） */
  version: number;
  /** 交错时间线（真实调用链路顺序：思考 → 工具 → 思考 → … → 正文） */
  timeline: TimelineItem[];
  /** 挂起的确认（write/save_workflow 应用卡）：内联渲染在对应工具之后 */
  pendingConfirm: { toolCallId: string; action: string; args: Record<string, unknown> } | null;
  /** 本次 run 累积的流式正文（全量） */
  content: string;
  /** 累积思考过程 */
  thinking: string;
  /** 是否有流在进行 */
  streaming: boolean;
  /** 轮次信息（turn 事件） */
  turn: number;
  maxTurns: number;
  /** 当前上下文 token 估算（turn 事件携带；超过阈值触发自动压缩） */
  contextTokens: number;
  /** 当前执行中的工具名（tool_call 事件 → tool_result 清空） */
  currentTool: string | null;
  /** run 开始时间戳（状态行耗时用） */
  startedAt: number;
}

const initial = (): LiveStreamState => ({
  version: 0,
  timeline: [],
  pendingConfirm: null,
  content: '',
  thinking: '',
  streaming: false,
  turn: 0,
  maxTurns: 0,
  contextTokens: 0,
  currentTool: null,
  startedAt: 0,
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
  listeners.forEach((l) => l());
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
    // 末条是文本段则续写，否则新开文本条目（工具/思考之后出现的正文另起一段）
    const last = timeline[timeline.length - 1];
    if (last && last.kind === 'text') {
      timeline = [...timeline.slice(0, -1), { ...last, text: last.text + pendingContent }];
    } else {
      timeline = [...timeline, { kind: 'text', id: `txt-${timeline.length}`, text: pendingContent }];
    }
    pendingContent = '';
  }
  if (pendingThinking !== '') {
    state = { ...state, thinking: state.thinking + pendingThinking };
    const last = timeline[timeline.length - 1];
    if (last && last.kind === 'thinking') {
      timeline = [...timeline.slice(0, -1), { ...last, text: last.text + pendingThinking }];
    } else {
      timeline = [...timeline, { kind: 'thinking', id: `thk-${timeline.length}`, text: pendingThinking }];
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
      timeline: full ? [{ kind: 'text', id: 'txt-replay', text: full }] : [],
    };
    notify();
  },
  /** 结构性：登记一次工具调用（进入时间线，带起始时间戳） */
  recordTool(call: { id: string; action: string; args: Record<string, unknown> }): void {
    const item: TimelineItem = {
      kind: 'tool',
      id: call.id,
      call: { id: call.id, action: call.action, args: call.args, policy: 'always' as const },
      startedAt: Date.now(),
    };
    const timeline = [...state.timeline, item];
    state = { ...state, timeline };
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
  /** 挂起确认（应用卡内联渲染）；resolve 时置 null */
  setPendingConfirm(pending: { toolCallId: string; action: string; args: Record<string, unknown> } | null): void {
    state = { ...state, pendingConfirm: pending };
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
    state = { ...initial(), version: state.version + 1, streaming: true, startedAt: Date.now() };
    notify();
  },
  endRun(): void {
    cancelScheduled();
    pendingContent = '';
    pendingThinking = '';
    state = { ...state, streaming: false, currentTool: null, pendingConfirm: null };
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
