/**
 * 执行追踪视图（对标 OpenWorkBuddy Trace View）—— 调试面板的第二个视图。
 *
 * 数据全部来自观测 API（agent_session_event + agent_llm_call_log 派生）：
 *   · run 列表：终态/失败链/时间账（GET /agent/metrics/sessions/{key}/runs）
 *   · 事件回放：某 run 的全部事件按序（GET .../events + 前端按 runId 过滤）
 *   · LLM 账本：某 run 的每次模型调用（GET .../llm-calls）
 *
 * 设计纪律（OWB 同款）：「只看出过错的」一键过滤；无 run_end 的 run 显示
 * running/stalled 而不是假装结束；payload 可展开看全文，失败归因永远置顶。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { agentApi } from './api';

const RunBadge: React.FC<{ outcome?: string }> = ({ outcome }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    done: { label: '完成', color: '#15803d', bg: 'rgba(22, 163, 74, 0.1)' },
    error: { label: '失败', color: '#b91c1c', bg: 'rgba(239, 68, 68, 0.1)' },
    stopped: { label: '已停止', color: '#64748b', bg: 'rgba(148, 163, 184, 0.15)' },
    running: { label: '进行中', color: '#1d4ed8', bg: 'rgba(37, 99, 235, 0.1)' },
  };
  const s = map[outcome || 'running'] || map.running;
  return (
    <span style={{ padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
};

const fmtMs = (ms?: number | null): string => (ms == null ? '-' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const fmtTime = (t?: string): string => {
  if (!t) return '-';
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T'));
  return isNaN(d.getTime()) ? t : d.toLocaleTimeString();
};

/** 单个 run 的详情：事件时间线 + LLM 调用账本 */
const RunDetail: React.FC<{ sessionKey: string; runId: string }> = ({ sessionKey, runId }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [llmCalls, setLlmCalls] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      agentApi.getSessionEvents(sessionKey, 1000).catch(() => []),
      agentApi.getRunLlmCalls(sessionKey, runId).catch(() => []),
    ]).then(([evts, calls]) => {
      if (!alive) return;
      // 事件 API 返回最新在前；时间线必须按发生顺序（id 升序）回放
      setEvents((evts || []).filter((e: any) => e.runId === runId).sort((a: any, b: any) => a.id - b.id));
      setLlmCalls(calls || []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [sessionKey, runId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return <div style={{ padding: '10px', fontSize: 12, color: 'var(--g-text-muted)' }}>加载中…</div>;
  }
  return (
    <div>
      {llmCalls.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g-text-sub)', marginBottom: 4 }}>
            LLM 调用（{llmCalls.length} 次）
          </div>
          {[...llmCalls].reverse().map((c: any) => (
            <div
              key={c.id}
              onClick={() => toggle(`llm-${c.id}`)}
              style={{
                padding: '5px 8px',
                marginBottom: 4,
                borderRadius: 5,
                border: '1px solid #e8e8ea',
                cursor: 'pointer',
                fontSize: 11.5,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--g-text-muted)' }}>#{c.seq ?? '-'}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{c.model || '-'}</span>
                <span
                  style={{
                    color: c.status === 'ok' ? '#15803d' : c.status === 'empty' ? '#b45309' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {c.status === 'ok' ? 'ok' : c.status === 'empty' ? '空响应' : '错误'}
                </span>
                <span style={{ color: 'var(--g-text-muted)' }}>{fmtMs(c.durationMs)}</span>
                <span style={{ color: 'var(--g-text-muted)' }}>
                  {c.promptTokens ?? '-'}→{c.completionTokens ?? '-'} tok
                  {c.cachedTokens > 0 && ` (缓存 ${c.cachedTokens})`}
                </span>
                <span style={{ color: 'var(--g-text-muted)', marginLeft: 'auto' }}>{c.messagesCount ?? '-'} 条消息 · {c.toolsCount ?? '-'} 工具</span>
              </div>
              {c.errorMessage && (
                <div style={{ color: '#b91c1c', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>{c.errorMessage}</div>
              )}
              {expanded.has(`llm-${c.id}`) && (
                <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--g-text-sub)' }}>
                  <div style={{ fontWeight: 600 }}>请求摘要：</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f7f7fa', padding: 6, borderRadius: 4, marginBottom: 4 }}>
                    {c.promptDigest || '(无)'}
                  </div>
                  <div style={{ fontWeight: 600 }}>输出摘要：</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', background: '#f7f7fa', padding: 6, borderRadius: 4 }}>
                    {c.outputDigest || '(无)'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g-text-sub)', marginBottom: 4 }}>
        事件时间线（{events.length} 条，按发生顺序）
      </div>
      {events.map((e: any) => {
        const key = `ev-${e.id}`;
        const isErr = e.eventType === 'error';
        const isGuard = ['wrap_up', 'repeat_reminder', 'llm_retry', 'interrupted', 'compaction', 'run_end'].includes(e.eventType);
        return (
          <div
            key={e.id}
            onClick={() => toggle(key)}
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'baseline',
              padding: '3px 6px',
              marginBottom: 2,
              borderRadius: 4,
              fontSize: 11.5,
              cursor: 'pointer',
              background: isErr ? 'rgba(239, 68, 68, 0.05)' : isGuard ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
            }}
          >
            <span style={{ color: 'var(--g-text-faint, #aaa)', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
              {fmtTime(e.createdAt)}
            </span>
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                flexShrink: 0,
                color: isErr ? '#b91c1c' : isGuard ? '#b45309' : 'var(--g-text-sub)',
                fontWeight: isErr || isGuard ? 600 : 400,
              }}
            >
              {e.eventType}
            </span>
            <span style={{ color: 'var(--g-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
              {(e.payload || '').substring(0, 120)}
            </span>
          </div>
        );
      })}
      {events.some((e: any) => expanded.has(`ev-${e.id}`)) && (
        <div>
          {events
            .filter((e: any) => expanded.has(`ev-${e.id}`))
            .map((e: any) => (
              <div key={`full-${e.id}`} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                  {e.eventType} #{e.seq} 完整 payload
                </div>
                <pre
                  style={{
                    margin: '2px 0 8px',
                    padding: 8,
                    background: '#f7f7fa',
                    borderRadius: 5,
                    fontSize: 10.5,
                    maxHeight: 260,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(e.payload || '{}'), null, 2);
                    } catch {
                      return e.payload || '(空)';
                    }
                  })()}
                </pre>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

/** 执行追踪主视图：run 列表 + 只看失败过滤 + 展开详情 */
export const TraceView: React.FC<{ sessionKey: string | null }> = ({ sessionKey }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [openRun, setOpenRun] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sessionKey) return;
    setLoading(true);
    agentApi
      .getSessionRuns(sessionKey)
      .then((r) => setRuns(r || []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [sessionKey]);

  useEffect(() => {
    load();
  }, [load]);

  // 时间账卡「执行追踪 →」入口：由 window 事件驱动打开并定位失败 run
  useEffect(() => {
    const handler = () => {
      setOnlyFailed(false);
      load();
    };
    window.addEventListener('gaia-open-trace', handler);
    return () => window.removeEventListener('gaia-open-trace', handler);
  }, [load]);

  if (!sessionKey) {
    return <div style={{ padding: 16, fontSize: 12, color: 'var(--g-text-muted)' }}>无活动会话</div>;
  }

  const isFailed = (r: any) => r.outcome === 'error' || r.hasError || (Array.isArray(r.failureChain) && r.failureChain.length > 0);
  const shown = onlyFailed ? runs.filter(isFailed) : runs;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setOnlyFailed((v) => !v)}
          style={{
            padding: '2px 10px',
            fontSize: 11,
            borderRadius: 4,
            cursor: 'pointer',
            border: `1px solid ${onlyFailed ? '#b91c1c' : '#e0e0e6'}`,
            color: onlyFailed ? '#b91c1c' : 'var(--g-text-sub)',
            background: onlyFailed ? 'rgba(239, 68, 68, 0.06)' : 'var(--g-bg-raised)',
          }}
        >
          {onlyFailed ? '● 只看出过错的' : '只看出过错的'}
        </button>
        <button
          onClick={load}
          style={{
            padding: '2px 10px',
            fontSize: 11,
            border: '1px solid #e0e0e6',
            borderRadius: 4,
            background: 'var(--g-bg-raised)',
            cursor: 'pointer',
            color: 'var(--g-text-sub)',
          }}
        >
          刷新
        </button>
        <span style={{ fontSize: 11, color: 'var(--g-text-faint, #aaa)', marginLeft: 'auto' }}>
          {loading ? '加载中…' : `${shown.length} 次 run`}
        </span>
      </div>
      {shown.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: 'var(--g-text-muted)', fontSize: 12, marginTop: 32 }}>
          {onlyFailed ? '没有出过错的 run 🎉' : '尚无运行记录（本功能从本次部署开始记录）'}
        </div>
      )}
      {shown.map((r: any) => {
        const open = openRun === r.runId;
        const stalled = r.outcome === 'running';
        return (
          <div
            key={r.runId}
            style={{
              border: `1px solid ${isFailed(r) ? 'rgba(239, 68, 68, 0.35)' : '#e8e8ea'}`,
              borderRadius: 6,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => setOpenRun(open ? null : r.runId)}
              style={{ padding: '8px 10px', background: '#f7f7fa', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
                <RunBadge outcome={r.outcome} />
                {stalled && (
                  <span style={{ fontSize: 11, color: '#b45309' }} title="没有 run_end 终态事件：进程死亡或仍在运行">
                    疑似未收尾
                  </span>
                )}
                <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--g-text-muted)', fontSize: 11 }}>{r.runId}</span>
                <span style={{ color: 'var(--g-text-muted)', fontSize: 11 }}>{fmtTime(r.startedAt)}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--g-text-muted)', fontSize: 11 }}>
                  {r.durationMs != null ? fmtMs(r.durationMs) : ''} · {r.eventCount ?? 0} 事件
                  {r.engine ? ` · ${r.engine}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
                {Array.isArray(r.failureChain) && r.failureChain.length > 0 ? (
                  r.failureChain.map((c: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '0 6px',
                        borderRadius: 4,
                        color: '#b45309',
                        background: 'rgba(245, 158, 11, 0.12)',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--g-text-faint, #aaa)' }}>
                    {r.outcome === 'done' ? '无异常' : ''}
                  </span>
                )}
                {(r.promptTokens || r.completionTokens) && (
                  <span style={{ color: 'var(--g-text-muted)' }}>
                    tokens {r.promptTokens ?? '-'}→{r.completionTokens ?? '-'}
                  </span>
                )}
                {r.llmRetries > 0 && <span style={{ color: '#b45309' }}>重试 {r.llmRetries} 次</span>}
                {r.toolTimeMs != null && <span style={{ color: 'var(--g-text-muted)' }}>工具 {fmtMs(r.toolTimeMs)}</span>}
              </div>
            </div>
            {open && (
              <div style={{ padding: 8, borderTop: '1px solid #eee' }}>
                <RunDetail sessionKey={sessionKey} runId={r.runId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
