/**
 * 会话事件活账本 —— SSE 实时事件的单源积累（派生读取的地基）。
 *
 * 页面本来就订阅着整条 SSE 事件流；本 store 在协议分发层把结构化事件
 * （工具调用 / 护栏 / run 边界等）逐条入账，派生视图（如轨迹面板）
 * 通过 useSyncExternalStore 增量读取，取代「流式期间每 4s 全量重拉
 * 1000 行事件 + 1000 行调用账」的重复读取模式。
 *
 * 契约：
 *  · 快照引用稳定 —— state 只在变更时整体替换（useSyncExternalStore 不抖动）；
 *  · 行结构与 REST 事件行同构（eventType/payload/createdAt/runId），
 *    buildRecords 无需感知数据来自实时账本还是历史接口；
 *  · run 边界（markRunStart）清零当前 run 账目并自增 runTick，
 *    派生方在边界处做一次权威重拉，与账本不重叠。
 */
import { useSyncExternalStore } from 'react';

export interface LiveSessionEvent {
  /** 合成 id（live- 单调序号），与 DB 行 id 天然不冲突 */
  id: string;
  runId?: string;
  eventType: string;
  /** JSON 字符串（与 REST 事件行的 payload 同构） */
  payload: string;
  createdAt: string;
}

export interface SessionEventLedger {
  sessionKey: string | null;
  runId: string | null;
  /** 当前 run 的实时事件（markRunStart 清零） */
  events: LiveSessionEvent[];
  /** run 边界版本：每次 markRunStart 自增（派生方以此触发权威重拉） */
  runTick: number;
}

/** 与后端 BUFFER_CAP 对齐的账本上限（只服务「当前 run」画面，足够） */
const CAP = 600;

/** 高频流式帧不进账：token/thinking 逐字到达（buildRecords 也不消费），
 *  run_state 是订阅快照而非业务事件，document 是画布增量（体积大、面板不展示） */
const SKIP_TYPES = new Set(['token', 'thinking', 'run_state', 'document']);

class SessionEventStore {
  private listeners = new Set<() => void>();
  private seq = 0;
  private state: SessionEventLedger = {
    sessionKey: null,
    runId: null,
    events: [],
    runTick: 0,
  };

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): SessionEventLedger => this.state;

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** 会话切换：清空账本（历史由派生视图按需权威拉取） */
  reset(sessionKey: string | null): void {
    this.seq = 0;
    this.state = { sessionKey, runId: null, events: [], runTick: 0 };
    this.notify();
  }

  /** 新 run 开始（run_state.status=running）：当前 run 账目从零计，边界版本自增 */
  markRunStart(runId: string | undefined): void {
    this.state = {
      ...this.state,
      runId: runId || null,
      events: [],
      runTick: this.state.runTick + 1,
    };
    this.notify();
  }

  /** SSE 原始事件入账（只记当前会话；跨会话事件说明订阅已切换，丢弃） */
  append(sessionKey: string, type: string, data: unknown): void {
    if (this.state.sessionKey !== sessionKey || SKIP_TYPES.has(type)) return;
    this.seq += 1;
    const events = [
      ...this.state.events,
      {
        id: `live-${this.seq}`,
        runId: this.state.runId || undefined,
        eventType: type,
        payload: JSON.stringify(data ?? {}),
        createdAt: new Date().toISOString(),
      },
    ];
    while (events.length > CAP) events.shift();
    this.state = { ...this.state, events };
    this.notify();
  }
}

export const sessionEventStore = new SessionEventStore();

/** 订阅会话事件活账本（useSyncExternalStore 入口，快照引用稳定） */
export function useSessionEventLedger(): SessionEventLedger {
  return useSyncExternalStore(sessionEventStore.subscribe, sessionEventStore.getSnapshot);
}
