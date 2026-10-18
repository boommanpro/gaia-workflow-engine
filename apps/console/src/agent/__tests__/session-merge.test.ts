/**
 * 一致性协议 mock 测试（Phase 1 验收）：
 *  · appendLiveRow —— getMessages 与 SSE 快照并发返回时的幂等合并（刷新竞态钉子）
 *  · convertMessages —— 历史重建的时间线顺序与工具结果回填
 */
import { describe, expect, it } from 'vitest';

import { appendLiveRow, convertMessages } from '../AgentContext';
import type { AgentMessage, DisplayMessage } from '../types';

const liveRow = (id: string): DisplayMessage => ({
  id,
  role: 'assistant',
  content: '',
  timestamp: Date.now(),
});

describe('appendLiveRow：live 占位行在历史整表替换下幸存', () => {
  it('无 live 行：原样返回历史', () => {
    const history = convertMessages([
      { id: 1, sessionKey: 's', role: 'user', content: 'hi' } as AgentMessage,
    ]);
    expect(appendLiveRow(history, null)).toBe(history);
    expect(appendLiveRow(history, undefined)).toBe(history);
  });

  it('历史替换后 live 行接回尾部（刷新竞态钉子：live 行不被抹掉）', () => {
    const history = [
      { id: 'msg-1', role: 'user' as const, content: 'hi', timestamp: 1 },
      { id: 'run-2', role: 'assistant' as const, content: '上轮回复', timestamp: 2 },
    ];
    const merged = appendLiveRow(history, liveRow('live-run-3'));
    expect(merged).toHaveLength(3);
    expect(merged[2]).toMatchObject({ id: 'live-run-3', role: 'assistant' });
  });

  it('历史中已存在同 id 行时原地替换（不重复渲染）', () => {
    const history = [
      { id: 'msg-1', role: 'user' as const, content: 'hi', timestamp: 1 },
      { id: 'live-run-3', role: 'assistant' as const, content: '旧内容', timestamp: 2 },
    ];
    const merged = appendLiveRow(history, liveRow('live-run-3'));
    expect(merged).toHaveLength(2);
    expect(merged[1].content).toBe('');
  });
});

describe('convertMessages：历史重建契约', () => {
  it('一次 run 的 assistant+tool 行合并为单条回复，时间线按真实顺序交错', () => {
    const msgs: AgentMessage[] = [
      { id: 1, sessionKey: 's', role: 'user', content: '检查工作流', createdAt: '2026-10-11T10:00:00' },
      { id: 2, sessionKey: 's', role: 'assistant', content: '结构正常。', toolCalls: '[{"id":"c1","type":"function","function":{"name":"read_workflow","arguments":"{}"}}]', thinking: '先读定义。', createdAt: '2026-10-11T10:00:20' },
      { id: 3, sessionKey: 's', role: 'tool', toolCallId: 'c1', content: '{"ok":true}', createdAt: '2026-10-11T10:00:10' },
    ];
    const out = convertMessages(msgs);
    expect(out).toHaveLength(2);
    const reply = out[1];
    expect(reply.role).toBe('assistant');
    expect(reply.content).toBe('结构正常。');
    expect(reply.thinking).toBe('先读定义。');
    expect(reply.toolSteps).toHaveLength(1);
    expect(reply.toolSteps![0].result).toBe('{"ok":true}');
    expect(reply.timeline!.map((i) => i.kind)).toEqual(['thinking', 'text', 'tool']);
  });

  it('无 toolCallId 的孤儿 tool 行单独成条', () => {
    const msgs: AgentMessage[] = [
      { id: 1, sessionKey: 's', role: 'user', content: 'hi' },
      { id: 2, sessionKey: 's', role: 'tool', content: '孤立结果' },
    ];
    const out = convertMessages(msgs);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ role: 'tool', content: '孤立结果' });
  });

  it('user 行为界切分多个 run（各 run 独立成回复）', () => {
    const msgs: AgentMessage[] = [
      { id: 1, sessionKey: 's', role: 'user', content: 'q1' },
      { id: 2, sessionKey: 's', role: 'assistant', content: 'a1' },
      { id: 3, sessionKey: 's', role: 'user', content: 'q2' },
      { id: 4, sessionKey: 's', role: 'assistant', content: 'a2' },
    ];
    const out = convertMessages(msgs);
    expect(out.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(out[1].content).toBe('a1');
    expect(out[3].content).toBe('a2');
  });

  it('todo_write 历史重建：steps[].content 为标题、取最后一次调用、状态归一（不出现 Step N 占位）', () => {
    const todoCall = (id: string, steps: unknown[]) =>
      ({ id, type: 'function', function: { name: 'todo_write', arguments: JSON.stringify({ steps }) } });
    const msgs: AgentMessage[] = [
      { id: 1, sessionKey: 's', role: 'user', content: '搭工作流', createdAt: '2026-10-18T10:00:00' },
      {
        id: 2,
        sessionKey: 's',
        role: 'assistant',
        content: '完成。',
        createdAt: '2026-10-18T10:00:30',
        toolCalls: JSON.stringify([
          todoCall('t1', [
            { id: 's1', content: '添加 LLM 节点', status: 'in_progress' },
            { id: 's2', content: '配置输出字段', status: 'pending' },
          ]),
          todoCall('t2', [
            { id: 's1', content: '添加 LLM 节点', status: 'completed' },
            { id: 's2', content: '配置输出字段', status: 'in_progress' },
          ]),
        ]),
      },
    ];
    const out = convertMessages(msgs);
    const reply = out[1];
    expect(reply.planSteps).toBeDefined();
    // 标题来自 content，而非「Step N」占位
    expect(reply.planSteps!.map((s) => s.intent)).toEqual(['添加 LLM 节点', '配置输出字段']);
    // 取最后一次 todo_write 的状态；运行已结束，in_progress 归一为 pending（不残留旋转态）
    expect(reply.planSteps!.map((s) => s.status)).toEqual(['done', 'pending']);
    expect(reply.planSteps![0].action).toBe('todo');
  });
});
