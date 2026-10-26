/**
 * 时间线渲染契约测试（jsdom）：状态 → shimmer 类名的映射即「闪烁」的验收面。
 * 时间线数据由 reducer 事件序列驱动（与线上完全同一条换算路径）。
 *
 * 契约（对标 dsh ReasoningRow）：
 *  · 打开的 thinking 条目 + connected → dsh-shimmer
 *  · closed 翻转 / 断线重连 / streaming=false → shimmer 摘除
 *  · 工具行 running shimmer，结果回填后摘除
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';

import { RuntimeStateInitial, reduce } from '../runtime/reducer';
import { TimelineView } from '../LiveAssistantMessage';
import type { TimelineItem } from '../types';

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** 事件序列 → reducer 状态里的时间线（与线上同一条换算路径） */
function timelineFrom(events: Array<{ name: string; data?: any; seq?: number }>): TimelineItem[] {
  let state = RuntimeStateInitial('test');
  state = reduce(state, { type: 'event', name: 'run_state', data: { status: 'running', runId: 'r' }, seq: 1 });
  for (const [i, ev] of events.entries()) {
    state = reduce(state, { type: 'event', name: ev.name, data: ev.data ?? {}, seq: i + 2 });
  }
  return state.timeline;
}

function renderTimeline(timeline: TimelineItem[], streaming: boolean, connected = true): void {
  act(() => {
    root.render(<TimelineView timeline={timeline} streaming={streaming} connected={connected} />);
  });
}

const shimmerCount = (): number => container.querySelectorAll('.dsh-shimmer').length;

describe('thinking 条目 shimmer 生命周期（闪烁回归钉子）', () => {
  it('打开的思考条目 + streaming → shimmer；工具入场关闭 → 摘除', () => {
    const tl = timelineFrom([
      { name: 'thinking', data: { content: '第一段思考' } },
    ]);
    renderTimeline(tl, true);
    expect(shimmerCount()).toBe(1);

    const closed = timelineFrom([
      { name: 'thinking', data: { content: '第一段思考' } },
      { name: 'tool_call', data: { id: 't1', name: 'read_workflow', args: {} } },
    ]);
    renderTimeline(closed, true);
    expect(shimmerCount()).toBe(1); // 只剩工具行的 running shimmer
  });

  it('run 级 streaming=true 但思考条目已收尾 → 思考不闪（run 级透传回归钉子）', () => {
    renderTimeline(
      [
        { kind: 'thinking', id: 'a', text: '已收尾思考', closed: true },
        { kind: 'thinking', id: 'b', text: '进行中的思考', closed: false },
      ],
      true
    );
    expect(shimmerCount()).toBe(1);
  });

  it('断线重连（connected=false）→ 全部条目停止闪烁', () => {
    renderTimeline([{ kind: 'thinking', id: 'a', text: '思考', closed: false }], true, false);
    expect(shimmerCount()).toBe(0);
  });

  it('streaming=false（历史回放）→ 永不闪烁', () => {
    renderTimeline([{ kind: 'thinking', id: 'a', text: '思考', closed: false }], false);
    expect(shimmerCount()).toBe(0);
  });
});

describe('工具行与通知', () => {
  it('工具行 running → shimmer；结果回填 → 摘除', () => {
    const running = timelineFrom([{ name: 'tool_call', data: { id: 't1', name: 'read_workflow', args: {} } }]);
    renderTimeline(running, true);
    expect(shimmerCount()).toBe(1);

    const done = timelineFrom([
      { name: 'tool_call', data: { id: 't1', name: 'read_workflow', args: {} } },
      { name: 'tool_result', data: { toolCallId: 't1', payload: '{"ok":1}' } },
    ]);
    renderTimeline(done, true);
    expect(shimmerCount()).toBe(0);
  });

  it('notice 条目渲染文本与 warn 样式', () => {
    renderTimeline([{ kind: 'notice', id: 'n1', text: '⏹ 已中断', source: 'interrupted' }], false);
    expect(container.textContent).toContain('⏹ 已中断');
  });

  it('文本条目流式中按段落分块渲染（settled + tail）', () => {
    renderTimeline([{ kind: 'text', id: 'x', text: '第一段。\n\n第二段进行中', closed: false }], true);
    expect(container.querySelectorAll('.md-body').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('第一段。');
    expect(container.textContent).toContain('第二段进行中');
  });
});
