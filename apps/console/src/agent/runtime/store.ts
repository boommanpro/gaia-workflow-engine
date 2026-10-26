/**
 * SessionRuntime —— 会话运行时存储（React 无关的外部 store）。
 *
 * 职责边界：
 *  · 唯一持有 RuntimeState；dispatch(action) → 纯 reducer → 新状态；
 *  · 发布合帧：文本增长（token/thinking）按双 rAF 合帧（≤30fps，后台页 240ms 兜底），
 *    结构事件按微任务合帧（同一任务内的突发事件只重渲染一次）；
 *  · 细粒度订阅：useRuntime(selector, isEqual) —— 每个组件只订阅自己那一片状态，
 *    zustand 式「选择结果等价则沿用旧引用」缓存，杜绝全树重渲染。
 *
 * 副作用（历史加载、画布应用、路由跳转、停止请求…）不在这里：宿主
 * （AgentProvider 的 runtime 绑定层）监听 dispatch / 事件名自行驱动。
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { DisplayMessage } from '../types';
import type { RuntimeState } from './state';
import { RuntimeStateInitial, isStreamFrame, reduce, type RuntimeAction } from './reducer';

class SessionRuntime {
  private state: RuntimeState = RuntimeStateInitial(null);
  private listeners = new Set<() => void>();
  private microScheduled = false;
  private frameScheduled = false;
  private frameHandle: number | undefined;
  private fallbackTimer: ReturnType<typeof setTimeout> | undefined;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): RuntimeState => this.state;

  dispatch(action: RuntimeAction): void {
    const next = reduce(this.state, action);
    if (next === this.state) return;
    this.state = next;
    this.scheduleNotify(action);
  }

  /** 重放/测试直取 */
  reset(sessionKey: string | null): void {
    this.cancelFrame();
    this.state = RuntimeStateInitial(sessionKey);
    this.notify();
  }

  private scheduleNotify(action: RuntimeAction): void {
    if (isStreamFrame(action)) {
      if (this.frameScheduled) return;
      this.frameScheduled = true;
      const flush = () => {
        this.frameScheduled = false;
        this.cancelFallback();
        this.notify();
      };
      if (typeof requestAnimationFrame === 'function') {
        // 双 rAF：跨两个 paint 机会才发布一次（UI 更新上限 ~30fps）
        this.frameHandle = requestAnimationFrame(() => {
          this.frameHandle = requestAnimationFrame(flush);
        });
        // 后台标签页 rAF 停摆：240ms 兜底发布，切回来内容是新的
        this.fallbackTimer = setTimeout(flush, 240);
      } else {
        flush();
      }
      return;
    }
    if (this.microScheduled) return;
    this.microScheduled = true;
    queueMicrotask(() => {
      this.microScheduled = false;
      this.notify();
    });
  }

  private cancelFrame(): void {
    if (this.frameHandle !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle = undefined;
    this.frameScheduled = false;
    this.cancelFallback();
  }

  private cancelFallback(): void {
    if (this.fallbackTimer !== undefined) clearTimeout(this.fallbackTimer);
    this.fallbackTimer = undefined;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const sessionRuntime = new SessionRuntime();

/** 测试用：全新实例（不碰单例） */
export function createRuntime(): SessionRuntime {
  return new SessionRuntime();
}

/** 浅相等（选择器返回对象/数组时的等价判定） */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => Object.is(v, b[i]));
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as any)[k], (b as any)[k]));
}

/**
 * 细粒度订阅：组件只在自己选择的那片状态变化时重渲染。
 * 选择结果在「状态变更但结果等价」时沿用旧引用（useSyncExternalStore 不抖动）。
 */
export function useRuntime<T>(
  selector: (state: RuntimeState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalRef = useRef(isEqual);
  equalRef.current = isEqual;
  const cacheRef = useRef<{ src: RuntimeState | null; val: T }>({
    src: null,
    val: undefined as unknown as T,
  });

  const getSnapshot = useCallback((): T => {
    const state = sessionRuntime.getState();
    const cache = cacheRef.current;
    if (cache.src === state) return cache.val;
    const next = selectorRef.current(state);
    if (cache.src !== null && equalRef.current(cache.val, next)) {
      cache.src = state; // 状态变了但选择结果等价：沿用旧引用，订阅方 bail out
      return cache.val;
    }
    cacheRef.current = { src: state, val: next };
    return next;
  }, []);

  return useSyncExternalStore(sessionRuntime.subscribe, getSnapshot, getSnapshot);
}

/** 便捷选择器：会话消息列表 */
export function useMessages(): DisplayMessage[] {
  return useRuntime((s) => s.messages);
}
