/**
 * 回放驱动 —— 用录制的会话事件 fixture 离线驱动整个对话 UI（零后端、零 LLM 依赖）。
 *
 * 用法：`http://localhost:3001/chat/replay?replay=thinking-boundary&replaySpeed=4`
 * main.tsx 在首屏渲染前调用 bootstrapReplay()；激活后 agentApi 与 SSE 订阅
 * 全部改走 fixture（api.ts / sse-client.ts 各有一处入口判断）。
 *
 * fixture 放在 public/replay-fixtures/<name>.json，格式：
 *   { name, description, session, messages, artifacts, document,
 *     events: [{ event, data, delay }] }
 *
 * 事件序列与后端 SessionEventBus 录制（agent.dev.record-events-dir）的 ndjson
 * 同构：录出来的文件稍作包裹即可直接当 fixture 用。
 */
import { handleEvent } from '../sse-protocol';
import type { SseHandlers } from '../types';

export interface ReplayEvent {
  event: string;
  data?: any;
  /** 距上一事件的间隔毫秒（缺省按事件类型推断） */
  delay?: number;
}

export interface ReplayFixture {
  name: string;
  description?: string;
  session?: Record<string, any>;
  /** done 后 getMessages 返回的最终 DB 行（AgentMessage 形态） */
  messages?: any[];
  artifacts?: any[];
  document?: any;
  events: ReplayEvent[];
}

let active: ReplayFixture | null = null;
let speed = 1;

export function isReplayActive(): boolean {
  return active !== null;
}

export function getActiveReplayFixture(): ReplayFixture | null {
  return active;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 激活回放（测试可直接调用注入 fixture） */
export function activateReplay(fixture: ReplayFixture, replaySpeed = 1): void {
  active = fixture;
  speed = replaySpeed > 0 ? replaySpeed : 1;
}

export function deactivateReplay(): void {
  active = null;
  speed = 1;
}

/** main.tsx 首屏渲染前调用：读 ?replay= 参数并加载 fixture（无参数时立即返回） */
export async function bootstrapReplay(): Promise<void> {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const name = params.get('replay');
  if (!name) return;
  const s = Number(params.get('replaySpeed') || '1');
  if (Number.isFinite(s) && s > 0) speed = s;
  try {
    const res = await fetch(`/replay-fixtures/${encodeURIComponent(name)}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fixture = (await res.json()) as ReplayFixture;
    if (!Array.isArray(fixture.events)) throw new Error('fixture.events 缺失');
    active = fixture;
    console.info(`[replay] fixture "${name}" loaded: ${fixture.events.length} events`);
  } catch (e) {
    console.error(`[replay] fixture "${name}" 加载失败，回放未激活`, e);
  }
}

function defaultDelay(event: string): number {
  if (event === 'token' || event === 'thinking') return 40;
  if (event === 'run_state') return 100;
  if (event === 'done' || event === 'error') return 200;
  return 250;
}

/** 回放 SSE 会话流：按 fixture 顺序、按 delay 节奏分发事件（signal 可中断） */
export async function replaySessionStream(handlers: SseHandlers, signal?: AbortSignal): Promise<void> {
  const fixture = active;
  if (!fixture) return;
  handlers.onOpen?.();
  for (const ev of fixture.events) {
    if (signal?.aborted) return;
    const delay = Math.max(0, (ev.delay ?? defaultDelay(ev.event)) / speed);
    if (delay > 0) await sleep(delay);
    if (signal?.aborted) return;
    handleEvent(ev.event, ev.data ?? {}, handlers);
  }
}

/** 回放 agentApi 的 REST 请求（按路径模式路由到 fixture 数据） */
export function replayRequest<T>(path: string): T {
  const fixture = active;
  if (!fixture) return null as T;
  // 顺序敏感：/session/list 必须先于 /messages 判断（两者都含 /session/）
  if (path.includes('/session/list')) return (fixture.session ? [fixture.session] : []) as T;
  if (path.includes('/messages')) return (fixture.messages ?? []) as T;
  if (path.includes('/artifacts')) return (fixture.artifacts ?? []) as T;
  if (path.includes('/document')) return (fixture.document ?? null) as T;
  if (path.includes('/debug')) return '' as T;
  if (path.includes('/run')) return { accepted: true, sessionKey: fixture.session?.sessionKey, runId: 'replay-run' } as T;
  if (path.includes('/stop')) return true as T;
  if (path.includes('/status')) return { status: 'idle' } as T;
  if (path.includes('/config/list')) return [] as T;
  if (path.includes('/workspace/folders')) return [] as T;
  return null as T;
}
