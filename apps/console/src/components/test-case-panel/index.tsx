/**
 * 测试用例面板（2026-10-17 工具体系重构期3）：
 * 用例列表（节点级/工作流级）+ 新建（mock 输入 + 期望断言）+ 运行（断言明细）+ 历史 + 删除。
 * 数据面与 agent 的 test_case / run(target=tests) 同一套 REST（/api/test-case/*）。
 */
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, SideSheet, TextArea, Typography, Tag, Empty, Popconfirm } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconRefresh } from '@douyinfe/semi-icons';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface TestCase {
  id: number;
  workflowCode: string;
  nodeId: string | null;
  name: string;
  description?: string;
  inputsJson: string;
  expectedJson: string;
  createdBy?: string;
  enabled?: number;
}

interface AssertLine {
  field: string;
  op: string;
  expected?: any;
  actual?: any;
  pass: boolean;
}

interface TestRun {
  id: number;
  caseId: number;
  status: 'passed' | 'failed' | 'error' | 'stale';
  assertResultsJson?: string;
  error?: string;
  durationMs?: number;
  executedAt?: string;
}

interface ExpectedRow {
  field: string;
  op: 'exists' | 'equals' | 'contains';
  value: string;
}

export interface TestCasePanelProps {
  workflowCode: string;
  /** 当前画布 JSON 的 getter（运行时优先用画布现场；不传跑生效版本） */
  getCanvasJson?: () => any | null;
  /** 画布节点清单（新建用例时选目标节点） */
  getNodes?: () => { id: string; type: string; title?: string }[];
}

const statusTag = (status?: string) => {
  const map: Record<string, { color: string; text: string }> = {
    passed: { color: 'green', text: '通过' },
    failed: { color: 'red', text: '失败' },
    error: { color: 'red', text: '错误' },
    stale: { color: 'grey', text: '已失效' },
  };
  const item = map[status || ''] || { color: 'grey', text: status || '未运行' };
  return <Tag size="small" color={item.color as any}>{item.text}</Tag>;
};

export const TestCasePanel: FC<TestCasePanelProps> = ({ workflowCode, getCanvasJson, getNodes }) => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [runsByCase, setRunsByCase] = useState<Record<number, TestRun>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [inputsText, setInputsText] = useState('{}');
  const [expectedRows, setExpectedRows] = useState<ExpectedRow[]>([{ field: '', op: 'exists', value: '' }]);

  const reload = useCallback(async () => {
    if (!workflowCode) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/test-case/list?workflowCode=${encodeURIComponent(workflowCode)}`);
      setCases(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, [workflowCode]);

  useEffect(() => { reload(); }, [reload]);

  const runOne = useCallback(async (testCase: TestCase) => {
    const body: any = { caseId: testCase.id };
    const canvas = getCanvasJson?.();
    if (canvas) body.schema = JSON.stringify(canvas);
    const res = await fetch(`${getApiBaseUrl()}/test-case/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.run) {
      setRunsByCase(prev => ({ ...prev, [testCase.id]: data.run }));
    }
  }, [getCanvasJson]);

  const runAll = useCallback(async () => {
    const body: any = { workflowCode };
    const canvas = getCanvasJson?.();
    if (canvas) body.schema = JSON.stringify(canvas);
    const res = await fetch(`${getApiBaseUrl()}/test-case/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (Array.isArray(data.runs)) {
      const map: Record<number, TestRun> = {};
      for (const run of data.runs) map[run.caseId] = run;
      setRunsByCase(map);
    }
  }, [workflowCode, getCanvasJson]);

  const create = useCallback(async () => {
    const expected = expectedRows
      .filter(row => row.field.trim())
      .map(row => ({ field: row.field.trim(), op: row.op, ...(row.op === 'exists' ? {} : { value: row.value }) }));
    if (!name.trim() || expected.length === 0) return;
    await fetch(`${getApiBaseUrl()}/test-case/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowCode, nodeId: nodeId || null, name: name.trim(), inputs: safeJson(inputsText), expected }),
    });
    setName(''); setNodeId(''); setInputsText('{}'); setExpectedRows([{ field: '', op: 'exists', value: '' }]);
    setCreating(false);
    await reload();
  }, [workflowCode, nodeId, name, inputsText, expectedRows, reload]);

  const remove = useCallback(async (id: number) => {
    await fetch(`${getApiBaseUrl()}/test-case/delete/${id}`, { method: 'DELETE' });
    await reload();
  }, [reload]);

  const parsedAsserts = useMemo(() => (run: TestRun): AssertLine[] => {
    try { return JSON.parse(run.assertResultsJson || '[]'); } catch { return []; }
  }, []);

  const nodeOptions = useMemo(() => (getNodes?.() || []).map(n => ({ value: n.id, label: `${n.title || n.type} (${n.id})` })), [getNodes]);

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title heading={5} style={{ margin: 0 }}>测试用例</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" icon={<IconRefresh />} onClick={runAll}>全部运行</Button>
          <Button size="small" theme="solid" icon={<IconPlus />} onClick={() => setCreating(v => !v)}>
            {creating ? '收起' : '新建'}
          </Button>
        </div>
      </div>

      {creating && (
        <div style={{ border: '1px solid #e0e0ee', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input size="small" placeholder="用例名（一句话说清场景）" value={name} onChange={setName} />
          <Select size="small" placeholder="目标节点（不选=工作流级）" showClear style={{ width: '100%' }}
            value={nodeId || undefined} onChange={v => setNodeId(String(v || ''))}
            optionList={nodeOptions} />
          <TextArea autosize={{ minRows: 3, maxRows: 8 }} value={inputsText} onChange={(v: string) => setInputsText(v)}
            placeholder='输入 mock（节点级: {"上游id":{"字段":值}}；工作流级: start 入参）' />
          {expectedRows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Input size="small" style={{ width: 130 }} placeholder="字段（如 output）"
                value={row.field}
                onChange={v => setExpectedRows(rows => rows.map((r, i) => i === idx ? { ...r, field: v } : r))} />
              <Select size="small" style={{ width: 100 }} value={row.op}
                onChange={(v: any) => setExpectedRows(rows => rows.map((r, i) => i === idx ? { ...r, op: String(v) as ExpectedRow['op'] } : r))}
                optionList={[
                  { value: 'exists', label: '存在' },
                  { value: 'equals', label: '等于' },
                  { value: 'contains', label: '包含' },
                ]} />
              {row.op !== 'exists' && (
                <Input size="small" style={{ flex: 1 }} placeholder="期望值" value={row.value}
                  onChange={v => setExpectedRows(rows => rows.map((r, i) => i === idx ? { ...r, value: v } : r))} />
              )}
              {expectedRows.length > 1 && (
                <Button size="small" type="danger" theme="borderless"
                  onClick={() => setExpectedRows(rows => rows.filter((_, i) => i !== idx))}>删</Button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" onClick={() => setExpectedRows(rows => [...rows, { field: '', op: 'exists', value: '' }])}>
              加一条断言
            </Button>
            <Button size="small" theme="solid" onClick={create}
              disabled={!name.trim() || !expectedRows.some(r => r.field.trim())}>保存用例</Button>
          </div>
        </div>
      )}

      {cases.length === 0 && !loading && (
        <Empty description={'还没有测试用例：新建一条，或让 AI 用 test_case 沉淀'} />
      )}

      {cases.map(testCase => {
        const run = runsByCase[testCase.id];
        const asserts: AssertLine[] = run ? parsedAsserts(run) : [];
        return (
          <div key={testCase.id} style={{ border: '1px solid #e0e0ee', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography.Text strong>{testCase.name}</Typography.Text>
                {statusTag(run?.status)}
                <Tag size="small" color="light-blue">
                  {testCase.nodeId ? `节点 ${testCase.nodeId}` : '工作流级'}
                </Tag>
                {testCase.createdBy === 'agent' && <Tag size="small">AI 沉淀</Tag>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="small" theme="borderless" icon={<IconRefresh />}
                  onClick={() => runOne(testCase)}>运行</Button>
                <Popconfirm title="确认删除该用例？" onConfirm={() => remove(testCase.id)}>
                  <Button size="small" type="danger" theme="borderless" icon={<IconDelete />} />
                </Popconfirm>
              </div>
            </div>
            {run && (
              <div style={{ marginTop: 6, background: '#f8f8fc', borderRadius: 6, padding: 8 }}>
                {run.status === 'error' && <Typography.Text type="danger">{run.error}</Typography.Text>}
                {run.status === 'stale' && <Typography.Text type="tertiary">{run.error}</Typography.Text>}
                {asserts.map((line, i) => (
                  <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                    <span>{line.pass ? '✅' : '❌'}</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      {line.field} {line.op} {line.op !== 'exists' ? JSON.stringify(line.expected) : ''}
                    </span>
                    {!line.pass && <span style={{ color: '#c00' }}>实际: {JSON.stringify(line.actual)}</span>}
                  </div>
                ))}
                {run.error && asserts.length > 0 && (
                  <Typography.Text type="danger" size="small">{run.error}</Typography.Text>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

function safeJson(text: string): any {
  try { return JSON.parse(text); } catch { return {}; }
}

/** 编辑器头部入口：测试用例 SideSheet */
export const TestCaseSheetButton: FC<TestCasePanelProps> = (props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          border: '1px solid #d8d8f0',
          color: '#333',
          padding: '7px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        测试用例
      </button>
      <SideSheet title="测试用例" width={460} visible={open} onCancel={() => setOpen(false)}
        bodyStyle={{ padding: 0 }}>
        {open && <TestCasePanel {...props} />}
      </SideSheet>
    </>
  );
};
