/**
 * 交互审计回归钉子（2026-11-07，docs/interaction-audit-2026-11-07.md）：
 *  · A10 —— appendEphemeralRows 不得丢乐观用户行（草稿物化时序）
 *  · A14 —— draftModelPick 暂存的取走语义
 */
import { describe, expect, it } from 'vitest';

import { appendEphemeralRows } from '../runtime/messages';
import type { DisplayMessage } from '../types';
import { draftModelPick } from '../draft-model-pick';

const userRow = (id: string, content: string): DisplayMessage =>
  ({ id, role: 'user', content, timestamp: 1 }) as DisplayMessage;
const assistantRow = (id: string, content: string): DisplayMessage =>
  ({ id, role: 'assistant', content, timestamp: 2 }) as DisplayMessage;

describe('A10 appendEphemeralRows：乐观用户行在历史重建后保留', () => {
  it('服务端未持久化时，local-* 用户行不能被丢掉', () => {
    const prev = [userRow('local-0-1700000000000', '首条消息')];
    // 历史重建返回空（消息还没落库）——旧实现会把乐观行整个抹掉
    const next = appendEphemeralRows([], prev, null);
    expect(next.some((m) => m.id === 'local-0-1700000000000')).toBe(true);
  });

  it('服务端已持久化（同内容用户消息出现在历史）时不重复显示', () => {
    const prev = [userRow('local-0-1700000000000', '首条消息')];
    const history = [userRow('srv-1', '首条消息')];
    const next = appendEphemeralRows(history, prev, null);
    expect(next.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('非 local-* 前缀的消息不受该规则影响（不误保留常规行）', () => {
    const prev = [assistantRow('srv-2', '旧回复')];
    const next = appendEphemeralRows([], prev, null);
    expect(next).toHaveLength(0);
  });
});

describe('A14 draftModelPick：草稿期模型选择暂存', () => {
  it('set 后可读，take 读后即清', () => {
    draftModelPick.set('draft-x', 42);
    expect(draftModelPick.get('draft-x')).toBe(42);
    expect(draftModelPick.take('draft-x')).toBe(42);
    expect(draftModelPick.get('draft-x')).toBeUndefined();
    expect(draftModelPick.take('draft-x')).toBeUndefined();
  });

  it('null（跟随默认）也是合法选择，take 返回 null 而非 undefined', () => {
    draftModelPick.set('draft-y', null);
    expect(draftModelPick.take('draft-y')).toBeNull();
  });
});
