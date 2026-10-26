/**
 * SessionRuntime reducer 状态契约测试（取代旧 live-stream-store.test）。
 *
 * 每个用例即一条「事件序列 → 状态断言」；历史 bug 全部固化为回归钉子：
 *  · thinking→text 边界（闪烁回归：已完成思考块永久 shimmer）
 *  · 终态收敛（任何终态路径漏发事件也不遗留闪烁）
 *  · 断线重连（connection 与 streaming 分离，重连期不得冒充流式）
 *  · seq 单调去重（断线重放不重复）
 *  · plan 事件入消息流（hidePlanCards 死循环回归的 reducer 侧钉子）
 *  · document 增量版本跟踪（对齐/失步）
 */
import { describe, expect, it } from 'vitest';

import { RuntimeStateInitial, reduce } from '../reducer';
import type { RuntimeAction } from '../reducer';
import type { RuntimeState } from '../state';
import type { TimelineItem } from '../../types';

function driver(initial: RuntimeState = RuntimeStateInitial('s')) {
  let state = initial;
  const dispatch = (action: RuntimeAction): void => {
    state = reduce(state, action);
  };
  const ev = (name: string, data?: any, seq?: number): void =>
    dispatch({ type: 'event', name, data: data ?? {}, ...(seq != null ? { seq } : {}) });
  return {
    dispatch,
    ev,
    get s() {
      return state;
    },
    timeline: () => state.timeline,
    last: (): TimelineItem | undefined => state.timeline[state.timeline.length - 1],
  };
}

/** 驱动一条思考条目到打开状态（已入、未收尾） */
function streamThinking(d: ReturnType<typeof driver>, text: string): void {
  d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
  d.ev('thinking', { content: text }, 2);
}

describe('条目收敛语义：closed 标志（闪烁回归钉子）', () => {
  it('thinking → text 边界：思考条目被关闭（停止 shimmer），新开文本条目', () => {
    const d = driver();
    streamThinking(d, '第一步先看看画布结构。');
    expect(d.last()).toMatchObject({ kind: 'thinking', closed: false });

    d.ev('token', { content: '好的，结构如下。' }, 3);

    expect(d.timeline()).toHaveLength(2);
    expect(d.timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(d.last()).toMatchObject({ kind: 'text', closed: false });
  });

  it('tool_call 入场：关闭尾部打开的 text/thinking（工具行接管「进行中」语义）', () => {
    const d = driver();
    streamThinking(d, '查一下数据。');
    d.ev('token', { content: '先看数据。' }, 3);

    d.ev('tool_call', { id: 't1', name: 'read_workflow', args: {} }, 4);

    expect(d.timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(d.timeline()[1]).toMatchObject({ kind: 'text', closed: true });
    expect(d.last()).toMatchObject({ kind: 'tool' });
  });

  it('tool_result 后的正文另起新文本条目，前一条保持收尾', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('token', { content: '第一段。' }, 2);
    d.ev('tool_call', { id: 't1', name: 'read_workflow', args: {} }, 3);
    d.ev('tool_result', { toolCallId: 't1', payload: '{"ok":true}' }, 4);
    d.ev('token', { content: '第二段。' }, 5);

    const tl = d.timeline();
    expect(tl[0]).toMatchObject({ kind: 'text', closed: true });
    expect(tl[1]).toMatchObject({ kind: 'tool' });
    expect(tl[2]).toMatchObject({ kind: 'text', closed: false });
  });

  it('done 终态关闭全部打开条目 —— 任何终态路径都不遗留闪烁', () => {
    const d = driver();
    streamThinking(d, '还在思考。');
    d.ev('done', {}, 3);

    expect(d.last()).toMatchObject({ kind: 'thinking', closed: true });
    expect(d.s.streaming).toBe(false);
    expect(d.s.currentTool).toBeNull();
  });

  it('notice 入场同样关闭尾部打开条目（中断/护栏提示后思考不再闪）', () => {
    const d = driver();
    streamThinking(d, '思考中。');
    d.ev('interrupted', {}, 3);

    expect(d.timeline()[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(d.last()).toMatchObject({ kind: 'notice' });
  });
});

describe('快照重建（run_state running 回放）', () => {
  it('交错时间线快照：最后一条 text/thinking 打开，其余全部收尾（重连回放不全体闪烁）', () => {
    const d = driver();
    d.ev('run_state', {
      status: 'running',
      runId: 'r1',
      assistantContent: '正文进行中',
      thinking: '思考一思考二',
      timeline: [
        { kind: 'thinking', id: 'a', text: '思考一' },
        { kind: 'tool', id: 't1', call: { id: 't1', name: 'read_workflow', args: {} } },
        { kind: 'thinking', id: 'b', text: '思考二' },
        { kind: 'text', id: 'c', text: '正文进行中' },
      ],
    }, 1);

    const tl = d.timeline();
    expect(tl[0]).toMatchObject({ kind: 'thinking', closed: true });
    expect(tl[2]).toMatchObject({ kind: 'thinking', closed: true });
    expect(tl[3]).toMatchObject({ kind: 'text', closed: false });
    expect(d.s.content).toBe('正文进行中');
    expect(d.s.thinking).toBe('思考一思考二');
    // live 占位行已建立（时间线由它渲染）
    expect(d.s.liveMessageId).toBeTruthy();
  });

  it('旧后端无 timeline：单条文本打开，后续 token 续写同一条', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1', assistantContent: '已输出的一半' }, 1);
    expect(d.last()).toMatchObject({ kind: 'text', closed: false });

    d.ev('token', { content: '的另一半' }, 2);
    expect(d.s.content).toBe('已输出的一半的另一半');
    expect(d.timeline()).toHaveLength(1);
  });

  it('快照 startedAt 沿用后端起点（刷新后秒表续走，不归零）；非法值回退当下', () => {
    const backendStart = Date.now() - 33_000;
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1', startedAt: backendStart }, 1);
    expect(d.s.startedAt).toBe(backendStart);

    d.ev('run_state', { status: 'running', runId: 'r2', startedAt: 0 }, 2);
    expect(d.s.startedAt).toBeGreaterThanOrEqual(backendStart);
  });

  it('快照 pendingAsk 恢复提问卡；docVersion 跟踪', () => {
    const d = driver();
    d.ev('run_state', {
      status: 'running',
      runId: 'r1',
      pendingAsk: { askId: 'a1', question: '选哪个？', options: [{ label: 'A' }] },
      docVersion: 7,
    }, 1);
    const askRow = d.s.messages.find((m) => m.id === 'ask-a1');
    expect(askRow?.ask).toMatchObject({ askId: 'a1', answered: false });
    expect(d.s.docVersion).toBe(7);
  });
});

describe('连接状态（streaming 与 connection 分离）', () => {
  it('断线重连：streaming 保持 true（后端仍在跑）但 connection 可见', () => {
    const d = driver();
    d.dispatch({ type: 'run-accepted' });
    d.dispatch({ type: 'connected' });
    d.dispatch({ type: 'reconnecting' });
    expect(d.s.streaming).toBe(true);
    expect(d.s.connection).toBe('reconnecting');
  });

  it('重连成功回到 connected；reset 归位 idle', () => {
    const d = driver();
    d.dispatch({ type: 'reconnecting' });
    d.dispatch({ type: 'connected' });
    expect(d.s.connection).toBe('connected');
    d.dispatch({ type: 'reset', sessionKey: null });
    expect(d.s.connection).toBe('idle');
  });
});

describe('seq 单调去重（断线重放）', () => {
  it('晚到的旧 seq 一律丢弃：不倒灌正文、不重复工具行', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 10);
    d.ev('token', { content: '新' }, 12);
    // SSE 单连接保序；重连重放只会补「lastSeq 之后」的帧。
    // 更小的 seq（重放/乱序/过载丢弃的残留）一律视为过期：
    d.ev('token', { content: '旧' }, 11);
    d.ev('token', { content: '更旧' }, 9);
    d.ev('tool_call', { id: 't9', name: 'x', args: {} }, 8);
    expect(d.s.content).toBe('新');
    expect(d.timeline().some((i) => i.kind === 'tool' && i.id === 't9')).toBe(false);
    // 正常前进不受影响
    d.ev('token', { content: '！' }, 13);
    expect(d.s.content).toBe('新！');
  });

  it('不带 seq 的帧放行（旧协议兼容）', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 5);
    d.ev('token', { content: '无序号' });
    expect(d.s.content).toBe('无序号');
  });
});

describe('plan / ask / artifact 消息行', () => {
  it('plan 事件 upsert plan-live 行（hidePlanCards 死循环回归的 reducer 侧钉子）', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('plan', { kind: 'todo', steps: [{ id: 's1', intent: '第一步', status: 'running' }] }, 2);
    const row = d.s.messages.find((m) => m.id === 'plan-live');
    expect(row?.planSteps?.[0]).toMatchObject({ intent: '第一步' });
    // 再来一次 upsert 幂等（不重复成行）
    d.ev('plan', { kind: 'todo', steps: [{ id: 's1', intent: '第一步（完成）', status: 'completed' }] }, 3);
    expect(d.s.messages.filter((m) => m.id === 'plan-live')).toHaveLength(1);
    expect(d.s.messages.find((m) => m.id === 'plan-live')?.planSteps?.[0]).toMatchObject({
      intent: '第一步（完成）',
    });
  });

  it('ask_resolved：卡片收敛 + 答案气泡入列（幂等）', () => {
    const d = driver();
    d.ev('ask_request', { askId: 'a1', question: 'Q' }, 1);
    d.ev('ask_resolved', { askId: 'a1', answer: 'A' }, 2);
    expect(d.s.messages.find((m) => m.id === 'ask-a1')?.ask).toMatchObject({ answered: true, answer: 'A' });
    expect(d.s.messages.some((m) => m.id === 'ask-answer-a1' && m.role === 'user')).toBe(true);
    d.ev('ask_resolved', { askId: 'a1', answer: 'A' }, 3);
    expect(d.s.messages.filter((m) => m.id === 'ask-answer-a1')).toHaveLength(1);
  });

  it('artifact upsert 进产物表；release 额外成为对话流卡片', () => {
    const d = driver();
    d.ev('artifact', { action: 'upsert', artifact: { artifactKey: 'w1', type: 'workflow', status: 'draft', version: 1 } }, 1);
    d.ev('artifact', { action: 'upsert', artifact: { artifactKey: 'r1', type: 'release', status: 'ok', version: 2 } }, 2);
    expect(d.s.artifacts.map((a) => a.artifactKey)).toEqual(['w1', 'r1']);
    expect(d.s.messages.some((m) => m.id === 'artifact-r1')).toBe(true);
    d.ev('artifact', { action: 'state', artifactKey: 'r1', status: 'published' }, 3);
    expect(d.s.artifacts.find((a) => a.artifactKey === 'r1')?.status).toBe('published');
  });
});

describe('document 增量版本跟踪', () => {
  it('全量带版本 → 同步；ops 基准对齐 → 不失步；基准错位 → 失步待全量', () => {
    const d = driver();
    d.ev('document', { dsl: { nodes: [{ id: 'n1' }], edges: [] }, version: 3 }, 1);
    expect(d.s.docVersion).toBe(3);
    expect(d.s.docDesync).toBe(false);

    d.ev('document', { ops: [{ op: 'node_set', node: { id: 'n2' } }], baseVersion: 3, version: 4 }, 2);
    expect(d.s.docVersion).toBe(4);
    expect(d.s.docDesync).toBe(false);

    // 本地是 4，服务端却基于 2 发增量 → 失步（宿主应 GET /document）
    d.ev('document', { ops: [{ op: 'node_remove', id: 'n1' }], baseVersion: 2, version: 5 }, 3);
    expect(d.s.docVersion).toBe(5);
    expect(d.s.docDesync).toBe(true);

    // 全量兜底到达后恢复同步
    d.dispatch({ type: 'doc-synced', version: 5 });
    expect(d.s.docDesync).toBe(false);
  });
});

describe('run_end 时间账小结', () => {
  it('时间账进时间线（live 可见），失败链随 meta', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('run_end', { outcome: 'done', turns: 3, durationMs: 4123, toolTimeMs: 1500, promptTokens: 100, completionTokens: 20 }, 2);
    const item = d.last();
    expect(item).toMatchObject({ kind: 'notice', source: 'run_summary' });
    expect((item as any).text).toContain('4.1s');
    expect((item as any).meta).toMatchObject({ turns: 3 });
  });
});

describe('run 边界：同一会话连续两轮（第二轮回复 = 上一轮内容 回归钉子）', () => {
  /** 跑完一整轮并按 settle 协议收口（end-run → 历史重载 → live-clear） */
  function finishedFirstRun(d: ReturnType<typeof driver>): void {
    d.ev('run_state', { status: 'running', runId: 'r1', startedAt: Date.now() - 5000 }, 1);
    d.ev('thinking', { content: '想一想。' }, 2);
    d.ev('tool_call', { id: 't1', name: 'get', args: {} }, 3);
    d.ev('tool_result', { toolCallId: 't1', payload: '{}' }, 4);
    d.ev('token', { content: '第一轮的回答。' }, 5);
    d.ev('done', {}, 6);
    d.dispatch({ type: 'end-run' });
    d.dispatch({ type: 'live-clear' });
    expect(d.s.liveMessageId).toBeNull();
    expect(d.s.streaming).toBe(false);
    // 修复前：现场在这里原样残留，第二轮 live 行一建立就把它渲染出来
  }

  it('第二轮起跑快照（后端无 timeline）建立的 live 行必须是空现场，不得渲染第一轮正文', () => {
    const d = driver();
    finishedFirstRun(d);

    d.dispatch({ type: 'optimistic-user', text: '第二个问题' });
    d.dispatch({ type: 'run-accepted' });
    d.ev('run_state', { status: 'running', runId: 'r2', turn: 0, assistantContent: '', toolCalls: [], startedAt: Date.now() }, 7);

    expect(d.timeline()).toEqual([]);
    expect(d.s.content).toBe('');
    expect(d.s.thinking).toBe('');
    expect(d.s.currentTool).toBeNull();
    expect(d.s.runId).toBe('r2');
    // 新 live 行建立在用户消息之后（不是复用/串到上一轮）
    const ids = d.s.messages.map((m) => m.id);
    expect(ids[ids.length - 1]).toBe('live-r2');
    expect(ids[ids.length - 2]).toMatch(/^local-/);

    d.ev('token', { content: '第二轮的回答。' }, 8);
    expect(d.s.content).toBe('第二轮的回答。');
    expect(d.timeline()).toHaveLength(1);
    expect(d.timeline().some((i) => i.kind === 'tool' && i.id === 't1')).toBe(false);
  });

  it('SSE 起跑快照先于 POST 回执到达：现场由快照重置一次，run-accepted 不得再抹掉已流入的正文', () => {
    const d = driver();
    finishedFirstRun(d);

    d.ev('run_state', { status: 'running', runId: 'r2', startedAt: Date.now() }, 7);
    d.ev('token', { content: '抢先到的正文' }, 8);
    d.dispatch({ type: 'run-accepted' });

    expect(d.s.content).toBe('抢先到的正文');
    expect(d.timeline()).toHaveLength(1);
    expect(d.s.streaming).toBe(true);
  });

  it('run-accepted 单独也重置现场（起跑快照被丢/晚到时的兜底）；秒表从本轮起点重计', () => {
    const d = driver();
    finishedFirstRun(d);
    const firstStart = d.s.startedAt;

    d.dispatch({ type: 'run-accepted' });

    expect(d.timeline()).toEqual([]);
    expect(d.s.content).toBe('');
    expect(d.s.thinking).toBe('');
    expect(d.s.streaming).toBe(true);
    expect(d.s.startedAt).toBeGreaterThan(firstStart);
  });

  it('steering：run 进行中再发消息不是新 run，现场保持', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('token', { content: '进行中的正文' }, 2);

    d.dispatch({ type: 'optimistic-user', text: '补充一句' });
    d.dispatch({ type: 'run-accepted' });

    expect(d.s.content).toBe('进行中的正文');
    expect(d.timeline()).toHaveLength(1);
  });

  it('同 runId 的重连快照不算新 run：无 timeline 的快照不得清空本地现场', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('token', { content: '已经输出的内容' }, 2);

    d.ev('run_state', { status: 'running', runId: 'r1' }, 3);

    expect(d.s.content).toBe('已经输出的内容');
    expect(d.timeline()).toHaveLength(1);
  });

  it('上一轮 settle 晚于新一轮起跑（链式起跑）：live-clear 不得摘掉新 run 正在用的 live 行', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 1);
    d.ev('token', { content: '第一轮' }, 2);
    d.ev('done', {}, 3);
    d.dispatch({ type: 'end-run' });
    // 历史还没回来，后端已链式起跑第二轮
    d.ev('run_state', { status: 'running', runId: 'r2' }, 4);
    d.ev('token', { content: '第二轮' }, 5);
    const liveId = d.s.liveMessageId;
    expect(liveId).toBeTruthy();

    d.dispatch({ type: 'live-clear' });

    expect(d.s.liveMessageId).toBe(liveId);
    expect(d.s.messages.some((m) => m.id === liveId)).toBe(true);
    expect(d.s.content).toBe('第二轮');

    // 第二轮自己收尾后才摘
    d.ev('done', {}, 6);
    d.dispatch({ type: 'end-run' });
    d.dispatch({ type: 'live-clear' });
    expect(d.s.liveMessageId).toBeNull();
  });
});

describe('频道重建（后端重启 / 空闲回收）后的 seq 游标对齐', () => {
  it('run_state 快照 seq 回退 = 频道从头计数：接受并对齐游标，后续低 seq 事件照常流入', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 300);
    d.ev('token', { content: '重启前' }, 350);
    d.ev('done', {}, 351);
    expect(d.s.lastSeq).toBe(351);

    // 后端重启：新频道订阅快照 seq=0（idle），随后新 run 从 1 开始计数
    d.ev('run_state', { status: 'idle' }, 0);
    expect(d.s.lastSeq).toBe(0);
    d.dispatch({ type: 'run-accepted' });
    d.ev('run_state', { status: 'running', runId: 'r2' }, 1);
    d.ev('token', { content: '重启后' }, 2);

    expect(d.s.runId).toBe('r2');
    expect(d.s.content).toBe('重启后');
    expect(d.s.lastSeq).toBe(2);
  });

  it('非 run_state 事件的 seq 回退仍是旧帧，照旧丢弃（去重语义不放松）', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 10);
    d.ev('token', { content: '新' }, 12);
    d.ev('token', { content: '旧' }, 3);
    d.ev('tool_call', { id: 'old', name: 'x', args: {} }, 2);
    expect(d.s.content).toBe('新');
    expect(d.timeline().some((i) => i.kind === 'tool')).toBe(false);
    expect(d.s.lastSeq).toBe(12);
  });

  it('同频道重连快照 seq 与游标相等：无新事件，照旧忽略', () => {
    const d = driver();
    d.ev('run_state', { status: 'running', runId: 'r1' }, 5);
    d.ev('token', { content: '正文' }, 6);
    const before = d.s;
    d.ev('run_state', { status: 'running', runId: 'r1' }, 6);
    expect(d.s).toBe(before);
  });
});
