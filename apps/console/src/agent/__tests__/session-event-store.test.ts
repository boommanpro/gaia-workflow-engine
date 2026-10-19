/**
 * 会话事件活账本契约测试（派生读取地基）：
 *  · append 只记当前会话、跳过高频流式帧（token/thinking/run_state/document）
 *  · markRunStart 清零当前 run 账目并自增 runTick（派生方的边界重拉信号）
 *  · 快照引用稳定：未变更时 getSnapshot 返回同一引用（useSyncExternalStore 契约）
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { sessionEventStore } from '../session-event-store';

beforeEach(() => {
  sessionEventStore.reset('s1');
});

describe('SessionEventStore：活账本契约', () => {
  it('append 记账并保持 REST 事件行同构（eventType/payload/createdAt）', () => {
    sessionEventStore.markRunStart('run-1');
    sessionEventStore.append('s1', 'tool_call', { id: 't1', name: 'get', args: {} });
    const s = sessionEventStore.getSnapshot();
    expect(s.events).toHaveLength(1);
    expect(s.events[0].eventType).toBe('tool_call');
    expect(s.events[0].runId).toBe('run-1');
    expect(JSON.parse(s.events[0].payload)).toEqual({ id: 't1', name: 'get', args: {} });
    expect(s.events[0].id).toMatch(/^live-/);
  });

  it('跨会话事件丢弃；高频流式帧（token/thinking/run_state/document）不进账', () => {
    sessionEventStore.append('other', 'tool_call', {});
    sessionEventStore.append('s1', 'token', { content: 'a' });
    sessionEventStore.append('s1', 'thinking', { content: 'b' });
    sessionEventStore.append('s1', 'run_state', { status: 'running' });
    sessionEventStore.append('s1', 'document', { ops: [] });
    expect(sessionEventStore.getSnapshot().events).toHaveLength(0);
  });

  it('markRunStart 清零当前 run 账目并自增 runTick（边界重拉信号）', () => {
    sessionEventStore.markRunStart('run-1');
    sessionEventStore.append('s1', 'tool_call', { id: 't1' });
    expect(sessionEventStore.getSnapshot().events).toHaveLength(1);
    const tick1 = sessionEventStore.getSnapshot().runTick;

    sessionEventStore.markRunStart('run-2');
    const s = sessionEventStore.getSnapshot();
    expect(s.events).toHaveLength(0);
    expect(s.runId).toBe('run-2');
    expect(s.runTick).toBeGreaterThan(tick1);
  });

  it('快照引用稳定：未变更时 getSnapshot 返回同一引用', () => {
    const a = sessionEventStore.getSnapshot();
    const b = sessionEventStore.getSnapshot();
    expect(a).toBe(b);
    sessionEventStore.append('s1', 'tool_call', { id: 't1' });
    expect(sessionEventStore.getSnapshot()).not.toBe(a);
  });

  it('reset 换会话清零一切', () => {
    sessionEventStore.append('s1', 'tool_call', { id: 't1' });
    sessionEventStore.reset('s2');
    const s = sessionEventStore.getSnapshot();
    expect(s.sessionKey).toBe('s2');
    expect(s.events).toHaveLength(0);
    expect(s.runTick).toBe(0);
    // 旧会话事件不再入账
    sessionEventStore.append('s1', 'tool_call', { id: 't2' });
    expect(sessionEventStore.getSnapshot().events).toHaveLength(0);
  });
});
