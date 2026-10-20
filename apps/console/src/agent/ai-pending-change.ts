/**
 * AI 待应用变更（阶段 2.2）—— 专家模式下的「AI 修改替代应用路径」。
 *
 * 背景：专家模式画布是主位，AI 的 document 事件被守卫拦下不做整表替换
 * （防止覆盖手工内容）——但拦下之后 AI 的修改就彻底不可见了。
 * 这里把被拦下的最新草稿存成「待应用变更」：用户可以查看差异、应用、或忽略。
 *
 * 语义：
 *   - set() 只保留最新一份（AI 一轮 run 可能推十几次 document，逐份堆叠没有意义）；
 *   - baseDsl 取第一次捕获时的画布内容：应用前用它检测「用户手改过没有」，
 *     手改过就必须显式确认，不静默覆盖；
 *   - 忽略/应用后清空；离开编辑器页面时由挂载组件清理。
 */
import { useSyncExternalStore } from 'react';
import { nanoid } from 'nanoid';

import type { WorkflowDsl } from '../document';

export interface AiPendingChange {
  id: string;
  /** AI 提交的完整草稿（服务端会话草稿的最新形态） */
  dsl: WorkflowDsl;
  /** 捕获第一份变更时的画布内容（冲突检测基准） */
  baseDsl: WorkflowDsl;
  at: number;
  /** 产生这轮修改的助手消息（可空） */
  messageId?: string;
}

type Listener = () => void;

class AiPendingChangeStore {
  private current: AiPendingChange | null = null;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AiPendingChange | null => this.current;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /**
   * 记录一份 AI 草稿。已有待应用变更时只更新 dsl（保留最早的 baseDsl，
   * 这样用户在整个 run 期间的手改都会被冲突检测看到）。
   */
  set(dsl: WorkflowDsl, baseDsl: WorkflowDsl, messageId?: string): void {
    const existing = this.current;
    const nextDslText = JSON.stringify(dsl);
    if (existing && JSON.stringify(existing.dsl) === nextDslText) return;
    this.current = {
      id: existing?.id || `pending_${nanoid(6)}`,
      dsl,
      baseDsl: existing?.baseDsl || baseDsl,
      at: existing?.at || Date.now(),
      messageId: messageId || existing?.messageId,
    };
    this.emit();
  }

  clear(): void {
    if (!this.current) return;
    this.current = null;
    this.emit();
  }
}

export const aiPendingChangeStore = new AiPendingChangeStore();

export function useAiPendingChange(): AiPendingChange | null {
  return useSyncExternalStore(aiPendingChangeStore.subscribe, aiPendingChangeStore.getSnapshot);
}
