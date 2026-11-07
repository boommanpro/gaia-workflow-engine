/**
 * 测试用例面板（2026-11-06 重设计，用户确认视觉稿）：
 * - 布局：状态统计条 + 操作行（AI 生成 / 新建 / 全部运行）+ 用例卡
 *   （状态图标 + 标签 + ✓n✗n 摘要，可展开断言明细，期望 vs 实际等宽对齐）；
 * - AI 能力（「AI 起草、用户确认」——与版本说明 AI 起草同一设计边界，AI 不落库）：
 *   · 生成：POST /test-case/ai-generate，支持场景文本输入定向生成（空 = AI 自行分析画布边界）；
 *   · 补断言：POST /test-case/ai-assertions，依据最近一次实际输出建议断言，勾选合并进用例；
 *   · 诊断：POST /test-case/ai-diagnose，失败断言 → 结论 + 修复建议（可一键采纳改期望值）；
 * - 手工新建保留原校验语义：非法 JSON 就地报错、保留现场不清空不关窗。
 * 数据面不变：/test-case/list|run|create|delete|update。文案全量 i18n，颜色统一走主题 token。
 */
import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  IconButton,
  Input,
  Select,
  SideSheet,
  Spin,
  TextArea,
  Tag,
  Empty,
  Popconfirm,
  Toast,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconRefresh,
  IconPlay,
  IconChevronDown,
  IconChevronUp,
  IconTickCircle,
  IconCrossCircleStroked,
  IconMinusCircle,
  IconAlertTriangle,
} from '@douyinfe/semi-icons';

import { getApiBaseUrl } from '../../utils/apiConfig';
import { useLanguage, t } from '../../i18n';
import { IconTestCase } from '../../assets/icon-test-case';
import { IconSparkles } from '../../assets/icon-sparkles';

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

/** AI 生成草稿（后端已收敛：op 白名单、nodeId 校验、条数封顶） */
interface AiDraft {
  name: string;
  nodeId: string | null;
  description?: string;
  inputs: any;
  expected: { field: string; op: string; value?: any }[];
}

/** 单用例的 AI 辅助态：补断言建议 / 失败诊断 */
interface AiAssist {
  suggesting?: boolean;
  suggestions?: { field: string; op: string; value?: any; picked: boolean }[];
  suggestError?: string;
  diagnosing?: boolean;
  diagnosis?: string;
  fix?: { field: string; op: string; value?: any } | null;
  diagnoseError?: string;
}

export interface TestCasePanelProps {
  workflowCode: string;
  /** 当前画布 JSON 的 getter（运行时优先用画布现场；不传跑生效版本） */
  getCanvasJson?: () => any | null;
  /** 画布节点清单（新建用例时选目标节点） */
  getNodes?: () => { id: string; type: string; title?: string }[];
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const OK = 'var(--g-nodecat-data, #0e9384)';
const BAD = '#e5404e';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const parseExpected = (json?: string): ExpectedRow[] => {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const opKey = (r: { field: string; op: string; value?: any }) =>
  `${r.field}\u0000${r.op}\u0000${r.op === 'exists' ? '' : String(r.value ?? '')}`;

const assertText = (r: { field: string; op: string; expected?: any }) =>
  r.op === 'exists'
    ? `${r.field} ${t('testCase.opExists')}`
    : `${r.field} ${opLabel(r.op)} ${JSON.stringify(r.expected)}`;

const opLabel = (op: string) =>
  op === 'equals'
    ? t('testCase.opEquals')
    : op === 'contains'
    ? t('testCase.opContains')
    : t('testCase.opExists');

export const TestCasePanel: FC<TestCasePanelProps> = ({
  workflowCode,
  getCanvasJson,
  getNodes,
}) => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [runsByCase, setRunsByCase] = useState<Record<number, TestRun>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  // 运行中的用例（运行按钮转 loading，避免「没反应」感）
  const [runningIds, setRunningIds] = useState<Record<number, boolean>>({});

  // 手工新建（保留阶段 1.4 语义：非法 JSON 就地报错、保留现场）
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [inputsText, setInputsText] = useState('{}');
  const [inputsError, setInputsError] = useState<string | null>(null);
  const [expectedRows, setExpectedRows] = useState<ExpectedRow[]>([
    { field: '', op: 'exists', value: '' },
  ]);

  // AI 生成（含场景文本输入——2026-11-06 用户要求：随机生成效果不好，需定向描述）
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<AiDraft[]>([]);
  const [aiPicked, setAiPicked] = useState<Record<number, boolean>>({});

  // 单用例 AI 辅助（补断言 / 诊断）
  const [assist, setAssist] = useState<Record<number, AiAssist | undefined>>({});

  const reload = useCallback(async () => {
    if (!workflowCode) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/test-case/list?workflowCode=${encodeURIComponent(workflowCode)}`
      );
      setCases(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, [workflowCode]);

  useEffect(() => {
    reload();
  }, [reload]);

  const canvasSchema = useCallback(() => {
    try {
      const canvas = getCanvasJson?.();
      return canvas ? JSON.stringify(canvas) : undefined;
    } catch {
      return undefined;
    }
  }, [getCanvasJson]);

  const runOne = useCallback(
    async (testCase: TestCase) => {
      setRunningIds((prev) => ({ ...prev, [testCase.id]: true }));
      try {
        const body: any = { caseId: testCase.id, schema: canvasSchema() };
        const res = await fetch(`${getApiBaseUrl()}/test-case/run`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        // 运行失败必须可见（2026-11-07：后端 500 时旧实现静默无反应）
        if (!res.ok || data.error) {
          Toast.error(data.error || t('testCase.runFailed', { status: res.status }));
          return;
        }
        if (data.run) {
          setRunsByCase((prev) => ({ ...prev, [testCase.id]: data.run }));
          // 运行后自动展开明细，断言结果一眼可见
          setExpanded((prev) => ({ ...prev, [testCase.id]: true }));
        }
      } finally {
        setRunningIds((prev) => ({ ...prev, [testCase.id]: false }));
      }
    },
    [canvasSchema]
  );

  const [runAllLoading, setRunAllLoading] = useState(false);
  const runAll = useCallback(async () => {
    setRunAllLoading(true);
    try {
      const body: any = { workflowCode, schema: canvasSchema() };
      const res = await fetch(`${getApiBaseUrl()}/test-case/run`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        Toast.error(data.error || t('testCase.runFailed', { status: res.status }));
        return;
      }
      if (Array.isArray(data.runs)) {
        const map: Record<number, TestRun> = {};
        const open: Record<number, boolean> = {};
        for (const run of data.runs) {
          map[run.caseId] = run;
          open[run.caseId] = true;
        }
        setRunsByCase(map);
        setExpanded(open);
      }
    } finally {
      setRunAllLoading(false);
    }
  }, [workflowCode, canvasSchema]);

  const create = useCallback(async () => {
    const expected = expectedRows
      .filter((row) => row.field.trim())
      .map((row) => ({
        field: row.field.trim(),
        op: row.op,
        ...(row.op === 'exists' ? {} : { value: row.value }),
      }));
    if (!name.trim() || expected.length === 0) return;
    let inputs: any;
    try {
      inputs = inputsText.trim() ? JSON.parse(inputsText) : {};
    } catch (e) {
      setInputsError(t('testCase.invalidJson', { msg: (e as Error).message }));
      return;
    }
    setInputsError(null);
    const res = await fetch(`${getApiBaseUrl()}/test-case/create`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        workflowCode,
        nodeId: nodeId || null,
        name: name.trim(),
        inputs,
        expected,
      }),
    });
    if (!res.ok) {
      setInputsError(t('testCase.createFailed', { status: res.status }));
      return;
    }
    setName('');
    setNodeId('');
    setInputsText('{}');
    setExpectedRows([{ field: '', op: 'exists', value: '' }]);
    setCreating(false);
    await reload();
  }, [workflowCode, nodeId, name, inputsText, expectedRows, reload]);

  const remove = useCallback(
    async (id: number) => {
      await fetch(`${getApiBaseUrl()}/test-case/delete/${id}`, { method: 'DELETE' });
      await reload();
    },
    [reload]
  );

  /** AI 生成草稿（不入库，勾选确认后才 create；createdBy=user——用户确认即用户用例） */
  const aiGenerate = useCallback(async () => {
    setAiGenerating(true);
    try {
      const body: any = {
        workflowCode,
        prompt: aiPrompt.trim() || undefined,
        schema: canvasSchema(),
      };
      const res = await fetch(`${getApiBaseUrl()}/test-case/ai-generate`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        Toast.error(String(data.error));
        return;
      }
      const drafts: AiDraft[] = Array.isArray(data.cases) ? data.cases : [];
      if (drafts.length === 0) {
        Toast.warning(t('testCase.aiEmpty'));
        return;
      }
      setAiDrafts(drafts);
      setAiPicked(Object.fromEntries(drafts.map((_, i) => [i, true])));
    } catch {
      Toast.error(t('testCase.aiFailed'));
    } finally {
      setAiGenerating(false);
    }
  }, [workflowCode, aiPrompt, canvasSchema]);

  const aiPickedCount = useMemo(
    () => aiDrafts.filter((_, i) => aiPicked[i]).length,
    [aiDrafts, aiPicked]
  );

  const saveAiDrafts = useCallback(async () => {
    const picked = aiDrafts.filter((_, i) => aiPicked[i]);
    if (picked.length === 0) return;
    let ok = 0;
    for (const d of picked) {
      const res = await fetch(`${getApiBaseUrl()}/test-case/create`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          workflowCode,
          nodeId: d.nodeId || null,
          name: d.name,
          description: d.description,
          inputs: d.inputs ?? {},
          expected: d.expected ?? [],
        }),
      });
      if (res.ok) ok += 1;
    }
    Toast.success(t('testCase.aiSaved', { n: ok }));
    setAiDrafts([]);
    setAiOpen(false);
    await reload();
  }, [aiDrafts, aiPicked, workflowCode, reload]);

  /** AI 补断言：依据最近一次实际输出给建议，勾选合并进 expected */
  const aiSuggest = useCallback(
    async (testCase: TestCase) => {
      setAssist((prev) => ({ ...prev, [testCase.id]: { suggesting: true } }));
      try {
        const res = await fetch(`${getApiBaseUrl()}/test-case/ai-assertions`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ caseId: testCase.id, schema: canvasSchema() }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          setAssist((prev) => ({ ...prev, [testCase.id]: { suggestError: String(data.error) } }));
          return;
        }
        const rows: { field: string; op: string; value?: any }[] = Array.isArray(data.assertions)
          ? data.assertions
          : [];
        if (rows.length === 0) {
          setAssist((prev) => ({
            ...prev,
            [testCase.id]: { suggestError: t('testCase.aiEmpty') },
          }));
          return;
        }
        setAssist((prev) => ({
          ...prev,
          [testCase.id]: { suggestions: rows.map((r) => ({ ...r, picked: true })) },
        }));
      } catch {
        setAssist((prev) => ({ ...prev, [testCase.id]: { suggestError: t('testCase.aiFailed') } }));
      }
    },
    [canvasSchema]
  );

  const adoptSuggestions = useCallback(
    async (testCase: TestCase) => {
      const a = assist[testCase.id];
      if (!a?.suggestions) return;
      const picked = a.suggestions
        .filter((s) => s.picked)
        .map(({ picked: _picked, ...rest }) => rest);
      if (picked.length === 0) return;
      const merged: { field: string; op: string; value?: any }[] = [
        ...parseExpected(testCase.expectedJson).map((r) => ({
          field: r.field,
          op: r.op,
          ...(r.op === 'exists' ? {} : { value: r.value }),
        })),
      ];
      const seen = new Set(merged.map(opKey));
      for (const row of picked) {
        if (!seen.has(opKey(row))) {
          merged.push(row);
          seen.add(opKey(row));
        }
      }
      await fetch(`${getApiBaseUrl()}/test-case/update`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: testCase.id, expected: merged }),
      });
      setAssist((prev) => ({ ...prev, [testCase.id]: undefined }));
      await reload();
    },
    [assist, reload]
  );

  /** AI 诊断：失败断言 → 结论 + 可采纳的期望值修复 */
  const aiDiagnose = useCallback(async (testCase: TestCase) => {
    setAssist((prev) => ({
      ...prev,
      [testCase.id]: { ...(prev?.[testCase.id] ?? {}), diagnosing: true, diagnoseError: undefined },
    }));
    try {
      const res = await fetch(`${getApiBaseUrl()}/test-case/ai-diagnose`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ caseId: testCase.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setAssist((prev) => ({
          ...prev,
          [testCase.id]: {
            ...(prev?.[testCase.id] ?? {}),
            diagnosing: false,
            diagnoseError: String(data.error),
          },
        }));
        return;
      }
      setAssist((prev) => ({
        ...prev,
        [testCase.id]: {
          ...(prev?.[testCase.id] ?? {}),
          diagnosing: false,
          diagnosis: String(data.diagnosis || ''),
          fix: data.fix ?? null,
        },
      }));
    } catch {
      setAssist((prev) => ({
        ...prev,
        [testCase.id]: {
          ...(prev?.[testCase.id] ?? {}),
          diagnosing: false,
          diagnoseError: t('testCase.aiFailed'),
        },
      }));
    }
  }, []);

  const adoptFix = useCallback(
    async (testCase: TestCase, fix: { field: string; op: string; value?: any }) => {
      const rows = parseExpected(testCase.expectedJson).map((r) => ({
        field: r.field,
        op: r.op,
        ...(r.op === 'exists' ? {} : { value: r.value }),
      }));
      const next = rows.map((r) =>
        r.field === fix.field && r.op === fix.op ? { ...r, value: fix.value } : r
      );
      await fetch(`${getApiBaseUrl()}/test-case/update`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: testCase.id, expected: next }),
      });
      setAssist((prev) => ({ ...prev, [testCase.id]: undefined }));
      Toast.success(t('testCase.aiFixApplied'));
      await reload();
    },
    [reload]
  );

  const parsedAsserts = useCallback((run: TestRun): AssertLine[] => {
    try {
      return JSON.parse(run.assertResultsJson || '[]');
    } catch {
      return [];
    }
  }, []);

  const nodeOptions = useMemo(
    () =>
      (getNodes?.() || []).map((n) => ({ value: n.id, label: `${n.title || n.type} (${n.id})` })),
    [getNodes]
  );
  const nodeTitle = useCallback(
    (id: string | null) => {
      if (!id) return t('testCase.tagWorkflow');
      return getNodes?.().find((n) => n.id === id)?.title || id;
    },
    [getNodes]
  );

  const stats = useMemo(() => {
    let passed = 0,
      failed = 0;
    for (const c of cases) {
      const s = runsByCase[c.id]?.status;
      if (s === 'passed') passed += 1;
      else if (s === 'failed' || s === 'error') failed += 1;
    }
    return { passed, failed, notRun: cases.length - passed - failed };
  }, [cases, runsByCase]);

  return (
    <div
      style={{
        padding: '12px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/*
        状态统计与操作分两行（2026-11-07 方案 A，用户确认）：
        - 统计行：三个标签常驻（失败 0 时灰态降透明，不增删节点）——旧实现「失败」标签条件渲染，
          运行结果变化时行宽突变把按钮挤到下一行；
        - 操作行：nowrap + 「全部运行」minWidth 预留 loading 转圈宽度，任何状态下不换行。
      */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
        <Tag size="small" color="green">
          {t('testCase.statPassed', { n: stats.passed })}
        </Tag>
        <Tag size="small" color="red" style={stats.failed === 0 ? { opacity: 0.5 } : undefined}>
          {t('testCase.statFailed', { n: stats.failed })}
        </Tag>
        <Tag size="small" color="grey">
          {t('testCase.statNotRun', { n: stats.notRun })}
        </Tag>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--ge-text-2, #7b8090)', whiteSpace: 'nowrap' }}>
          {t('testCase.count', { n: cases.length })}
        </span>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', marginTop: -4 }}
      >
        <Button size="small" theme="solid" icon={IconSparkles} onClick={() => setAiOpen((v) => !v)}>
          {t('testCase.aiGenerate')}
        </Button>
        <Button size="small" icon={<IconPlus />} onClick={() => setCreating((v) => !v)}>
          {creating ? t('testCase.collapse') : t('testCase.aiNew')}
        </Button>
        <Button
          size="small"
          icon={<IconPlay />}
          loading={runAllLoading}
          onClick={runAll}
          disabled={cases.length === 0}
          style={{ minWidth: 96 }}
        >
          {t('testCase.runAll')}
        </Button>
      </div>

      {/* AI 生成（含场景文本输入） */}
      {aiOpen && (
        <div
          style={{
            border: `1px dashed color-mix(in srgb, var(--g-editor-accent, #4d53e8) 45%, var(--ge-border, #e5e6ee))`,
            background: 'color-mix(in srgb, var(--g-editor-accent, #4d53e8) 6%, transparent)',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: 'var(--g-editor-accent, #4d53e8)', display: 'inline-flex' }}>
              {IconSparkles}
            </span>
            <TypographyText strong>
              {aiDrafts.length > 0
                ? t('testCase.aiDraftTitle', { n: aiDrafts.length })
                : t('testCase.aiTitle')}
            </TypographyText>
            <span style={{ flex: 1 }} />
            <Button
              size="small"
              theme="borderless"
              onClick={() => {
                setAiOpen(false);
                setAiDrafts([]);
              }}
            >
              {t('testCase.aiCollapse')}
            </Button>
          </div>
          <TextArea
            autosize={{ minRows: 2, maxRows: 5 }}
            value={aiPrompt}
            onChange={(v: string) => setAiPrompt(v)}
            placeholder={t('testCase.aiPromptPlaceholder')}
          />
          <TypographyText type="tertiary" size="small" style={{ lineHeight: 1.5 }}>
            {t('testCase.aiHint')}
          </TypographyText>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" theme="solid" loading={aiGenerating} onClick={aiGenerate}>
              {aiDrafts.length > 0 ? t('testCase.aiRegenerate') : t('testCase.aiGenerateBtn')}
            </Button>
          </div>
          {aiDrafts.length > 0 && (
            <>
              {aiDrafts.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    background: 'var(--ge-surface, #fff)',
                    border: '1px solid var(--ge-border, #e5e6ee)',
                    borderRadius: 8,
                  }}
                >
                  <Checkbox
                    checked={!!aiPicked[i]}
                    onChange={(e) => setAiPicked((prev) => ({ ...prev, [i]: !!e.target.checked }))}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                  <Tag size="small" color={d.nodeId ? 'light-blue' : 'cyan'}>
                    {nodeTitle(d.nodeId)}
                  </Tag>
                  <span
                    style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ge-text-2, #7b8090)' }}
                  >
                    {t('testCase.aiAssertions', { n: d.expected?.length ?? 0 })}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  theme="solid"
                  disabled={aiPickedCount === 0}
                  onClick={saveAiDrafts}
                >
                  {t('testCase.aiSave', { n: aiPickedCount })}
                </Button>
                <Button
                  size="small"
                  onClick={() => setAiPicked(Object.fromEntries(aiDrafts.map((_, j) => [j, true])))}
                >
                  {t('testCase.aiSelectAll')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 手工新建 */}
      {creating && (
        <div
          style={{
            border: '1px solid var(--ge-border, #e5e6ee)',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--ge-surface, #fff)',
          }}
        >
          <Input
            size="small"
            placeholder={t('testCase.namePlaceholder')}
            value={name}
            onChange={setName}
          />
          <Select
            size="small"
            placeholder={t('testCase.targetPlaceholder')}
            showClear
            style={{ width: '100%' }}
            value={nodeId || undefined}
            onChange={(v) => setNodeId(String(v || ''))}
            optionList={nodeOptions}
          />
          <TextArea
            autosize={{ minRows: 3, maxRows: 8 }}
            value={inputsText}
            onChange={(v: string) => {
              setInputsText(v);
              if (inputsError) setInputsError(null);
            }}
            placeholder={t('testCase.inputsPlaceholder')}
          />
          {inputsError && (
            <TypographyText type="danger" size="small" role="alert" style={{ lineHeight: 1.4 }}>
              {inputsError}
            </TypographyText>
          )}
          {expectedRows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Input
                size="small"
                style={{ width: 130 }}
                placeholder={t('testCase.fieldPlaceholder')}
                value={row.field}
                onChange={(v) =>
                  setExpectedRows((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, field: v } : r))
                  )
                }
              />
              <Select
                size="small"
                style={{ width: 100 }}
                value={row.op}
                onChange={(v: any) =>
                  setExpectedRows((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, op: String(v) as ExpectedRow['op'] } : r
                    )
                  )
                }
                optionList={[
                  { value: 'exists', label: t('testCase.opExists') },
                  { value: 'equals', label: t('testCase.opEquals') },
                  { value: 'contains', label: t('testCase.opContains') },
                ]}
              />
              {row.op !== 'exists' && (
                <Input
                  size="small"
                  style={{ flex: 1 }}
                  placeholder={t('testCase.expectedPlaceholder')}
                  value={row.value}
                  onChange={(v) =>
                    setExpectedRows((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, value: v } : r))
                    )
                  }
                />
              )}
              {expectedRows.length > 1 && (
                <Button
                  size="small"
                  type="danger"
                  theme="borderless"
                  onClick={() => setExpectedRows((rows) => rows.filter((_, i) => i !== idx))}
                >
                  {t('testCase.removeRow')}
                </Button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="small"
              onClick={() =>
                setExpectedRows((rows) => [...rows, { field: '', op: 'exists', value: '' }])
              }
            >
              {t('testCase.addAssert')}
            </Button>
            <Button
              size="small"
              theme="solid"
              onClick={create}
              disabled={!name.trim() || !expectedRows.some((r) => r.field.trim())}
            >
              {t('testCase.saveCase')}
            </Button>
          </div>
        </div>
      )}

      {/* 用例列表 */}
      {cases.length === 0 && !loading && <Empty description={t('testCase.emptyDesc')} />}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
          <Spin />
        </div>
      )}

      {cases.map((testCase) => {
        const run = runsByCase[testCase.id];
        const asserts: AssertLine[] = run ? parsedAsserts(run) : [];
        const passN = asserts.filter((a) => a.pass).length;
        const failN = asserts.length - passN;
        const isOpen = !!expanded[testCase.id];
        const a = assist[testCase.id];
        return (
          <div
            key={testCase.id}
            style={{
              border: `1px solid ${
                run?.status === 'failed' || run?.status === 'error'
                  ? 'color-mix(in srgb, #e5404e 35%, var(--ge-border, #e5e6ee))'
                  : 'var(--ge-border, #e5e6ee)'
              }`,
              borderRadius: 10,
              padding: '9px 11px',
              background: 'var(--ge-surface, #fff)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {statusIcon(run?.status)}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{testCase.name}</span>
              <Tag size="small" color={testCase.nodeId ? 'light-blue' : 'cyan'}>
                {nodeTitle(testCase.nodeId)}
              </Tag>
              {testCase.createdBy === 'agent' && <Tag size="small">{t('testCase.tagAiSaved')}</Tag>}
              <span style={{ flex: 1 }} />
              {run && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'flex',
                    gap: 5,
                  }}
                >
                  {passN > 0 && <span style={{ color: OK }}>✓{passN}</span>}
                  {failN > 0 && <span style={{ color: BAD }}>✗{failN}</span>}
                  {run.durationMs != null && (
                    <span style={{ color: 'var(--ge-text-2, #7b8090)' }}>{run.durationMs}ms</span>
                  )}
                </span>
              )}
              <Tooltip content={t('testCase.runOne')}>
                <IconButton
                  size="small"
                  theme="borderless"
                  icon={runningIds[testCase.id] ? <Spin size="small" /> : <IconRefresh />}
                  disabled={!!runningIds[testCase.id]}
                  onClick={() => runOne(testCase)}
                />
              </Tooltip>
              <Tooltip content={t('testCase.aiAddAsserts')}>
                <IconButton
                  size="small"
                  theme="borderless"
                  style={{ color: 'var(--g-editor-accent, #4d53e8)' }}
                  icon={a?.suggesting ? <Spin size="small" /> : IconSparkles}
                  onClick={() => aiSuggest(testCase)}
                />
              </Tooltip>
              <Popconfirm title={t('testCase.deleteConfirm')} onConfirm={() => remove(testCase.id)}>
                <IconButton size="small" theme="borderless" type="danger" icon={<IconDelete />} />
              </Popconfirm>
              {run && (
                <IconButton
                  size="small"
                  theme="borderless"
                  icon={isOpen ? <IconChevronUp /> : <IconChevronDown />}
                  aria-label={isOpen ? t('testCase.collapse') : t('testCase.expand')}
                  onClick={() => setExpanded((prev) => ({ ...prev, [testCase.id]: !isOpen }))}
                />
              )}
            </div>

            {/* AI 补断言建议 */}
            {a?.suggestError && (
              <TypographyText
                type="tertiary"
                size="small"
                style={{ display: 'block', marginTop: 6 }}
              >
                {a.suggestError}
              </TypographyText>
            )}
            {a?.suggestions && (
              <div
                style={{
                  marginTop: 8,
                  background: 'color-mix(in srgb, var(--g-editor-accent, #4d53e8) 6%, transparent)',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{ color: 'var(--g-editor-accent, #4d53e8)', display: 'inline-flex' }}
                  >
                    {IconSparkles}
                  </span>
                  {t('testCase.aiSuggestTitle', { n: a.suggestions.length })}
                </div>
                {a.suggestions.map((s, i) => (
                  <label
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
                  >
                    <Checkbox
                      checked={s.picked}
                      onChange={(e) =>
                        setAssist((prev) => ({
                          ...prev,
                          [testCase.id]: {
                            ...prev?.[testCase.id],
                            suggestions: a.suggestions!.map((r, j) =>
                              j === i ? { ...r, picked: !!e.target.checked } : r
                            ),
                          },
                        }))
                      }
                    />
                    <span style={{ fontFamily: MONO }}>{assertText(s)}</span>
                  </label>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    theme="solid"
                    disabled={!a.suggestions.some((s) => s.picked)}
                    onClick={() => adoptSuggestions(testCase)}
                  >
                    {t('testCase.aiAdoptSelected')}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setAssist((prev) => ({ ...prev, [testCase.id]: undefined }))}
                  >
                    {t('testCase.aiIgnore')}
                  </Button>
                </div>
              </div>
            )}

            {/* 运行明细 */}
            {run && isOpen && (
              <div
                style={{
                  marginTop: 8,
                  background: 'var(--ge-surface-2, #f2f3f7)',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                }}
              >
                {(run.status === 'error' || run.status === 'stale') && (
                  <TypographyText
                    type={run.status === 'error' ? 'danger' : 'tertiary'}
                    size="small"
                    style={{ lineHeight: 1.5 }}
                  >
                    {run.error}
                  </TypographyText>
                )}
                {asserts.map((line, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 12, display: 'flex', gap: 7, alignItems: 'flex-start' }}
                  >
                    <span
                      style={{
                        color: line.pass ? OK : BAD,
                        lineHeight: '17px',
                        display: 'inline-flex',
                        flex: 'none',
                      }}
                    >
                      {line.pass ? (
                        <IconTickCircle size="small" />
                      ) : (
                        <IconCrossCircleStroked size="small" />
                      )}
                    </span>
                    <span style={{ fontFamily: MONO, lineHeight: '17px', wordBreak: 'break-all' }}>
                      {assertText(line)}
                      {!line.pass && line.actual !== undefined && (
                        <span style={{ color: BAD }}>
                          {' '}
                          · {t('testCase.actual')}: {JSON.stringify(line.actual)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}

                {/* AI 诊断（失败时） */}
                {(run.status === 'failed' || run.status === 'error') && (
                  <div
                    style={{
                      background:
                        'color-mix(in srgb, var(--g-editor-accent, #4d53e8) 6%, transparent)',
                      borderRadius: 8,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{ color: 'var(--g-editor-accent, #4d53e8)', display: 'inline-flex' }}
                      >
                        {IconSparkles}
                      </span>
                      {t('testCase.aiDiagnosisTitle')}
                      <span style={{ flex: 1 }} />
                      {!a?.diagnosis && (
                        <Button
                          size="small"
                          theme="borderless"
                          loading={a?.diagnosing}
                          onClick={() => aiDiagnose(testCase)}
                        >
                          {t('testCase.aiDiagnose')}
                        </Button>
                      )}
                    </div>
                    {a?.diagnoseError && (
                      <TypographyText type="danger" size="small">
                        {a.diagnoseError}
                      </TypographyText>
                    )}
                    {a?.diagnosis && (
                      <>
                        <TypographyText size="small" style={{ lineHeight: 1.6 }}>
                          {a.diagnosis}
                        </TypographyText>
                        {a.fix && (
                          <div>
                            <Button
                              size="small"
                              theme="solid"
                              onClick={() => adoptFix(testCase, a.fix!)}
                            >
                              {t('testCase.aiFix', { v: JSON.stringify(a.fix.value) })}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TypographyText = Typography.Text;

/** 运行状态图标（替代旧 emoji/纯 Tag 方案，颜色与画布状态点同口径） */
const statusIcon = (status?: string) => {
  if (status === 'passed') return <IconTickCircle style={{ color: OK, flex: 'none' }} />;
  if (status === 'failed' || status === 'error')
    return <IconCrossCircleStroked style={{ color: BAD, flex: 'none' }} />;
  if (status === 'stale')
    return <IconAlertTriangle style={{ color: 'var(--ge-text-2, #7b8090)', flex: 'none' }} />;
  return <IconMinusCircle style={{ color: 'var(--ge-text-2, #7b8090)', flex: 'none' }} />;
};

/** 测试用例 SideSheet 入口。variant：header=头部文字按钮（历史形态）；
 *  toolbar=画布工具栏图标按钮（2026-11-04 用户决策：测试用例不占头部，收进工具栏）。
 *  2026-11-06：宽度 460→520（重设计稿），图标 IconList→自绘勾选清单（用户选定 A）。 */
export const TestCaseSheetButton: FC<TestCasePanelProps & { variant?: 'header' | 'toolbar' }> = ({
  variant = 'header',
  ...props
}) => {
  useLanguage();
  const [open, setOpen] = useState(false);
  const label = t('editor.testCases');
  return (
    <>
      {variant === 'toolbar' ? (
        <Tooltip content={label}>
          <IconButton
            type="tertiary"
            theme="borderless"
            icon={IconTestCase}
            aria-label={label}
            onClick={() => setOpen(true)}
          />
        </Tooltip>
      ) : (
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
          {label}
        </button>
      )}
      <SideSheet
        title={label}
        width={520}
        visible={open}
        onCancel={() => setOpen(false)}
        bodyStyle={{ padding: 0 }}
      >
        {open && <TestCasePanel {...props} />}
      </SideSheet>
    </>
  );
};
