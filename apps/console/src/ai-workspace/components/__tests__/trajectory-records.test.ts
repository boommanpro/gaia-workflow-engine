/**
 * trajectory-records.buildRecords 单测——聚焦 request_json 三种数据口径：
 * 增量拼回（含 tools 并入）、基准缺失、digest 兜底，以及压缩摘要行不污染基准。
 * 背景见 compressRequestJson（后端恒以 seq=1 为基准做增量存储）。
 */
import { describe, expect, it } from 'vitest';

import { buildRecords, mergeLiveEvents } from '../trajectory-records';

const BASE_MESSAGES = [
  { role: 'system', content: 'SYS' },
  { role: 'user', content: 'HELLO' },
];
const BASE_TOOLS = [{ type: 'function', function: { name: 'write_workflow' } }];

const baseCall = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  runId: 'r1',
  seq: 1,
  model: 'test-model',
  messagesCount: 2,
  toolsCount: 1,
  status: 'ok',
  createdAt: '2026-10-11T10:00:00',
  requestJson: JSON.stringify({ model: 'test-model', tools: BASE_TOOLS, messages: BASE_MESSAGES }),
  responseJson: JSON.stringify({ choices: [] }),
  promptDigest: 'PD',
  outputDigest: 'OD',
  ...over,
});

const modelRecords = (records: ReturnType<typeof buildRecords>) => records.filter((r) => r.kind === 'model');

describe('buildRecords · request_json 口径', () => {
  it('增量行拼回全量：messages 按共享前缀还原、tools 并入基准、口径与原始存储都保留', () => {
    const tail = [
      { role: 'assistant', content: '', tool_calls: [{ id: 'tc1' }] },
      { role: 'tool', content: 'RESULT' },
    ];
    const records = buildRecords([], [
      baseCall(),
      baseCall({
        id: 'c2', seq: 2, messagesCount: 4, createdAt: '2026-10-11T10:00:05',
        requestJson: JSON.stringify({ sharedMessages: 2, baseSeq: 1, toolsSameAsBase: true, messages: tail }),
      }),
    ]);
    const [first, second] = modelRecords(records);
    expect(first.requestMeta).toMatchObject({ incremental: false, assembled: false });

    expect(second.requestMeta?.incremental).toBe(true);
    expect(second.requestMeta?.assembled).toBe(true);
    expect(second.requestMeta?.sharedPrefix).toBe(2);
    expect(second.requestMeta?.baseRequestNo).toBe(1);

    const assembled = second.request as any;
    expect(assembled.messages).toHaveLength(4);
    expect(assembled.messages[0]).toEqual(BASE_MESSAGES[0]);
    expect(assembled.messages[2]).toEqual(tail[0]);
    expect(assembled.tools).toEqual(BASE_TOOLS);
    // 拼回视图不含增量记账字段，才是可 curl 复现的请求体
    expect(assembled.sharedMessages).toBeUndefined();
    expect(assembled.baseSeq).toBeUndefined();
    expect(assembled.toolsSameAsBase).toBeUndefined();

    // 原始存储形态完整保留，供口径切换
    expect((second.requestRaw as any).sharedMessages).toBe(2);
    expect((second.requestRaw as any).messages).toHaveLength(2);
  });

  it('基准缺失（如被截断）时保留原始存储形态，不假装完整', () => {
    const records = buildRecords([], [
      baseCall({
        requestJson: JSON.stringify({ sharedMessages: 2, baseSeq: 1, toolsSameAsBase: true, messages: [{ role: 'tool' }] }),
      }),
    ]);
    const [only] = modelRecords(records);
    expect(only.requestMeta).toMatchObject({ incremental: true, assembled: false });
    expect((only.request as any).sharedMessages).toBe(2);
  });

  it('无 request_json 时回落 digest 并显式标注截断口径', () => {
    const records = buildRecords([], [
      baseCall({ requestJson: null, responseJson: null }),
    ]);
    const [only] = modelRecords(records);
    expect(only.request).toBe('PD');
    expect(only.requestMeta?.digestOnly).toBe(true);
    expect(only.response).toBe('OD');
    expect(only.requestMeta?.responseDigestOnly).toBe(true);
  });

  it('压缩摘要行（无 tools 的全量形态）不充当拼回基准', () => {
    const tail = [{ role: 'assistant', content: 'after-compaction' }];
    const records = buildRecords([], [
      baseCall(),
      baseCall({
        id: 'c18', seq: 18, messagesCount: 2, toolsCount: 0, createdAt: '2026-10-11T10:01:00',
        // 压缩摘要调用：system + 大 user，无 tools、无 sharedMessages
        requestJson: JSON.stringify({ model: 'test-model', messages: [{ role: 'system', content: 'SUMMARY-INSTR' }, { role: 'user', content: 'TRANSCRIPT' }] }),
      }),
      baseCall({
        id: 'c19', seq: 19, messagesCount: 3, createdAt: '2026-10-11T10:01:30',
        requestJson: JSON.stringify({ sharedMessages: 2, baseSeq: 1, toolsSameAsBase: true, messages: tail }),
      }),
    ]);
    const models = modelRecords(records);
    expect(models).toHaveLength(3);
    const assembled = models[2].request as any;
    expect(models[2].requestMeta?.assembled).toBe(true);
    // 仍以 seq=1 为基准（后端语义），而不是被摘要行顶掉
    expect(assembled.messages[0]).toEqual(BASE_MESSAGES[0]);
    expect(assembled.messages).toHaveLength(3);
    expect(assembled.tools).toEqual(BASE_TOOLS);
  });

  it('事件流：tool_call/tool_result 配对为一条工具记录', () => {
    const records = buildRecords([
      { id: 2, runId: 'r1', eventType: 'tool_result', createdAt: '2026-10-11T10:00:10', payload: JSON.stringify({ toolCallId: 'tc1', outcome: 'SUCCESS', payload: '{"message":"ok"}' }) },
      { id: 1, runId: 'r1', eventType: 'tool_call', createdAt: '2026-10-11T10:00:02', payload: JSON.stringify({ id: 'tc1', name: 'write_workflow', args: { workflowCode: 'x' } }) },
    ], []);
    const tool = records.find((r) => r.kind === 'tool');
    expect(tool).toBeDefined();
    expect(tool?.resultText).toBe('ok');
    expect(tool?.isRunning).toBe(false);
    expect(tool?.durationMs).toBe(8000);
  });
});

describe('mergeLiveEvents：权威行 + 实时账本行合并（派生读取收口）', () => {
  it('无实时行时原样返回权威行（引用不变）', () => {
    const fetched = [{ id: 1, eventType: 'run_input', payload: '{}' }];
    expect(mergeLiveEvents(fetched, [])).toBe(fetched);
  });

  it('实时行追加在权威行之后；同型同载荷新旧重叠时以权威行为准（不重复）', () => {
    const fetched = [
      { id: 1, runId: 'r1', eventType: 'run_input', createdAt: '2026-10-11T10:00:00', payload: JSON.stringify({ content: 'hi' }) },
    ];
    const live = [
      // 边界重拉期间在途的实时行：与权威行同型同载荷 → 去重
      { id: 'live-1', runId: 'r1', eventType: 'run_input', createdAt: '2026-10-11T10:00:00', payload: JSON.stringify({ content: 'hi' }) },
      // 权威拉取之后的新事件 → 保留
      { id: 'live-2', runId: 'r1', eventType: 'tool_call', createdAt: '2026-10-11T10:00:05', payload: JSON.stringify({ id: 'tc1', name: 'get', args: {} }) },
    ];
    const merged = mergeLiveEvents(fetched, live);
    expect(merged).toHaveLength(2);
    expect(merged.map((e: any) => e.eventType)).toEqual(['run_input', 'tool_call']);
    // 合并行可直接喂 buildRecords（与 REST 行同构）
    const records = buildRecords(merged, []);
    expect(records.find((r) => r.kind === 'user')).toBeDefined();
    expect(records.find((r) => r.kind === 'tool')).toBeDefined();
  });
});
