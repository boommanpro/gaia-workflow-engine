/**
 * 回放驱动 mock 测试：事件序列按 fixture 顺序以「帧」分发（与真实 SSE 同一条路径），
 * replayRequest 按 REST 路径路由到 fixture 数据。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  activateReplay,
  deactivateReplay,
  isReplayActive,
  replayRequest,
  replaySessionStream,
  type ReplayFixture,
} from '../replay/replay-driver';
import type { SseFrame } from '../runtime/sse-reader';

const fixture: ReplayFixture = {
  name: 'test',
  session: { sessionKey: 'replay-test', title: 'T' },
  messages: [{ id: 1, sessionKey: 'replay-test', role: 'user', content: 'q' }],
  artifacts: [{ artifactKey: 'a1', type: 'workflow', status: 'draft', version: 1 }],
  events: [
    { event: 'run_state', data: { status: 'running', runId: 'r1' }, delay: 0 },
    { event: 'token', data: { content: '你' }, delay: 0 },
    { event: 'token', data: { content: '好' }, delay: 0 },
    { event: 'done', data: {}, delay: 0 },
  ],
};

beforeEach(() => {
  deactivateReplay();
});

afterEach(() => {
  deactivateReplay();
});

describe('replaySessionStream', () => {
  it('按顺序分发全部帧并回调 onOpen', async () => {
    activateReplay(fixture);
    expect(isReplayActive()).toBe(true);

    const seen: string[] = [];
    let opened = 0;
    await replaySessionStream({
      onOpen: () => { opened += 1; },
      onFrame: (frame: SseFrame) => {
        seen.push(frame.event);
        if (frame.event === 'run_state') {
          seen.push(`run_state:${JSON.parse(frame.data).status}`);
        }
      },
    });

    expect(opened).toBe(1);
    expect(seen).toEqual(['run_state', 'run_state:running', 'token', 'token', 'done']);
  });

  it('帧 data 为 JSON 字符串（与真实 SSE 线格式一致）', async () => {
    activateReplay(fixture);
    const tokens: string[] = [];
    await replaySessionStream({
      onFrame: (frame) => {
        if (frame.event === 'token') tokens.push(JSON.parse(frame.data).content);
      },
    });
    expect(tokens).toEqual(['你', '好']);
  });

  it('未激活时不分发', async () => {
    const seen: string[] = [];
    await replaySessionStream({ onFrame: (f) => seen.push(f.event) });
    expect(seen).toEqual([]);
  });

  it('signal 中断后停止分发', async () => {
    activateReplay(fixture);
    const controller = new AbortController();
    const seen: string[] = [];
    controller.abort();
    await replaySessionStream({ onFrame: (f) => seen.push(f.event) }, controller.signal);
    expect(seen).toEqual([]);
  });
});

describe('replayRequest 路由', () => {
  it('messages / artifacts / list / run / stop 各回各的 fixture 数据', () => {
    activateReplay(fixture);
    expect(replayRequest<any[]>('/api/agent/session/replay-test/messages')).toEqual(fixture.messages);
    expect(replayRequest<any[]>('/api/agent/session/replay-test/artifacts')).toEqual(fixture.artifacts);
    expect(replayRequest<any[]>('/api/agent/session/list')).toEqual([fixture.session]);
    expect(replayRequest<any>('/api/agent/session/replay-test/run')).toMatchObject({ accepted: true, runId: 'replay-run' });
    expect(replayRequest<boolean>('/api/agent/session/replay-test/stop')).toBe(true);
    expect(replayRequest<string>('/api/agent/session/replay-test/debug')).toBe('');
  });
});
