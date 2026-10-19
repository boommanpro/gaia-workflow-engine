/**
 * TrajectoryPanel — 会话的 Trajectory 视图（完整对标 dsh ui-trajectory）。
 *
 * 结构与 dsh 一致：
 *   · 工具栏：时长切换（真实耗时/等宽）· 轮次折叠 · 调用折叠 · 搜索 · 刷新
 *   · 三泳道时间线（输入/模型/工具）：span 可点选，与台账行选中联动
 *   · 台账（dsh 双列表格）：左列类型标签 + 轮次轨道/标签，右列「内容 → 结果」行内预览；
 *     30px 行高、hairline 分隔、选中左侧蓝轨、轮次起始行带「第 N 轮」标签
 *   · 右侧详情面板（dsh details aside）：拖拽调宽（双击复位）、类型徽标 + 定位、
 *     概要(dl 键值 + 预览卡)/请求/响应/参数/结果 标签页；模型行的请求为按账本
 *     增量拼回的全量 JSON（可 curl 复现口径），带数据口径标注条，可切看原始存储
 *     形态——调试时必须能区分「拼回全量 / 原始存储 / 截断摘要」三种口径
 *
 * 数据：会话事件流（agent_session_event）+ LLM 调用账本（agent_llm_call_log）。
 * 读取是派生式的：挂载/run 边界做权威拉取，运行中从 SSE 事件活账本增量派生
 * （不再每 4s 全量重拉 —— 重复读取已废除）。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { agentApi } from '../../agent/api';
import { useSessionEventLedger } from '../../agent/session-event-store';
import { useLanguage } from '../../i18n';

import {
  KIND_META,
  buildRecords,
  firstLine,
  fmtDuration,
  fmtTok,
  mergeLiveEvents,
} from './trajectory-records';
import type { TrajectoryRecord } from './trajectory-records';
/* ---------------- 时间线 ---------------- */

const TrajectoryTimeline: React.FC<{
  records: TrajectoryRecord[];
  mode: 'sequence' | 'duration';
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ records, mode, selectedId, onSelect }) => {
  const spans = useMemo(() => {
    const timed = records.filter((r) => KIND_META[r.kind].lane !== undefined);
    if (timed.length === 0) return { spans: [] as any[], t0: 0, span: 1 };
    const t0 = Math.min(...timed.map((r) => r.at));
    const t1 = Math.max(...timed.map((r) => r.endAt || r.at || r.at));
    const wallSpan = Math.max(1, t1 - t0);
    const byDuration = mode === 'duration';
    const totalUnits = byDuration
      ? timed.reduce((s, r) => s + Math.max(1, r.durationMs ?? (r.endAt ? r.endAt - r.at : 1)), 0)
      : timed.length;
    let offset = 0;
    const out = timed.map((r) => {
      const units = byDuration
        ? Math.max(1, r.durationMs ?? (r.endAt ? r.endAt - r.at : 1))
        : 1;
      const left = (offset / totalUnits) * 100;
      const width = (units / totalUnits) * 100;
      offset += units;
      return {
        id: r.id,
        lane: KIND_META[r.kind].lane,
        left,
        width: Math.max(0.35, width),
        kind: r.kind,
        isError: r.isError,
        isRunning: r.isRunning,
        text: r.text,
      };
    });
    return { spans: out, t0, span: wallSpan };
  }, [records, mode]);

  if (spans.spans.length === 0) return null;
  return (
    <div className="tjp-timeline" title="点击色块定位对应记录">
      <div className="tjp-lanes">
        <span>输入</span>
        <span>模型</span>
        <span>工具</span>
      </div>
      <div className="tjp-track">
        {spans.spans.map((s) => (
          <i
            key={s.id}
            className={`tjp-span k-${s.kind}${s.isError ? ' is-error' : ''}${s.isRunning ? ' is-running' : ''}${s.id === selectedId ? ' is-selected' : ''}`}
            style={{ top: s.lane * 14 + 6, left: `${s.left}%`, width: `${s.width}%` }}
            title={s.text}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
};

/* ---------------- 详情面板 ---------------- */

const pretty = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="tjp-copy"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? '已复制' : '复制'}
    </button>
  );
};

const JsonBody: React.FC<{ value: unknown }> = ({ value }) => {
  const text = pretty(value);
  return (
    <div className="tjp-json">
      <CopyButton text={text} />
      <pre>{text}</pre>
    </div>
  );
};

const TextBody: React.FC<{ value?: string }> = ({ value }) => (
  <div className="tjp-json">
    <CopyButton text={value || ''} />
    <pre className="tjp-plain">{value || '（空）'}</pre>
  </div>
);

const DlRow: React.FC<{ k: string; v: React.ReactNode; danger?: boolean }> = ({ k, v, danger }) => (
  <div className={danger ? 'tjp-dlrow is-danger' : 'tjp-dlrow'}>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </div>
);

/** dsh OverviewSection：标题按钮（点开对应标签页）+ 滚动预览区 */
const OverviewSection: React.FC<{ label: string; onOpen: () => void; children: React.ReactNode }> = ({
  label, onOpen, children,
}) => (
  <section className="tjp-ovsection">
    <h3>
      <button type="button" onClick={onOpen}>
        <span>{label}</span>
        <span className="tjp-ovchev">›</span>
      </button>
    </h3>
    <div className="tjp-ovpreview">{children}</div>
  </section>
);

type DetailTab = { id: string; label: string };

const DetailPanel: React.FC<{
  record: TrajectoryRecord;
  width?: number;
  onClose: () => void;
}> = ({ record, width, onClose }) => {
  const tabs: DetailTab[] = useMemo(() => {
    switch (record.kind) {
      case 'model':
        return [
          { id: 'overview', label: '概要' },
          { id: 'request', label: '请求' },
          { id: 'response', label: '响应' },
          { id: 'usage', label: '用量' },
        ];
      case 'tool':
        return [
          { id: 'overview', label: '概要' },
          { id: 'args', label: '参数' },
          { id: 'result', label: '结果' },
        ];
      case 'user':
      case 'message':
      case 'error':
        return [
          { id: 'overview', label: '概要' },
          { id: 'content', label: '原文' },
          ...(record.thinking ? [{ id: 'thinking', label: '思考' } as DetailTab] : []),
        ];
      case 'system':
        return [
          { id: 'overview', label: '概要' },
          { id: 'request', label: '完整输入' },
        ];
      default:
        return [{ id: 'overview', label: '概要' }];
    }
  }, [record]);
  const [tab, setTab] = useState('overview');
  /** 增量账本行的口径切换：false = 拼回全量（模型真实收到的请求），true = 原始存储形态 */
  const [showRawRequest, setShowRawRequest] = useState(false);
  useEffect(() => {
    setTab('overview');
    setShowRawRequest(false);
  }, [record.id]);
  const u = record.usage;
  const kindMeta = KIND_META[record.kind];

  const overview = (
    <>
      <dl className="tjp-overview">
        <DlRow k="类型" v={kindMeta.label} />
        <DlRow k="轮次" v={`第 ${record.run} 轮`} />
        {record.status != null && (
          <DlRow
            k="状态"
            v={{ ok: '成功', error: '失败', empty: '空响应', SUCCESS: '成功', running: '进行中' }[record.status] || record.status}
            danger={record.isError}
          />
        )}
        {record.model != null && <DlRow k="模型" v={record.model} />}
        {record.durationMs != null && <DlRow k="耗时" v={fmtDuration(record.durationMs)} />}
        {record.messagesCount != null && <DlRow k="消息数" v={record.messagesCount} />}
        {record.toolsCount != null && <DlRow k="工具数" v={record.toolsCount} />}
        {u && (u.promptTokens != null || u.completionTokens != null) && (
          <>
            <DlRow k="输入 tokens" v={u.promptTokens ? u.promptTokens.toLocaleString() : '—'} />
            <DlRow k="输出 tokens" v={u.completionTokens ? u.completionTokens.toLocaleString() : '—'} />
            {u.cachedTokens ? <DlRow k="缓存命中" v={`${u.cachedTokens.toLocaleString()} tok`} /> : null}
          </>
        )}
      </dl>
      <div className="tjp-ovsections">
        {record.request != null && tabs.some((t) => t.id === 'request')
          && !record.requestMeta?.digestOnly
          && (!record.requestMeta?.incremental || record.requestMeta.assembled) && (
          <OverviewSection label="完整请求（可复现）" onOpen={() => setTab('request')}>
            <pre>{pretty(record.request).slice(0, 600)}</pre>
          </OverviewSection>
        )}
        {record.response != null && tabs.some((t) => t.id === 'response') && (
          <OverviewSection
            label={record.requestMeta?.responseDigestOnly ? '模型响应（截断摘要）' : '模型响应（全量）'}
            onOpen={() => setTab('response')}
          >
            <pre>{pretty(record.response).slice(0, 600)}</pre>
          </OverviewSection>
        )}
        {record.args != null && (
          <OverviewSection label="调用参数" onOpen={() => setTab('args')}>
            <pre>{pretty(record.args).slice(0, 600)}</pre>
          </OverviewSection>
        )}
        {record.result != null && (
          <OverviewSection label="执行结果" onOpen={() => setTab('result')}>
            <pre>{pretty(record.result).slice(0, 600)}</pre>
          </OverviewSection>
        )}
        {record.content != null && record.kind !== 'tool' && (
          <OverviewSection label="正文原文" onOpen={() => setTab('content')}>
            <pre className="tjp-plain">{record.content.slice(0, 600)}</pre>
          </OverviewSection>
        )}
      </div>
    </>
  );

  const usagePanel = u ? (
    <dl className="tjp-overview">
      <DlRow k="输入" v={u.promptTokens ? `${u.promptTokens.toLocaleString()} tok` : '—'} />
      <DlRow k="输出" v={u.completionTokens ? `${u.completionTokens.toLocaleString()} tok` : '—'} />
      <DlRow
        k="合计"
        v={u.promptTokens || u.completionTokens
          ? `${((u.promptTokens ?? 0) + (u.completionTokens ?? 0)).toLocaleString()} tok`
          : '—（旧记录未回填用量）'}
      />
      {u.cachedTokens != null && u.cachedTokens > 0 && (
        <DlRow k="缓存命中" v={`${u.cachedTokens.toLocaleString()} tok`} />
      )}
      {u.promptTokens ? (
        <DlRow
          k="缓存命中率"
          v={u.cachedTokens ? `${Math.round((u.cachedTokens / Math.max(1, u.promptTokens)) * 100)}%` : '—'}
        />
      ) : null}
    </dl>
  ) : (
    <p className="tjp-nopayload">本次调用没有记录用量。</p>
  );

  return (
    <aside
      className="tjp-details"
      aria-label="轨迹详情"
      style={width == null ? undefined : { width, flex: 'none' }}
    >
      <div className="tjp-details-header">
        <div className="tjp-details-title">
          <span className={`tjp-kind k-${record.kind}`}>{kindMeta.label}</span>
          <span className="tjp-details-loc">第 {record.run} 轮 · {firstLine(record.text, 48)}</span>
        </div>
        <button type="button" className="tjp-details-close" aria-label="关闭" onClick={onClose}>×</button>
      </div>
      <div className="tjp-detail-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tjp-detail-tab on' : 'tjp-detail-tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tjp-detail-body" role="tabpanel">
        {tab === 'overview' && overview}
        {tab === 'request' && (record.request != null ? (
          <>
            {record.requestMeta?.incremental && (
              <div className={`tjp-prov${record.requestMeta.assembled ? '' : ' is-warn'}`}>
                {record.requestMeta.assembled ? (
                  <>增量账本行 · 已按请求 #{record.requestMeta.baseRequestNo} 拼回全量（共享前缀 {record.requestMeta.sharedPrefix} 条消息，工具 schema 已并入）。模型实际收到的请求如下。
                    <button type="button" className="tjp-prov-toggle" onClick={() => setShowRawRequest((v) => !v)}>
                      {showRawRequest ? '看拼回全量' : '看原始存储'}
                    </button>
                  </>
                ) : (
                  <>增量账本行 · 未找到该轮请求 #1 基准（可能超出账本拉取上限），以下为存储尾部，非完整请求。</>
                )}
              </div>
            )}
            {record.requestMeta?.digestOnly && (
              <div className="tjp-prov is-warn">该行未存全量请求，以下为挖洞截断的摘要口径，仅供定位，不可当完整上下文。</div>
            )}
            <JsonBody value={showRawRequest && record.requestRaw != null ? record.requestRaw : record.request} />
          </>
        ) : <p className="tjp-nopayload">无请求数据</p>)}
        {tab === 'response' && (record.response != null ? (
          <>
            {record.requestMeta?.responseDigestOnly && (
              <div className="tjp-prov is-warn">该行未存全量响应，以下为挖洞截断的摘要口径。</div>
            )}
            <JsonBody value={record.response} />
          </>
        ) : <p className="tjp-nopayload">无响应数据</p>)}
        {tab === 'usage' && usagePanel}
        {tab === 'args' && (record.args != null ? <JsonBody value={record.args} /> : <p className="tjp-nopayload">无参数</p>)}
        {tab === 'result' && (record.result != null ? <JsonBody value={record.result} /> : <p className="tjp-nopayload">无结果</p>)}
        {tab === 'content' && <TextBody value={record.content} />}
        {tab === 'thinking' && <TextBody value={record.thinking} />}
      </div>
    </aside>
  );
};

/* ---------------- 面板 ---------------- */

export const TrajectoryPanel: React.FC<{ sessionKey?: string; streaming?: boolean }> = ({
  sessionKey,
  streaming,
}) => {
  useLanguage();
  /** 权威拉取结果（挂载 / run 边界时刷新），records 在其上派生 */
  const [fetched, setFetched] = useState<{ events: any[]; llmCalls: any[] }>({ events: [], llmCalls: [] });
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** dsh 工具栏状态：时长模式 / 轮次折叠 / 调用折叠 / 搜索 */
  const [durationMode, setDurationMode] = useState(false);
  const [turnsCollapsed, setTurnsCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  /** 详情面板宽度（dsh details 可拖宽；null = 默认） */
  const [detailsWidth, setDetailsWidth] = useState<number | null>(null);
  const tablePaneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  /** Service 对话视图（as-service 引擎的远端会话过程，经后端代理） */
  const [serviceView, setServiceView] = useState(false);
  const [serviceData, setServiceData] = useState<{
    linked: boolean;
    remoteSessionId?: string;
    remoteAgentId?: string;
    snapshot?: {
      items?: Array<{
        created_at?: number;
        data?: {
          item?: {
            type?: string;
            role?: string;
            status?: string;
            content?: Array<{
              type?: string;
              text?: string;
              name?: string;
              input?: unknown;
              output?: Array<{ text?: string }>;
              state?: string;
            }>;
          };
        };
      }>;
      session?: { status?: string };
    };
    snapshotError?: string;
  } | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');

  const load = useCallback(async () => {
    if (!sessionKey || sessionKey.startsWith('draft-')) {
      setFetched({ events: [], llmCalls: [] });
      return;
    }
    setLoading(true);
    try {
      const [events, llmCalls] = await Promise.all([
        agentApi.getSessionEvents(sessionKey, 1000),
        // 拉满 1000（后端上限）：增量 request_json 的拼回依赖该 run 的 seq=1 基准行，
        // 截断会把基准裁掉，导致增量行无法还原完整请求
        agentApi.getRunLlmCalls(sessionKey, undefined, 1000),
      ]);
      setFetched({
        events: Array.isArray(events) ? events : [],
        llmCalls: Array.isArray(llmCalls) ? llmCalls : [],
      });
    } catch {
      setFetched({ events: [], llmCalls: [] });
    } finally {
      setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // 派生读取：运行中不再定时重拉 —— 权威历史行 + SSE 事件活账本合并出 records。
  // 重拉只发生在边界（挂载 / 新 run 开始 / run 收尾定格），每条消息至多 2-3 次。
  const ledger = useSessionEventLedger();
  const liveEvents = ledger.sessionKey === sessionKey ? ledger.events : [];
  const records = useMemo(
    () => buildRecords(mergeLiveEvents(fetched.events, liveEvents), fetched.llmCalls),
    [fetched, liveEvents]
  );

  // run 边界（新 run 开始 / run 收尾）：权威拉取一次，活账本与 DB 行在边界处收口
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (ledger.sessionKey === sessionKey && ledger.runTick > 0) void load();
  }, [ledger.runTick, ledger.sessionKey, sessionKey, load]);
  useEffect(() => {
    if (wasStreamingRef.current && !streaming) void load();
    wasStreamingRef.current = !!streaming;
  }, [streaming, load]);

  // Service 对话视图：开关时拉取，运行中随 4s 轮询跟随
  const loadService = useCallback(async () => {
    if (!sessionKey || sessionKey.startsWith('draft-')) return;
    setServiceLoading(true);
    try {
      const data = await agentApi.getAsServiceSession(sessionKey);
      setServiceData(data);
      setServiceError('');
    } catch (e) {
      setServiceError((e as Error).message || '拉取 Service 会话失败');
    } finally {
      setServiceLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (serviceView) void loadService();
  }, [serviceView, loadService]);

  useEffect(() => {
    if (serviceView && streaming) {
      const timer = setInterval(() => void loadService(), 4000);
      return () => clearInterval(timer);
    }
  }, [serviceView, streaming, loadService]);

  // 选中行滚动进可视区（时间线点击联动）
  useEffect(() => {
    if (!selectedId) return;
    const pane = tablePaneRef.current;
    if (!pane) return;
    const row = pane.querySelector(`tr[data-record-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  // 切换会话时重置 Service 对话视图
  useEffect(() => {
    setServiceView(false);
    setServiceData(null);
    setServiceError('');
  }, [sessionKey]);

  /** 折叠/搜索派生出的展示记录 */
  const view = useMemo(() => {
    const searching = query.trim().length > 0;
    let list = records;
    if (searching) {
      const q = query.trim().toLowerCase();
      list = records.filter((r) => r.search.toLowerCase().includes(q));
      return list;
    }
    if (turnsCollapsed) {
      // 轮次折叠：每个 run 汇总为一行
      const out: TrajectoryRecord[] = [];
      const runs = new Map<number, TrajectoryRecord[]>();
      for (const r of records) {
        const arr = runs.get(r.run) || [];
        arr.push(r);
        runs.set(r.run, arr);
      }
      for (const [run, rs] of runs) {
        const models = rs.filter((r) => r.kind === 'model').length;
        const tools = rs.filter((r) => r.kind === 'tool').length;
        const errs = rs.filter((r) => r.isError).length;
        const dur = Math.max(0, ...rs.map((r) => (r.endAt || r.at) - rs[0].at || 0));
        out.push({
          ...rs[0],
          id: `collapse-run-${run}`,
          kind: 'info',
          text: `第 ${run} 轮 · ${rs.length} 条记录 · 模型 ${models} · 工具 ${tools}${errs ? ` · 失败 ${errs}` : ''}`,
          resultText: undefined,
          endAt: undefined,
          durationMs: dur,
        });
      }
      return out;
    }
    if (toolsCollapsed) {
      // 调用折叠：tool 行收拢为一条占位（保留其它行原位）
      const out: TrajectoryRecord[] = [];
      let toolRun = -1;
      let toolCount = 0;
      let toolErrors = 0;
      let toolMs = 0;
      const flushTools = (before?: TrajectoryRecord) => {
        if (toolCount === 0) return;
        out.push({
          id: `collapse-tools-${toolRun}-${out.length}`,
          kind: 'tool',
          run: toolRun,
          at: before ? before.at : Date.now(),
          text: `… ${toolCount} 个工具调用${toolErrors ? `（失败 ${toolErrors}）` : ''}`,
          durationMs: toolMs || undefined,
          isError: toolErrors > 0,
          search: '',
        } as TrajectoryRecord);
        toolCount = 0;
        toolErrors = 0;
        toolMs = 0;
      };
      for (const r of records) {
        if (r.kind === 'tool') {
          if (toolRun !== r.run) {
            flushTools(r);
            toolRun = r.run;
          }
          toolCount += 1;
          if (r.isError) toolErrors += 1;
          toolMs += r.durationMs || 0;
          continue;
        }
        flushTools(r);
        out.push(r);
      }
      flushTools();
      return out;
    }
    return list;
  }, [records, query, turnsCollapsed, toolsCollapsed]);

  const selected = useMemo(
    () => view.find((r) => r.id === selectedId) || records.find((r) => r.id === selectedId) || null,
    [view, records, selectedId]
  );

  const counts = useMemo(() => {
    let model = 0;
    let tool = 0;
    let failed = 0;
    for (const r of records) {
      if (r.kind === 'model') model += 1;
      if (r.kind === 'tool') tool += 1;
      if (r.isError) failed += 1;
    }
    return { model, tool, failed };
  }, [records]);

  /** 行的轮次起始/结束标记（折叠行与搜索态不标） */
  const rowFlags = useMemo(() => {
    const flags = new Map<string, { turnStart: boolean; runEnd: boolean }>();
    const searching = query.trim().length > 0;
    if (turnsCollapsed || searching) return flags;
    let lastRun = -1;
    for (let i = 0; i < view.length; i++) {
      const r = view[i];
      const next = view[i + 1];
      flags.set(r.id, { turnStart: r.run !== lastRun, runEnd: !next || next.run !== r.run });
      lastRun = r.run;
    }
    return flags;
  }, [view, query, turnsCollapsed]);

  // 详情面板拖宽（dsh resize handle；双击复位）
  const onResizeDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const pane = tablePaneRef.current?.parentElement;
    if (!pane) return;
    dragRef.current = {
      startX: e.clientX,
      startWidth: pane.querySelector<HTMLElement>('.tjp-details')?.getBoundingClientRect().width || 420,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const splitW = tablePaneRef.current?.parentElement?.getBoundingClientRect().width || 1000;
    const next = Math.min(Math.max(280, drag.startWidth + (drag.startX - e.clientX)), splitW - 320);
    setDetailsWidth(next);
  };
  const onResizeUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="tjp">
      <div className="tjp-toolbar" role="toolbar">
        <div className="tjp-actions">
          <button
            type="button"
            className={durationMode ? 'tjp-toggle on' : 'tjp-toggle'}
            aria-pressed={durationMode}
            title={durationMode ? '时间线切回等宽块' : '时间线按真实耗时展示'}
            onClick={() => setDurationMode((v) => !v)}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.25" />
              <path d="M8 4.75V8l2.25 1.5" />
            </svg>
            时长
          </button>
          <button
            type="button"
            className={turnsCollapsed ? 'tjp-toggle on' : 'tjp-toggle'}
            aria-pressed={turnsCollapsed}
            title={turnsCollapsed ? '展开全部轮次' : '折叠全部轮次（双击行也可切换）'}
            onClick={() => setTurnsCollapsed((v) => !v)}
          >
            <span aria-hidden="true">{turnsCollapsed ? '⊞' : '⊟'}</span>
            轮次
          </button>
          <button
            type="button"
            className={toolsCollapsed ? 'tjp-toggle on' : 'tjp-toggle'}
            aria-pressed={toolsCollapsed}
            title={toolsCollapsed ? '展开工具调用' : '折叠工具调用'}
            onClick={() => setToolsCollapsed((v) => !v)}
          >
            <span aria-hidden="true">{toolsCollapsed ? '⊞' : '⊟'}</span>
            调用
          </button>
          <button
            type="button"
            className={serviceView ? 'tjp-toggle on' : 'tjp-toggle'}
            aria-pressed={serviceView}
            title="查看 AgentScope Service 侧的完整对话过程（远端托管视角）"
            onClick={() => setServiceView((v) => !v)}
          >
            <span aria-hidden="true">⇄</span>
            Service 对话
          </button>
          <span className="tjp-counts">
            {records.length} 条 · 模型 {counts.model} / 工具 {counts.tool}
            {counts.failed ? ` / 失败 ${counts.failed}` : ''}
          </span>
        </div>
        <div className="tjp-search">
          <span className="tjp-search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            aria-label="搜索轨迹"
            placeholder="搜索工具 / 内容 / 模型…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </div>
        {streaming ? <span className="tjp-run"><i />跟随中</span> : null}
        <button
          type="button"
          className="tjp-refresh"
          onClick={() => (serviceView ? void loadService() : load)}
          disabled={loading || serviceLoading}
        >
          刷新
        </button>
      </div>

      {serviceView ? (
        <ServiceConversationView
          loading={serviceLoading}
          error={serviceError}
          data={serviceData}
        />
      ) : (
      <>
      {view.length ? (
        <TrajectoryTimeline
          records={view}
          mode={durationMode ? 'duration' : 'sequence'}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : null}

      <div className="tjp-split">
        <div className="tjp-tablepane" ref={tablePaneRef}>
          {loading && !records.length ? (
            <div className="tjp-empty">加载中…</div>
          ) : view.length ? (
            <table className="tjp-table">
              <colgroup>
                <col className="tjp-col-event" />
                <col />
              </colgroup>
              <tbody>
                {view.map((r) => {
                  const flags = rowFlags.get(r.id);
                  const meta = KIND_META[r.kind];
                  const isCollapsedRow = r.id.startsWith('collapse-');
                  return (
                    <tr
                      key={r.id}
                      data-record-id={r.id}
                      data-kind={r.kind}
                      data-selected={r.id === selectedId || undefined}
                      data-error={r.isError || undefined}
                      data-running={r.isRunning || undefined}
                      data-turn-start={flags?.turnStart || undefined}
                      data-run-end={flags?.runEnd || undefined}
                      tabIndex={0}
                      aria-selected={r.id === selectedId}
                      title={isCollapsedRow ? '点击展开' : `${meta.label} · ${firstLine(r.text, 120)}`}
                      onClick={() => setSelectedId(isCollapsedRow ? null : r.id)}
                      onDoubleClick={() => {
                        if (isCollapsedRow) {
                          if (r.id.startsWith('collapse-tools-')) setToolsCollapsed(false);
                          else setTurnsCollapsed(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(isCollapsedRow ? null : r.id);
                        }
                      }}
                    >
                      <td className="tjp-event">
                        {/* 模型行：请求边界点（dsh requestBoundaryControl 同位） */}
                        {r.kind === 'model' && r.requestNo != null && (
                          <button
                            type="button"
                            className={r.id === selectedId ? 'tjp-reqdot on' : 'tjp-reqdot'}
                            aria-label={`请求 #${r.requestNo}`}
                            title={`请求 #${r.requestNo} · 点击查看请求/响应`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(r.id);
                            }}
                          >
                            {r.requestNo}
                          </button>
                        )}
                        {flags?.turnStart && !isCollapsedRow && (
                          <span className="tjp-turnlabel">第 {r.run} 轮</span>
                        )}
                        <div className="tjp-event-inner">
                          <span className={`tjp-kind k-${r.kind}`}>
                            <span className="tjp-kind-icon" aria-hidden="true">{meta.icon}</span>
                            <span className="tjp-kind-label">{meta.label}</span>
                          </span>
                        </div>
                      </td>
                      <td className="tjp-content">
                        <span className={r.resultText == null ? 'tjp-text' : 'tjp-text has-result'}>
                          <span className={r.isError ? 'is-error-text' : undefined}>{r.text || '—'}</span>
                          {r.resultText != null && (
                            <span className={r.isError ? 'tjp-inline-result is-error' : 'tjp-inline-result'}>
                              <span className="tjp-arrow">→</span>
                              {r.resultText || '（无输出）'}
                            </span>
                          )}
                        </span>
                        <span className="tjp-trailing">
                          {r.usage && (r.usage.promptTokens || r.usage.completionTokens) && r.kind === 'message' && (
                            <>
                              <span className="tjp-metric">{fmtTok(r.usage.promptTokens)}</span>
                              <span className="tjp-metric">{fmtTok(r.usage.completionTokens)}</span>
                            </>
                          )}
                          {r.usage && (r.usage.promptTokens || r.usage.completionTokens) && r.kind === 'model' && (
                            <span className="tjp-metric" title="输入 / 输出 tokens">
                              {fmtTok(r.usage.promptTokens)}→{fmtTok(r.usage.completionTokens)}
                            </span>
                          )}
                          <span className="tjp-time">
                            {r.isRunning ? '…' : fmtDuration(r.durationMs ?? (r.endAt ? r.endAt - r.at : null))}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="tjp-empty">{query ? '没有匹配的记录' : '这个会话还没有执行记录。发一条消息，模型和工具的每一步都会记在这里。'}</div>
          )}
        </div>

        {selected && (
          <>
            <div
              className="tjp-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label="拖拽调整详情宽度（双击复位）"
              title="拖拽调整宽度 · 双击复位"
              onPointerDown={onResizeDown}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
              onDoubleClick={() => setDetailsWidth(null)}
            />
            <DetailPanel record={selected} width={detailsWidth ?? undefined} onClose={() => setSelectedId(null)} />
          </>
        )}
      </div>
      </>
      )}

      <style>{`
        .tjp { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--g-bg); }
        .tjp * { box-sizing: border-box; }

        /* ---------------- 工具栏（dsh TrajectoryToolbar） ---------------- */
        .tjp-toolbar {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 6px 14px; border-bottom: 1px solid var(--g-line);
          color: var(--g-text-muted); font-size: 12px;
        }
        .tjp-actions { display: flex; align-items: center; gap: 6px; }
        .tjp-toggle {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border: 1px solid var(--g-line); border-radius: 7px;
          background: var(--g-bg-raised); color: var(--g-text-sub);
          font-size: 12px; font-family: inherit; cursor: pointer;
          transition: color .12s, border-color .12s, background .12s;
        }
        .tjp-toggle svg { width: 12px; height: 12px; stroke: currentColor; stroke-width: 1.4; }
        .tjp-toggle:hover { color: var(--g-text); border-color: var(--g-text-faint); }
        .tjp-toggle.on { color: var(--g-text); border-color: var(--g-text); background: var(--g-bg-sunken); font-weight: 500; }
        .tjp-counts { color: var(--g-text-faint); font-variant-numeric: tabular-nums; padding-left: 4px; }
        .tjp-search {
          display: flex; align-items: center; gap: 5px; flex: 1; max-width: 260px; margin-left: auto;
          padding: 3px 9px; border: 1px solid var(--g-line); border-radius: 7px;
          background: var(--g-bg-raised); color: var(--g-text-sub);
        }
        .tjp-search-icon { font-size: 10px; opacity: .6; }
        .tjp-search input {
          flex: 1; min-width: 0; border: none; background: none; outline: none;
          color: var(--g-text); font-size: 12px; font-family: inherit;
        }
        .tjp-run { display: inline-flex; align-items: center; gap: 5px; color: var(--g-text-sub); }
        .tjp-run i { width: 6px; height: 6px; border-radius: 999px; background: var(--g-success); animation: tjp-pulse 1.2s ease-in-out infinite; }
        @keyframes tjp-pulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        .tjp-refresh {
          padding: 3px 10px; border: 1px solid var(--g-line); border-radius: 7px;
          background: var(--g-bg-raised); color: var(--g-text-sub);
          font-size: 12px; font-family: inherit; cursor: pointer;
        }
        .tjp-refresh:hover { color: var(--g-text); border-color: var(--g-text-faint); }

        /* ---------------- 时间线（三泳道：输入/模型/工具） ---------------- */
        .tjp-timeline { display: flex; gap: 8px; padding: 6px 14px 8px; border-bottom: 1px solid var(--g-line); }
        .tjp-lanes { display: grid; grid-template-rows: repeat(3, 14px); flex: none; width: 34px; }
        .tjp-lanes span { display: flex; align-items: center; color: var(--g-text-faint); font-size: 10px; }
        .tjp-track { position: relative; flex: 1; height: 48px; overflow: hidden; border-radius: 6px; background: var(--g-bg-sunken); }
        .tjp-span { position: absolute; height: 8px; min-width: 2px; border-radius: 1px; cursor: pointer; }
        .tjp-span:hover { filter: brightness(1.2); }
        .tjp-span.k-user, .tjp-span.k-system, .tjp-span.k-context { background: var(--g-link); }
        .tjp-span.k-model, .tjp-span.k-message, .tjp-span.k-info { background: color-mix(in srgb, var(--g-text) 55%, transparent); }
        .tjp-span.k-tool { background: var(--g-warn); }
        .tjp-span.is-error { background: var(--g-danger) !important; }
        .tjp-span.is-running { animation: tjp-pulse 1.1s ease-in-out infinite; }
        .tjp-span.is-selected { outline: 2px solid var(--g-text); outline-offset: 1px; }

        /* ---------------- 台账（dsh 双列表格） ---------------- */
        .tjp-split { flex: 1; min-height: 0; display: flex; }
        .tjp-tablepane { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; }
        .tjp-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .tjp-col-event { width: 124px; }
        .tjp-table td {
          height: 30px; padding: 0 8px; overflow: hidden;
          border-bottom: 0.5px solid var(--g-line-soft, var(--g-line));
          text-overflow: ellipsis; white-space: nowrap;
          font-size: 12.5px; color: var(--g-text-body);
          vertical-align: middle;
        }
        .tjp-table tr { cursor: pointer; transition: background .1s; }
        .tjp-table tr:hover { background: var(--g-bg-hover); }
        .tjp-table tr[data-selected='true'] { background: var(--g-bg-hover); }
        .tjp-table tr[data-selected='true'] td:first-child { box-shadow: inset 2px 0 0 var(--g-text); }
        /* 轮次轨道：轮首行上边框加轮次强调线，轮内行左侧轨道线 */
        .tjp-table tr[data-turn-start='true'] td { border-top: 1px solid color-mix(in srgb, var(--g-link) 30%, var(--g-line)); }
        .tjp-table tr:not([data-turn-start='true']) td:first-child::after {
          content: ''; position: absolute; left: 24px; top: 0; bottom: 0;
          width: 1px; background: color-mix(in srgb, var(--g-link) 18%, transparent);
        }
        .tjp-table tr[data-run-end='true'] td:first-child::after { bottom: 50%; }
        .tjp-table tr[data-turn-start='true'] td:first-child::after { top: 50%; }

        .tjp-event { position: relative; }
        .tjp-turnlabel {
          position: absolute; left: 0; top: 0; bottom: 0; z-index: 2;
          display: flex; align-items: center; justify-content: center;
          min-width: 34px; padding: 0 5px;
          font-size: 9.5px; font-weight: 500; color: var(--g-link);
          background: color-mix(in srgb, var(--g-link) 10%, transparent);
          border-radius: 0 4px 4px 0; pointer-events: none;
        }
        .tjp-event-inner { display: flex; align-items: center; height: 100%; padding-left: 48px; }
        .tjp-kind {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 1px 7px; border-radius: 999px; font-size: 10.5px; white-space: nowrap;
        }
        .tjp-kind-icon { font-size: 9px; line-height: 1; }
        .tjp-kind.k-user { color: var(--g-link); background: color-mix(in srgb, var(--g-link) 12%, transparent); }
        .tjp-kind.k-system { color: var(--g-text-muted); background: var(--g-bg-sunken); }
        .tjp-kind.k-context { color: var(--g-success); background: color-mix(in srgb, var(--g-success) 12%, transparent); }
        .tjp-kind.k-model, .tjp-kind.k-message { color: var(--g-accent, #4d53e8); background: color-mix(in srgb, var(--g-accent, #4d53e8) 12%, transparent); }
        .tjp-kind.k-info { color: var(--g-text-muted); background: var(--g-bg-sunken); }
        .tjp-kind.k-tool { color: var(--g-warn); background: color-mix(in srgb, var(--g-warn) 14%, transparent); }
        .tjp-kind.k-error { color: var(--g-danger); background: var(--g-danger-soft); }

        .tjp-reqdot {
          position: absolute; z-index: 5; right: 5px; top: 50%; transform: translateY(-50%);
          width: 17px; height: 17px; border-radius: 50%;
          border: 1px solid var(--g-line); background: var(--g-bg-raised);
          color: var(--g-text-sub); font-size: 9px; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0; font-family: inherit;
        }
        .tjp-reqdot:hover { border-color: var(--g-text); color: var(--g-text); }
        .tjp-reqdot.on { background: var(--g-text); color: var(--g-bg); border-color: var(--g-text); }

        .tjp-content { position: relative; }
        .tjp-text { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; max-width: calc(100% - 150px); overflow: hidden; }
        .tjp-text > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .is-error-text { color: var(--g-danger); }
        .tjp-inline-result { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--g-text-muted); flex: 1; }
        .tjp-inline-result.is-error { color: var(--g-danger); }
        .tjp-arrow { margin-right: 4px; color: var(--g-text-faint); }
        .tjp-trailing {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--g-text-faint); font-size: 11px;
          font-variant-numeric: tabular-nums; background: var(--g-bg); padding-left: 8px;
        }
        .tjp-metric { font-family: ui-monospace, Menlo, monospace; }
        .tjp-time { font-family: ui-monospace, Menlo, monospace; min-width: 38px; text-align: right; }
        tr[data-error='true'] .tjp-time { color: var(--g-danger); }

        /* ---------------- 详情面板（dsh details aside） ---------------- */
        .tjp-resize { flex: none; width: 5px; cursor: col-resize; background: transparent; position: relative; }
        .tjp-resize::after { content: ''; position: absolute; left: 2px; top: 0; bottom: 0; width: 1px; background: var(--g-line); }
        .tjp-resize:hover::after { background: var(--g-text-faint); width: 2px; }
        .tjp-details {
          display: flex; flex-direction: column; flex: none;
          width: min(420px, 45%); min-width: 280px;
          border-left: 1px solid var(--g-line); background: var(--g-bg); height:  100%; min-height: 0;
        }
        .tjp-details-header {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-bottom: 1px solid var(--g-line);
        }
        .tjp-details-title { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
        .tjp-details-loc {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          color: var(--g-text-sub); font-size: 12px;
        }
        .tjp-details-close {
          flex: none; width: 22px; height: 22px; border: none; border-radius: 6px;
          background: transparent; color: var(--g-text-muted); cursor: pointer;
          font-size: 15px; line-height: 1; font-family: inherit;
        }
        .tjp-details-close:hover { background: var(--g-bg-hover); color: var(--g-text); }
        .tjp-detail-tabs {
          display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--g-line);
        }
        .tjp-detail-tab {
          padding: 5px 10px 6px; border: none; background: none; cursor: pointer;
          font-size: 12px; font-family: inherit; color: var(--g-text-muted);
          border-bottom: 2px solid transparent; margin-bottom: -1px;
        }
        .tjp-detail-tab:hover { color: var(--g-text-sub); }
        .tjp-detail-tab.on { color: var(--g-text); border-bottom-color: var(--g-text); font-weight: 500; }
        .tjp-detail-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 12px; }

        .tjp-overview { margin: 0 0 10px; display: flex; flex-direction: column; gap: 0; }
        .tjp-dlrow {
          display: grid; grid-template-columns: 96px 1fr; gap: 8px; align-items: baseline;
          padding: 4px 0; border-bottom: 0.5px solid var(--g-line-soft, var(--g-line));
          font-size: 12px;
        }
        .tjp-dlrow dt { color: var(--g-text-faint); }
        .tjp-dlrow dd { margin: 0; color: var(--g-text-body); word-break: break-all; }
        .tjp-dlrow.is-danger dd { color: var(--g-danger); }

        .tjp-ovsections { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
        .tjp-ovsection { border: 1px solid var(--g-line); border-radius: 8px; overflow: hidden; }
        .tjp-ovsection h3 { margin: 0; }
        .tjp-ovsection h3 button {
          display: flex; width: 100%; align-items: center; justify-content: space-between;
          padding: 6px 10px; border: none; background: var(--g-bg-sunken);
          color: var(--g-text-sub); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .tjp-ovsection h3 button:hover { color: var(--g-text); }
        .tjp-ovchev { color: var(--g-text-faint); }
        .tjp-ovpreview { max-height: 130px; overflow: auto; padding: 8px 10px; background: var(--g-bg-raised); }
        .tjp-ovpreview pre {
          margin: 0; color: var(--g-text-sub);
          font: 11px/1.6 ui-monospace, Menlo, monospace;
          white-space: pre-wrap; overflow-wrap: anywhere;
        }
        .tjp-plain { white-space: pre-wrap; }

        .tjp-json { position: relative; }
        .tjp-copy {
          position: sticky; top: 0; float: right; z-index: 2;
          padding: 2px 8px; border: 1px solid var(--g-line); border-radius: 6px;
          background: var(--g-bg-raised); color: var(--g-text-muted);
          font-size: 11px; font-family: inherit; cursor: pointer;
        }
        .tjp-copy:hover { color: var(--g-text); }
        .tjp-json pre {
          margin: 0; color: var(--g-text-sub);
          font: 11.5px/1.65 ui-monospace, Menlo, monospace;
          white-space: pre-wrap; overflow-wrap: anywhere;
        }
        .tjp-nopayload { margin: 8px 0; color: var(--g-text-faint); font-size: 12px; }

        /* 数据口径标注条：拼回全量 / 原始存储 / 截断摘要，调试时必须可区分 */
        .tjp-prov {
          margin: 0 0 8px; padding: 6px 9px;
          border: 1px solid var(--g-line); border-left: 3px solid var(--g-success); border-radius: 6px;
          background: var(--g-bg-raised); color: var(--g-text-sub);
          font-size: 11.5px; line-height: 1.7;
        }
        .tjp-prov.is-warn { border-left-color: var(--g-warn); }
        .tjp-prov-toggle {
          border: none; background: none; padding: 0; margin-left: 4px;
          color: var(--g-link); cursor: pointer; font-size: 11.5px; font-family: inherit;
          text-decoration: underline; text-underline-offset: 2px;
        }

        .tjp-empty { padding: 40px 16px; color: var(--g-text-muted); font-size: 13px; text-align: center; }

        /* ---------------- Service 对话视图（as-service 远端会话） ---------------- */
        .tjp-svc { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; }
        .tjp-svc-head {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 8px 10px; margin-bottom: 12px;
          border: 1px solid var(--g-line); border-radius: 8px; background: var(--g-bg-raised);
          font-size: 12px; color: var(--g-text-sub);
        }
        .tjp-svc-head code { font-family: var(--g-mono, monospace); font-size: 11px; color: var(--g-text-muted); }
        .tjp-svc-head .is-badge {
          padding: 1px 8px; border-radius: 999px; border: 1px solid var(--g-line);
          font-size: 11px; color: var(--g-text-sub); background: var(--g-bg-sunken);
        }
        .tjp-svc-msg { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
        .tjp-svc-role { font-size: 11px; font-weight: 600; color: var(--g-text-muted); letter-spacing: .4px; }
        .tjp-svc-role.is-user { color: var(--g-link); }
        .tjp-svc-bubble {
          padding: 8px 11px; border: 1px solid var(--g-line); border-radius: 8px;
          background: var(--g-bg-raised); font-size: 12.5px; line-height: 1.65; color: var(--g-text);
          white-space: pre-wrap; word-break: break-word;
        }
        .tjp-svc-bubble.is-user { background: var(--g-bg-sunken); }
        .tjp-svc-tool {
          padding: 7px 10px; border: 1px dashed var(--g-line); border-radius: 7px;
          background: var(--g-bg); font-size: 12px; color: var(--g-text-sub);
        }
        .tjp-svc-tool b { color: var(--g-text); font-weight: 600; }
        .tjp-svc-tool pre {
          margin: 5px 0 0; padding: 6px 8px; border-radius: 5px; background: var(--g-bg-sunken);
          font-size: 11px; font-family: var(--g-mono, monospace); color: var(--g-text-sub);
          white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow-y: auto;
        }
        .tjp-svc-note { padding: 14px; color: var(--g-text-muted); font-size: 13px; text-align: center; }
        .tjp-svc-think {
          padding: 6px 10px; border: 1px dashed var(--g-line); border-radius: 7px;
          background: var(--g-bg); font-size: 12px; color: var(--g-text-faint);
        }
        .tjp-svc-think summary { cursor: pointer; user-select: none; }
        .tjp-svc-think pre {
          margin: 6px 0 2px; padding: 6px 8px; border-radius: 5px; background: var(--g-bg-sunken);
          font-size: 11px; font-family: var(--g-mono, monospace); white-space: pre-wrap; word-break: break-word;
          max-height: 260px; overflow-y: auto;
        }
        .tjp-svc-error {
          margin-bottom: 12px; padding: 10px 12px; border: 1px solid var(--g-danger);
          border-radius: 8px; color: var(--g-danger); font-size: 12.5px; background: color-mix(in srgb, var(--g-danger) 6%, transparent);
        }
      `}</style>
    </div>
  );
};

/** Service 对话视图 —— 渲染 AgentScope Service 快照的完整消息流（用户/助手/工具块） */
const ServiceConversationView: React.FC<{
  loading: boolean;
  error: string;
  data: {
    linked: boolean;
    remoteSessionId?: string;
    remoteAgentId?: string;
    snapshot?: {
      items?: Array<{
        created_at?: number;
        data?: {
          item?: {
            type?: string;
            role?: string;
            status?: string;
            content?: Array<{
              type?: string;
              text?: string;
              name?: string;
              input?: unknown;
              output?: Array<{ text?: string }>;
              state?: string;
            }>;
          };
        };
      }>;
      session?: { status?: string };
    };
    snapshotError?: string;
  } | null;
}> = ({ loading, error, data }) => {
  if (loading && !data) return <div className="tjp-svc"><div className="tjp-note">加载 Service 会话中…</div></div>;
  if (error) return <div className="tjp-svc"><div className="tjp-svc-error">{error}</div></div>;
  if (!data) return null;
  if (!data.linked) {
    return (
      <div className="tjp-svc">
        <div className="tjp-svc-note">该会话未通过 AgentScope Service（as-service 引擎）托管运行，没有远端对话。</div>
      </div>
    );
  }
  if (data.snapshotError) {
    return (
      <div className="tjp-svc">
        <div className="tjp-svc-error">拉取 Service 快照失败：{data.snapshotError}</div>
      </div>
    );
  }

  const items = [...(data.snapshot?.items || [])].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
  const prettyArgs = (v: unknown) => {
    try {
      return typeof v === 'string' ? JSON.stringify(JSON.parse(v), null, 2) : JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  return (
    <div className="tjp-svc">
      <div className="tjp-svc-head">
        <span className="is-badge">{data.snapshot?.session?.status || 'unknown'}</span>
        <span>远端会话</span>
        <code>{data.remoteSessionId}</code>
        <span>·</span>
        <span>托管 Agent</span>
        <code>{data.remoteAgentId}</code>
        <span style={{ marginLeft: 'auto', color: 'var(--g-text-faint)' }}>
          数据来源：AgentScope Service（Session API 快照）
        </span>
      </div>
      {items.length === 0 ? (
        <div className="tjp-svc-note">Service 侧暂无消息条目（会话可能尚未运行或快照投影中）。</div>
      ) : (
        items.map((it, idx) => {
          const item = it.data?.item;
          if (!item || item.type !== 'message') return null;
          const role = (item.role || '').toUpperCase();
          const isUser = role === 'USER';
          return (
            <div className="tjp-svc-msg" key={idx}>
              <span className={`tjp-svc-role${isUser ? ' is-user' : ''}`}>
                {isUser ? '用户' : '助手'}
                {item.status && item.status !== 'completed' ? ` · ${item.status}` : ''}
              </span>
              {(item.content || []).map((part, pi) => {
                if (part.type === 'tool_use') {
                  return (
                    <div className="tjp-svc-tool" key={pi}>
                      <b>🛠 工具调用 · {part.name || '?'}</b>
                      <pre>{prettyArgs(part.input)}</pre>
                    </div>
                  );
                }
                if (part.type === 'tool_result') {
                  const out = (part.output || []).map((o) => o.text || '').join('\n');
                  return (
                    <div className="tjp-svc-tool" key={pi}>
                      <b>↳ 工具结果 · {part.name || '?'}{part.state ? `（${part.state}）` : ''}</b>
                      {out ? <pre>{out}</pre> : null}
                    </div>
                  );
                }
                if (part.text) {
                  // Service 侧正文带 shim 写入的 <think> 段：拆成折叠的思考过程 + 干净正文
                  const match = part.text.match(/<think>\n?([\s\S]*?)<\/think>\n?/);
                  const thinkText = match?.[1]?.trim();
                  const bodyText = match
                    ? part.text.replace(/<think>\n?[\s\S]*?<\/think>\n?/, '').trim()
                    : part.text;
                  return (
                    <React.Fragment key={pi}>
                      {thinkText ? (
                        <details className="tjp-svc-think">
                          <summary>💭 思考过程</summary>
                          <pre>{thinkText}</pre>
                        </details>
                      ) : null}
                      {bodyText ? (
                        <div className={`tjp-svc-bubble${isUser ? ' is-user' : ''}`}>{bodyText}</div>
                      ) : null}
                    </React.Fragment>
                  );
                }
                return null;
              })}
            </div>
          );
        })
      )}
    </div>
  );
};

export default TrajectoryPanel;
