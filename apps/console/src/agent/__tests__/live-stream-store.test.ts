/**
 * live-stream-store 状态契约测试（Phase 0/2 mock 验收）。
 *
 * 每个用例即一条「事件序列 → 状态断言」的 fixture；历史 bug 全部固化为回归钉子：
 *  · thinking→text 边界（闪烁回归：run 级 streaming 透传导致已完成思考块永久 shimmer）
 *  · endRun 收敛（终态路径漏发事件也不会遗留闪烁）
 *  · 断线重连（connection 与 streaming 分离，重连期不得冒充流式）
 *
 * node 环境无 requestAnimationFrame，store 自动退化为同步 publishNow —— 用例确定性。
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { liveStreamStore } from '../live-stream-store';
import type { TimelineItem } from '../types';

/** 驱动一条思考条目到打开状态（token 已入、未收尾） */
function streamThinking(text: string): void {
  liveStreamStore.beginRun();
  liveStreamStore.appendThinking(text);
  liveStreamStore.flush();
}

const timeline = (): TimelineItem[] => liveStreamStore.getSnapshot().timeline;
const last = (): TimelineItem | undefined => timeline()[timeline().length - 1];

beforeEach(() => {
  liveStreamStore.reset();
});

describe('条目收敛语义：closed 标志（闪烁回归钉子）', () => {
  it('thinking → text 边界：思考条目被关闭（停止 shimmer），新开文本条目', () => {
    streamThinking('第一步先看看画布结构。');
    expect(last()).toMatchObject({ kind: 'thinking', closed: false });

    liveStreamStore.appendContent('好的，结构如下。');
    liveStreamStore.flush();

    expect(timeline()).toHaveLength(2);
    expect(timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(last()).toMatchObject({ kind: 'text', closed: false });
  });

  it('tool_call 入场：关闭尾部打开的 text/thinking（dsh：工具行接管「进行中」语义）', () => {
    streamThinking('查一下数据。');
    liveStreamStore.appendContent('先看数据。');
    liveStreamStore.flush();

    liveStreamStore.recordTool({ id: 't1', action: 'read_workflow', args: {} });

    expect(timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(timeline()[1]).toMatchObject({ kind: 'text', closed: true });
    expect(last()).toMatchObject({ kind: 'tool' });
  });

  it('tool_result 后的正文另起新文本条目，前一条保持收尾', () => {
    liveStreamStore.beginRun();
    liveStreamStore.appendContent('第一段。');
    liveStreamStore.flush();
    liveStreamStore.recordTool({ id: 't1', action: 'read_workflow', args: {} });
    liveStreamStore.resolveTool('t1', '{"ok":true}');
    liveStreamStore.appendContent('第二段。');
    liveStreamStore.flush();

    const tl = timeline();
    expect(tl[0]).toMatchObject({ kind: 'text', closed: true });
    expect(tl[1]).toMatchObject({ kind: 'tool' });
    expect(tl[2]).toMatchObject({ kind: 'text', closed: false });
  });

  it('endRun 关闭全部打开条目 —— 任何终态路径都不遗留闪烁', () => {
    streamThinking('还在思考。');
    liveStreamStore.endRun();

    expect(last()).toMatchObject({ kind: 'thinking', closed: true });
    expect(liveStreamStore.getSnapshot().streaming).toBe(false);
  });

  it('notice 入场同样关闭尾部打开条目（中断/护栏提示后思考不再闪）', () => {
    streamThinking('思考中。');
    liveStreamStore.addNotice('⏹ 本次运行已被中断', 'interrupted');

    expect(timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(last()).toMatchObject({ kind: 'notice' });
  });
});

describe('快照重建（applySnapshot / replaceContent）', () => {
  it('交错时间线快照：最后一条 text/thinking 打开，其余全部收尾（重连回放不全体闪烁）', () => {
    liveStreamStore.beginRun();
    liveStreamStore.applySnapshot(
      [
        { kind: 'thinking', id: 'a', text: '思考一' },
        { kind: 'tool', id: 't1', call: { id: 't1', name: 'read_workflow', args: {} } },
        { kind: 'thinking', id: 'b', text: '思考二' },
        { kind: 'text', id: 'c', text: '正文进行中' },
      ],
      '正文进行中',
      '思考一思考二'
    );

    const tl = timeline();
    expect(tl[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(tl[2]).toMatchObject({ kind: 'thinking', closed: true });
    expect(tl[3]).toMatchObject({ kind: 'text', closed: false });
  });

  it('旧后端无 timeline：replaceContent 单条文本打开，后续可继续流式', () => {
    liveStreamStore.beginRun();
    liveStreamStore.replaceContent('已输出的一半');
    expect(last()).toMatchObject({ kind: 'text', closed: false });

    liveStreamStore.appendContent('的另一半');
    liveStreamStore.flush();
    expect(liveStreamStore.getSnapshot().content).toBe('已输出的一半的另一半');
    expect(timeline()).toHaveLength(1);
  });
});

describe('连接状态（streaming 与 connection 分离）', () => {
  it('断线 → markReconnecting：streaming 保持 true（后端仍在跑）但 connection 可见', () => {
    liveStreamStore.beginRun();
    liveStreamStore.markConnected();
    liveStreamStore.markReconnecting();

    const s = liveStreamStore.getSnapshot();
    expect(s.streaming).toBe(true);
    expect(s.connection).toBe('reconnecting');
  });

  it('重连成功 → markConnected 回到 connected', () => {
    liveStreamStore.markReconnecting();
    liveStreamStore.markConnected();
    expect(liveStreamStore.getSnapshot().connection).toBe('connected');
  });

  it('beginRun 不清空连接状态（受理开现场时订阅已建立）', () => {
    liveStreamStore.markConnected();
    liveStreamStore.beginRun();
    expect(liveStreamStore.getSnapshot().connection).toBe('connected');
  });

  it('reset 归位 idle', () => {
    liveStreamStore.markReconnecting();
    liveStreamStore.reset();
    expect(liveStreamStore.getSnapshot().connection).toBe('idle');
  });
});

describe('结构性事件与聚合字段', () => {
  it('flush 立即发布缓冲（不等待 rAF）', () => {
    liveStreamStore.beginRun();
    liveStreamStore.appendContent('AB');
    liveStreamStore.flush();
    expect(liveStreamStore.getSnapshot().content).toBe('AB');
  });

  it('resolveTool 原地回填结果与结束时间', () => {
    liveStreamStore.beginRun();
    liveStreamStore.recordTool({ id: 't1', action: 'read_workflow', args: {} });
    liveStreamStore.resolveTool('t1', '{"ok":1}');

    const item = timeline()[0] as Extract<TimelineItem, { kind: 'tool' }>;
    expect(item.call.result).toBe('{"ok":1}');
    expect(item.endedAt).toBeTruthy();
  });

  it('markTool 跟踪当前执行工具并在 tool_result 清空', () => {
    liveStreamStore.beginRun();
    liveStreamStore.recordTool({ id: 't1', action: 'read_workflow', args: {} });
    liveStreamStore.markTool('read_workflow');
    expect(liveStreamStore.getSnapshot().currentTool).toBe('read_workflow');
    liveStreamStore.markTool(null);
    expect(liveStreamStore.getSnapshot().currentTool).toBeNull();
  });

  it('beginRun 重置现场但保留 version 单调递增（订阅方感知变化）', () => {
    liveStreamStore.beginRun();
    liveStreamStore.appendContent('上一轮');
    liveStreamStore.flush();
    const v1 = liveStreamStore.getSnapshot().version;
    liveStreamStore.beginRun();
    const s = liveStreamStore.getSnapshot();
    expect(s.version).toBeGreaterThan(v1);
    expect(s.timeline).toHaveLength(0);
    expect(s.content).toBe('');
    expect(s.streaming).toBe(true);
  });
});
