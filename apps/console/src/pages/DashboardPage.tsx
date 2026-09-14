/**
 * 调用数据看板（可交互版）。
 *
 *  /dashboard               全部已发布 API 的聚合指标
 *  /dashboard/:workflowCode 单个 API 的指标
 *
 * 交互设计（都是真过滤，不是装饰）：
 *  - 时间范围 7/30/90 天：作为 days 参数打到后端，指标与趋势一起变
 *  - API 过滤：写到 URL 上（可分享、可前进后退），切换即换统计口径
 *  - 图例开关：趋势图上可单独隐藏「失败数」这条线
 *  - 点趋势图某一天：下方明细表锁定那一天，再点一次取消
 *  - 点环形某一段 / 点失败分布某一条：明细按状态或错误原因过滤
 *  - 自动刷新：打开后每 15s 拉一次
 *  - 明细表可展开单条调用，看到错误信息与耗时
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowApi, ApiStats, GaiaApiMeta, RecentCall } from '../services/workflow-api';
import { useLanguage, t } from '../i18n';
import ContentTopNav from '../components/ContentTopNav';
import ScrollPage from '../components/ScrollPage';
import { StatCard, ChartCard, Segmented, MiniLineChart, DonutChart, BarChart, COLORS } from './dashboard/charts';

const ACCENT = '#4d53e8';

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
const shortTime = (s?: string) => (s ? s.replace('T', ' ').slice(5, 16) : '—');

export const DashboardPage: React.FC = () => {
  useLanguage();
  const navigate = useNavigate();
  const { workflowCode } = useParams<{ workflowCode?: string }>();
  const scope = workflowCode || '';

  const [days, setDays] = useState(30);
  const [statusFilter, setStatusFilter] = useState<'' | 'SUCCESS' | 'FAILED'>('');
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [stats, setStats] = useState<ApiStats | null>(null);
  const [apis, setApis] = useState<GaiaApiMeta[]>([]);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, c] = await Promise.all([
        scope ? workflowApi.getApiStats(scope, days).catch(() => null) : workflowApi.getApiStatsOverview(days).catch(() => null),
        workflowApi.listApis().catch(() => []),
        workflowApi.getRecentCalls({ workflowCode: scope || undefined, days, limit: 100 }).catch(() => []),
      ]);
      setStats(s);
      setApis(a || []);
      setCalls(c || []);
      setRefreshedAt(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, [scope, days]);

  useEffect(() => {
    void load();
  }, [load]);

  // 切换统计口径时，清掉下钻条件，避免出现「空表但看着像没数据」
  useEffect(() => {
    setDayFilter(null);
    setReasonFilter(null);
    setStatusFilter('');
  }, [scope, days]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  /** 明细表：叠加 状态 / 日期 / 错误原因 三重过滤 */
  const visibleCalls = useMemo(() => {
    return calls.filter((c) => {
      if (statusFilter && (c.status || '').toUpperCase() !== statusFilter) return false;
      if (dayFilter && !(c.createdAt || '').startsWith(dayFilter)) return false;
      if (reasonFilter && (c.errorMessage || 'UNKNOWN') !== reasonFilter) return false;
      return true;
    });
  }, [calls, statusFilter, dayFilter, reasonFilter]);

  const reasonCounts = useMemo(() => {
    const m = new Map<string, number>();
    calls.forEach((c) => {
      if ((c.status || '').toUpperCase() === 'SUCCESS') return;
      const k = c.errorMessage || 'UNKNOWN';
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [calls]);

  const activeMeta = apis.find((a) => a.workflowCode === scope);
  const title = scope ? activeMeta?.apiName || scope : t('dashboard.title');
  const trend = stats?.trend || [];
  const labels = trend.map((d) => d.date);

  const hasDrill = Boolean(statusFilter || dayFilter || reasonFilter);

  return (
    <ScrollPage>
      <ContentTopNav active="/dashboard" />
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
        {scope && (
          <button onClick={() => navigate('/dashboard')} className="mb-3 text-sm text-[#888] hover:text-[#4d53e8]">
            ← {t('dashboard.overview')}
          </button>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="mt-2 max-w-[560px] text-[15px] text-[#666]">{t('dashboard.subtitle')}</p>
          </div>
          <div className="text-[12px] text-[#aaa]">
            {t('dashboard.updatedAt')} {refreshedAt || '—'}
            {stats?.from && stats?.to ? ` · ${stats.from} ~ ${stats.to}` : ''}
          </div>
        </div>

        {/* 过滤条 */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#eee] bg-white p-3">
          <span className="text-[12px] text-[#888]">{t('dashboard.range')}</span>
          <Segmented
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            options={[
              { label: t('dashboard.range7'), value: '7' },
              { label: t('dashboard.range30'), value: '30' },
              { label: t('dashboard.range90'), value: '90' },
            ]}
          />

          <span className="ml-1 text-[12px] text-[#888]">{t('dashboard.apiFilter')}</span>
          <select
            value={scope}
            onChange={(e) => navigate(e.target.value ? `/dashboard/${e.target.value}` : '/dashboard')}
            className="rounded-lg border border-[#e3e3ea] bg-white px-2.5 py-1.5 text-[13px] text-[#333] outline-none"
            style={{ maxWidth: 260 }}
          >
            <option value="">{t('dashboard.allApis')}</option>
            {apis.map((a) => (
              <option key={a.workflowCode} value={a.workflowCode}>
                {a.apiName || a.workflowCode}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#666]">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              {t('dashboard.autoRefresh')}
            </label>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-[#e3e3ea] px-3 py-1.5 text-[12px] font-medium text-[#444] hover:border-[#c9c9ff] hover:text-[#4d53e8] disabled:opacity-50"
            >
              {loading ? '…' : t('dashboard.refresh')}
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="py-20 text-center text-sm text-[#999]">{t('dashboard.listEmpty')}…</div>
        ) : !stats || stats.totalCalls === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#e3e3ea] py-20 text-center">
            <p className="text-[15px] text-[#666]">{apis.length === 0 ? t('dashboard.noApis') : t('dashboard.listEmpty')}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              {t('landing.workspace')}
            </button>
          </div>
        ) : (
          <>
            {/* 指标卡：点「失败」直接下钻失败明细 */}
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label={t('dashboard.totalCalls')}
                value={fmt(stats.totalCalls)}
                active={!hasDrill}
                onClick={() => {
                  setStatusFilter('');
                  setDayFilter(null);
                  setReasonFilter(null);
                }}
              />
              <StatCard label={t('dashboard.avgLatency')} value={stats.avgDurationMs} unit={t('dashboard.ms')} />
              <StatCard
                label={t('dashboard.successRate')}
                value={(stats.successRate * 100).toFixed(1)}
                unit="%"
                accent={stats.successRate >= 0.9 ? COLORS.GREEN : COLORS.RED}
                active={statusFilter === 'FAILED'}
                onClick={() => setStatusFilter(statusFilter === 'FAILED' ? '' : 'FAILED')}
              />
              <StatCard
                label={t('dashboard.failedCalls')}
                value={stats.failedCalls}
                accent={stats.failedCalls > 0 ? COLORS.RED : undefined}
                active={statusFilter === 'FAILED'}
                onClick={() => setStatusFilter(statusFilter === 'FAILED' ? '' : 'FAILED')}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                title={t('dashboard.trend')}
                right={
                  <div className="flex gap-3">
                    {[
                      { key: 'calls', label: t('dashboard.calls'), color: ACCENT },
                      { key: 'failed', label: t('dashboard.failed'), color: COLORS.RED },
                    ].map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setHiddenSeries((h) => ({ ...h, [s.key]: !h[s.key] }))}
                        className="flex items-center gap-1.5 text-[12px]"
                        style={{ opacity: hiddenSeries[s.key] ? 0.35 : 1 }}
                        title={t('dashboard.legendHint')}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} />
                        <span className="text-[#666]">{s.label}</span>
                      </button>
                    ))}
                  </div>
                }
              >
                <MiniLineChart
                  labels={labels}
                  onPointClick={(i) => setDayFilter(dayFilter === labels[i] ? null : labels[i])}
                  series={[
                    !hiddenSeries.calls && {
                      name: t('dashboard.calls'),
                      values: trend.map((d) => d.calls),
                      color: ACCENT,
                      fill: true,
                    },
                    !hiddenSeries.failed && {
                      name: t('dashboard.failed'),
                      values: trend.map((d) => d.failed),
                      color: COLORS.RED,
                      fill: false,
                    },
                  ].filter(Boolean) as { name: string; values: number[]; color: string; fill: boolean }[]}
                />
                <div className="mt-2 text-[11px] text-[#aaa]">{t('dashboard.clickDayHint')}</div>
              </ChartCard>

              <ChartCard title={t('dashboard.latencyTrend')} hint={t('dashboard.ms')}>
                <MiniLineChart
                  labels={labels}
                  series={[{ name: t('dashboard.avgLatency'), values: trend.map((d) => d.avgDurationMs), color: '#7b7ff0', fill: true }]}
                />
              </ChartCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title={t('dashboard.successRate')}>
                <DonutChart
                  centerValue={`${(stats.successRate * 100).toFixed(1)}%`}
                  centerLabel={t('dashboard.successRate')}
                  selected={statusFilter === 'SUCCESS' ? t('dashboard.success') : statusFilter === 'FAILED' ? t('dashboard.failed') : undefined}
                  onSelect={(label) => {
                    const tgt = label === t('dashboard.success') ? 'SUCCESS' : 'FAILED';
                    setStatusFilter(statusFilter === tgt ? '' : tgt);
                  }}
                  data={[
                    { label: t('dashboard.success'), value: stats.successCalls, color: COLORS.GREEN },
                    { label: t('dashboard.failed'), value: stats.failedCalls, color: COLORS.RED },
                  ]}
                />
              </ChartCard>

              <ChartCard title={t('dashboard.failureDist')} hint={t('dashboard.clickBarHint')}>
                {stats.failureDistribution.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#999]">—</div>
                ) : (
                  <BarChart
                    data={stats.failureDistribution.map((f) => ({ label: f.reason, value: f.count, color: COLORS.RED }))}
                    selected={reasonFilter ? stats.failureDistribution.findIndex((f) => f.reason === reasonFilter) : null}
                    onSelect={(i) => {
                      const r = stats.failureDistribution[i]?.reason || null;
                      setReasonFilter(reasonFilter === r ? null : r);
                      setStatusFilter(r ? 'FAILED' : '');
                    }}
                  />
                )}
              </ChartCard>
            </div>

            {/* 最近调用明细 */}
            <div className="mt-6 rounded-2xl border border-[#eee] bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f0f2] px-5 py-3.5">
                <div className="text-[14px] font-semibold text-[#1a1a1a]">{t('dashboard.recentCalls')}</div>
                <Segmented
                  value={statusFilter || ''}
                  onChange={(v) => setStatusFilter(v as '' | 'SUCCESS' | 'FAILED')}
                  options={[
                    { label: t('dashboard.filterAll'), value: '' },
                    { label: t('dashboard.success'), value: 'SUCCESS' },
                    { label: t('dashboard.failed'), value: 'FAILED' },
                  ]}
                />
                <div className="ml-auto flex items-center gap-2">
                  {hasDrill && (
                    <>
                      <span className="text-[12px] text-[#888]">
                        {dayFilter ? `${t('dashboard.day')} ${dayFilter}` : ''}
                        {reasonFilter ? ` · ${reasonFilter}` : ''}
                      </span>
                      <button
                        onClick={() => {
                          setStatusFilter('');
                          setDayFilter(null);
                          setReasonFilter(null);
                        }}
                        className="rounded-lg border border-[#e3e3ea] px-2.5 py-1 text-[12px] text-[#666] hover:border-[#c9c9ff] hover:text-[#4d53e8]"
                      >
                        {t('dashboard.clearFilter')}
                      </button>
                    </>
                  )}
                  <span className="text-[12px] text-[#aaa]">
                    {visibleCalls.length} / {calls.length}
                  </span>
                </div>
              </div>

              {visibleCalls.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#999]">{t('dashboard.recentEmpty')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-[#999]">
                        <th className="px-5 py-2 font-medium">{t('dashboard.colTime')}</th>
                        {!scope && <th className="px-3 py-2 font-medium">{t('dashboard.colApi')}</th>}
                        <th className="px-3 py-2 font-medium">{t('dashboard.colStatus')}</th>
                        <th className="px-3 py-2 font-medium">{t('dashboard.colDuration')}</th>
                        <th className="px-5 py-2 font-medium">{t('dashboard.colKey')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCalls.map((c) => {
                        const failed = (c.status || '').toUpperCase() !== 'SUCCESS';
                        const id = String(c.id ?? c.executionId);
                        const open = expanded === id;
                        return (
                          <React.Fragment key={id}>
                            <tr
                              onClick={() => setExpanded(open ? null : id)}
                              className="cursor-pointer border-t border-[#f6f6f8] hover:bg-[#fafafc]"
                            >
                              <td className="px-5 py-2 text-[#555]">{shortTime(c.createdAt)}</td>
                              {!scope && <td className="px-3 py-2 text-[#777]">{c.workflowCode}</td>}
                              <td className="px-3 py-2">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                  style={
                                    failed ? { background: '#fdeaea', color: COLORS.RED } : { background: '#eafaf0', color: COLORS.GREEN }
                                  }
                                >
                                  {failed ? t('dashboard.failed') : t('dashboard.success')}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-[#555]">{c.durationMs != null ? `${c.durationMs} ms` : '—'}</td>
                              <td className="px-5 py-2 text-[#999]">{c.apiKeyPrefix || '—'}</td>
                            </tr>
                            {open && (
                              <tr className="bg-[#fafafc]">
                                <td colSpan={scope ? 4 : 5} className="px-5 py-3">
                                  <div className="grid gap-1 text-[12px] text-[#666]">
                                    <div>
                                      <span className="text-[#999]">executionId: </span>
                                      <code>{c.executionId || '—'}</code>
                                    </div>
                                    <div>
                                      <span className="text-[#999]">{t('dashboard.version')}: </span>
                                      {c.versionNumber || '—'}
                                    </div>
                                    {failed && (
                                      <div className="text-[#c0392b]">
                                        <span className="text-[#999]">{t('dashboard.errorMessage')}: </span>
                                        {c.errorMessage || '—'}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 失败原因概览（点一下等于按原因过滤明细） */}
              {reasonCounts.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0f2] px-5 py-3">
                  <span className="text-[12px] text-[#999]">{t('dashboard.failureDist')}</span>
                  {[...reasonCounts.entries()].map(([r, n]) => (
                    <button
                      key={r}
                      onClick={() => {
                        setReasonFilter(reasonFilter === r ? null : r);
                        setStatusFilter(reasonFilter === r ? '' : 'FAILED');
                      }}
                      className="rounded-full border px-2.5 py-1 text-[11px]"
                      style={
                        reasonFilter === r
                          ? { borderColor: ACCENT, color: ACCENT, background: '#f3f3ff' }
                          : { borderColor: '#e3e3ea', color: '#666' }
                      }
                    >
                      {r.length > 24 ? r.slice(0, 23) + '…' : r} · {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ScrollPage>
  );
};

export default DashboardPage;
