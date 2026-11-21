/**
 * AutomationsManagement — 定时任务中心（应用态一级页面 /automations）。
 *
 * 列表：每个定时任务一行（cron 人话描述 / 目标工作流 / 下次执行 / 最近结果 / 开关 / 操作），
 * 30s 静默轮询刷新下次执行时间与运行状态。
 * 新建/编辑弹窗：简单模式⇄Cron 模式（预览走后端 /schedule/preview，权威计算在后端），
 * 运行参数表单从所选工作流 start 节点 outputs 派生（复用 subflow-options，不复制字段定义）。
 * 运行历史抽屉：该任务历次运行 + 节点级明细（与编辑器运行历史同源，trigger_channel=schedule）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Modal, SideSheet, Switch, Toast } from '@douyinfe/semi-ui';

import {
  workflowApi,
  type CronPreview,
  type SubflowOption,
  type WorkflowRunDetailResponse,
  type WorkflowRunRecord,
  type WorkflowScheduleRecord,
} from '../../services/workflow-api';
import { useLanguage, t } from '../../i18n';
import { appConfirm } from '../../components/safe-modal';
import type { AdminOutletContext } from './AdminLayout';
import {
  cronFromSimple,
  cronToHuman,
  formatPreviewTime,
  simpleFromCron,
  type CronFreq,
  type SimpleCron,
} from '../../utils/schedule-cron';

/* ---------------- 类型与常量 ---------------- */

interface ScheduleFormState {
  name: string;
  workflowCode: string;
  tab: 'simple' | 'cron';
  simple: SimpleCron;
  cron: string;
  misfire: 'skip' | 'run_once';
  tz: string;
  /** 参数表单（key → 字符串值；number 由后端 JSON 兜底转换） */
  inputs: Record<string, string>;
}

const DEFAULT_SIMPLE: SimpleCron = {
  freq: 'everyDay',
  time: '09:00',
  weekday: 1,
  monthDay: 1,
  hourMin: 0,
};

const FREQS: { value: CronFreq; labelKey: string }[] = [
  { value: 'everyMinute', labelKey: 'automations.freq.everyMinute' },
  { value: 'everyHour', labelKey: 'automations.freq.everyHour' },
  { value: 'everyDay', labelKey: 'automations.freq.everyDay' },
  { value: 'everyWeek', labelKey: 'automations.freq.everyWeek' },
  { value: 'everyMonth', labelKey: 'automations.freq.everyMonth' },
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIMEZONES = ['Asia/Shanghai', 'UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];

/** 最近结果状态 → 展示（色点 + 文案 key） */
const STATUS_META: Record<string, { key: string; color: string; soft: string }> = {
  success: { key: 'automations.status.success', color: 'var(--g-success)', soft: 'var(--g-success-soft)' },
  failed: { key: 'automations.status.failed', color: 'var(--g-danger)', soft: 'var(--g-danger-soft)' },
  invalid: { key: 'automations.status.invalid', color: 'var(--g-danger)', soft: 'var(--g-danger-soft)' },
  running: { key: 'automations.status.running', color: 'var(--g-accent)', soft: 'var(--g-accent-soft)' },
  missed: { key: 'automations.status.missed', color: 'var(--g-warn)', soft: 'var(--g-warn-soft)' },
  canceled: { key: 'automations.status.canceled', color: 'var(--g-text-muted)', soft: 'var(--g-bg-sunken)' },
  none: { key: 'automations.status.none', color: 'var(--g-text-faint)', soft: 'var(--g-bg-sunken)' },
};

/* ---------------- 展示工具 ---------------- */

const pad2 = (n: number) => String(n).padStart(2, '0');

const parseIso = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtClock = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const fmtNextRun = (iso?: string | null): string | null => {
  const d = parseIso(iso);
  if (!d) return null;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const wd = WEEKDAYS[d.getDay()];
  return sameDay ? `今天 ${fmtClock(d)}` : `${wd} ${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${fmtClock(d)}`;
};

const relTime = (iso?: string | null): string => {
  const d = parseIso(iso);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
};

const fmtDuration = (ms?: number | null): string => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}分${Math.round((ms % 60_000) / 1000)}秒`;
};

const fmtFullTime = (iso?: string | null): string => {
  const d = parseIso(iso);
  if (!d) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${fmtClock(d)}`;
};

/* ---------------- 样式片段（CHAT token 内联，与 WorkflowManagement 同风格） ---------------- */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 11px',
  borderRadius: 8,
  border: '1px solid var(--g-line)',
  background: 'var(--g-bg)',
  color: 'var(--g-text)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 7,
  color: 'var(--g-text)',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--g-text-muted)',
  marginTop: 5,
  lineHeight: 1.6,
};

const chipBtnStyle = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-line)'}`,
  background: active ? 'var(--g-accent-soft)' : 'var(--g-bg)',
  color: active ? 'var(--g-text)' : 'var(--g-text-sub)',
  fontWeight: active ? 600 : 400,
  borderRadius: 8,
  padding: '5px 13px',
  fontSize: 12.5,
  cursor: 'pointer',
});

const actionIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: 'none',
  background: 'transparent',
  color: 'var(--g-text-sub)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/* ---------------- 主组件 ---------------- */

export const AutomationsManagement = () => {
  useLanguage();
  const { setHeaderAction } = useOutletContext<AdminOutletContext>();

  const [schedules, setSchedules] = useState<WorkflowScheduleRecord[]>([]);
  const [options, setOptions] = useState<SubflowOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowScheduleRecord | null>(null);
  const [form, setForm] = useState<ScheduleFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<CronPreview | null>(null);
  const previewTimer = useRef<number | null>(null);

  const [historySchedule, setHistorySchedule] = useState<WorkflowScheduleRecord | null>(null);
  const [historyRuns, setHistoryRuns] = useState<WorkflowRunRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, WorkflowRunDetailResponse>>({});

  const optionByCode = useMemo(() => {
    const map = new Map<string, SubflowOption>();
    options.forEach((o) => map.set(o.code, o));
    return map;
  }, [options]);

  const loadSchedules = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await workflowApi.listSchedules();
      setSchedules(list ?? []);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
      // 静默轮询不打扰；首载失败由空态文案呈现（runHistory.loadFailed）
      if (!silent) console.warn('[automations] 列表加载失败:', (e as Error).message ?? e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const list = await workflowApi.listSubflowOptions();
      setOptions(list ?? []);
    } catch {
      // 工作流选项加载失败不阻塞列表；打开弹窗时会再提示
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
    void loadOptions();
  }, [loadSchedules, loadOptions]);

  // 顶栏「新建」按钮（布局约定：子页注入 header action；仅挂载时设置一次）
  useEffect(() => {
    setHeaderAction({ label: t('automations.create'), onClick: () => openCreate() });
    return () => setHeaderAction(null);
  }, []);

  // 30s 静默轮询：刷新下次执行时间与运行状态
  useEffect(() => {
    const timer = window.setInterval(() => void loadSchedules(true), 30_000);
    return () => window.clearInterval(timer);
  }, [loadSchedules]);

  /* ---------------- 弹窗 ---------------- */

  const openCreate = () => {
    const firstAvailable = options.find((o) => o.currentVersionId != null);
    setEditing(null);
    setForm({
      name: '',
      workflowCode: firstAvailable?.code ?? '',
      tab: 'simple',
      simple: { ...DEFAULT_SIMPLE },
      cron: '0 0 9 * * *',
      misfire: 'skip',
      tz: 'Asia/Shanghai',
      inputs: {},
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (s: WorkflowScheduleRecord) => {
    const simple = simpleFromCron(s.cronExpression);
    const inputs: Record<string, string> = {};
    Object.entries(s.inputs ?? {}).forEach(([k, v]) => {
      inputs[k] = v == null ? '' : String(v);
    });
    setEditing(s);
    setForm({
      name: s.scheduleName,
      workflowCode: s.workflowCode,
      tab: simple ? 'simple' : 'cron',
      simple: simple ?? { ...DEFAULT_SIMPLE },
      cron: s.cronExpression,
      misfire: s.misfirePolicy === 'run_once' ? 'run_once' : 'skip',
      tz: s.timezone || 'Asia/Shanghai',
      inputs,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // 有效 cron：简单模式实时生成；Cron 模式用户输入
  const effectiveCron = useMemo(() => {
    if (!form) return null;
    return form.tab === 'simple' ? cronFromSimple(form.simple) : form.cron.trim();
  }, [form]);

  // 预览：防抖调后端（权威计算在后端，前端不复制校验规则）
  useEffect(() => {
    if (!modalOpen || !effectiveCron) return;
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(async () => {
      try {
        const result = await workflowApi.previewCron(effectiveCron, form?.tz);
        setPreview(result);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    };
  }, [modalOpen, effectiveCron, form?.tz, form?.tab, JSON.stringify(form?.simple)]);

  const selectedOption = form ? optionByCode.get(form.workflowCode) : undefined;
  const paramDefs = useMemo(() => {
    const props = selectedOption?.inputs?.properties ?? {};
    return Object.entries(props).map(([key, p]) => ({
      key,
      label: p?.title || key,
      type: p?.type || 'string',
      // 后端 DSL 规范化器会在 description 缺失时补字段名占位——与 key 相同时无信息量，不展示
      desc: p?.description && p.description !== key ? p.description : undefined,
      defaultValue: p?.default,
    }));
  }, [selectedOption]);

  const submit = async () => {
    if (!form) return;
    const errors: string[] = [];
    if (!form.name.trim()) errors.push(t('automations.form.name'));
    const opt = optionByCode.get(form.workflowCode);
    if (!opt) errors.push(t('automations.form.workflow'));
    else if (opt.currentVersionId == null) errors.push(t('automations.form.workflowHint'));
    if (!effectiveCron || !preview?.valid) errors.push(t('automations.form.trigger'));
    if (errors.length > 0) {
      setFormError(`${errors.join(' / ')}：${t('automations.preview.invalid')}`);
      return;
    }
    // 参数仅提交有值字段（空串视为未填 → 运行时用 start 节点 default 兜底）
    const inputs: Record<string, unknown> = {};
    Object.entries(form.inputs).forEach(([k, v]) => {
      if (v !== '') inputs[k] = v;
    });
    const payload = {
      scheduleName: form.name.trim(),
      workflowCode: form.workflowCode,
      cronExpression: effectiveCron!,
      timezone: form.tz,
      misfirePolicy: form.misfire,
      inputs,
    };
    setSubmitting(true);
    try {
      const res = editing
        ? await workflowApi.updateSchedule(editing.id, payload)
        : await workflowApi.createSchedule(payload);
      if (res?.success === false) {
        setFormError(res.message || String(t('automations.preview.invalid')));
        return;
      }
      Toast.success(res?.message || (editing ? t('Submit') : t('automations.create')));
      setModalOpen(false);
      await loadSchedules(true);
    } catch (e) {
      setFormError(String((e as Error).message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- 行操作 ---------------- */

  const handleToggle = async (s: WorkflowScheduleRecord) => {
    try {
      const res = await workflowApi.toggleSchedule(s.id);
      if (res?.message) Toast.success(res.message);
      await loadSchedules(true);
    } catch (e) {
      Toast.warning(String((e as Error).message ?? e));
    }
  };

  const handleRunNow = async (s: WorkflowScheduleRecord) => {
    try {
      const res = await workflowApi.runScheduleNow(s.id);
      if (res?.success) Toast.success(t('automations.run.started', { name: s.scheduleName }));
      else Toast.warning(res?.message ?? '—');
      setTimeout(() => void loadSchedules(true), 800);
    } catch (e) {
      Toast.warning(String((e as Error).message ?? e));
    }
  };

  const handleDelete = (s: WorkflowScheduleRecord) => {
    appConfirm({
      title: t('automations.delete.title'),
      content: t('automations.delete.confirm', { name: s.scheduleName }),
      onOk: async () => {
        try {
          const res = await workflowApi.deleteSchedule(s.id);
          if (res?.message) Toast.success(res.message);
          await loadSchedules(true);
        } catch (e) {
          Toast.warning(String((e as Error).message ?? e));
        }
      },
    });
  };

  /* ---------------- 历史抽屉 ---------------- */

  const openHistory = async (s: WorkflowScheduleRecord) => {
    setHistorySchedule(s);
    setHistoryRuns([]);
    setExpandedTaskId(null);
    setHistoryLoading(true);
    try {
      const runs = await workflowApi.listScheduleRuns(s.id);
      setHistoryRuns(runs ?? []);
    } catch {
      // 历史加载失败保留空态
    } finally {
      setHistoryLoading(false);
    }
  };

  const expandRun = async (run: WorkflowRunRecord) => {
    if (expandedTaskId === run.taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(run.taskId);
    if (!runDetails[run.taskId]) {
      try {
        const detail = await workflowApi.getTaskRunDetail(run.taskId);
        setRunDetails((prev) => ({ ...prev, [run.taskId]: detail }));
      } catch {
        // 明细加载失败：保持折叠内容里的空表
      }
    }
  };

  /* ---------------- 渲染 ---------------- */

  const enabledCount = schedules.filter((s) => s.status === 'enabled').length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 桌面形态说明 */}
      <p
        style={{
          ...hintStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '0 0 14px',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        {t('automations.notice')}
      </p>

      {/* 汇总 + 新建 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ color: 'var(--g-text-sub)', fontSize: 13 }}>
          {loading && schedules.length === 0
            ? t('admin.connecting')
            : t('automations.summary', { n: schedules.length, m: enabledCount })}
        </span>
        <button
          type="button"
          className="ghost-btn"
          onClick={openCreate}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--g-line)',
            background: 'var(--g-bg)',
            color: 'var(--g-text)',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          + {t('automations.create')}
        </button>
      </div>

      {/* 列表 */}
      {schedules.length > 0 ? (
        <div
          style={{
            border: '1px solid var(--g-line)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--g-bg)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px,1.6fr) minmax(150px,1.2fr) 150px 170px 80px 150px',
              gap: 8,
              padding: '9px 16px',
              background: 'var(--g-bg-sunken)',
              color: 'var(--g-text-muted)',
              fontSize: 12,
              borderBottom: '1px solid var(--g-line)',
            }}
          >
            <span>{t('automations.col.task')}</span>
            <span>{t('automations.col.workflow')}</span>
            <span>{t('automations.col.nextRun')}</span>
            <span>{t('automations.col.lastResult')}</span>
            <span>{t('automations.col.enabled')}</span>
            <span style={{ textAlign: 'right' }}>{t('automations.col.actions')}</span>
          </div>
          {schedules.map((s) => {
            const meta = STATUS_META[s.lastRunStatus ?? 'none'] ?? STATUS_META.none;
            const next = fmtNextRun(s.nextFireTime);
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px,1.6fr) minmax(150px,1.2fr) 150px 170px 80px 150px',
                  gap: 8,
                  padding: '13px 16px',
                  borderBottom: '1px solid var(--g-line-soft)',
                  alignItems: 'center',
                  opacity: s.status === 'disabled' ? 0.6 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.scheduleName}>
                    {s.scheduleName}
                  </div>
                  <div style={{ color: 'var(--g-text-muted)', fontSize: 12, marginTop: 3 }}>
                    {cronToHuman(s.cronExpression)} ·{' '}
                    {s.misfirePolicy === 'run_once'
                      ? t('automations.misfire.runOnce')
                      : t('automations.misfire.skip')}
                    {s.missCount ? ` · ${t('automations.missCount', { n: s.missCount })}` : ''}
                  </div>
                </div>
                <div>
                  <span
                    title={s.workflowCode}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid var(--g-line)',
                      borderRadius: 8,
                      padding: '3px 10px',
                      fontSize: 12.5,
                      color: 'var(--g-text-body)',
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: s.workflowHasCurrent ? 'var(--g-success)' : 'var(--g-warn)',
                        flexShrink: 0,
                      }}
                    />
                    {s.workflowName || s.workflowCode}
                    <span style={{ color: 'var(--g-text-faint)', fontSize: 11 }}>{s.workflowCode}</span>
                  </span>
                </div>
                <div style={{ fontSize: 13 }}>{next ?? '—'}</div>
                <div>
                  <span
                    title={s.lastError ?? undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      padding: '2px 9px',
                      borderRadius: 999,
                      background: meta.soft,
                      color: meta.color,
                      width: 'fit-content',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                    {t(meta.key)}
                  </span>
                  <div style={{ color: 'var(--g-text-faint)', fontSize: 11.5, marginTop: 3 }}>
                    {s.lastFireTime ? relTime(s.lastFireTime) : '—'}
                  </div>
                </div>
                <div>
                  <Switch
                    size="small"
                    checked={s.status === 'enabled'}
                    onChange={() => void handleToggle(s)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    style={actionIconStyle}
                    title={t('automations.actions.run')}
                    onClick={() => void handleRunNow(s)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    style={actionIconStyle}
                    title={t('automations.actions.history')}
                    onClick={() => void openHistory(s)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5M12 7v5l3.2 2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    style={actionIconStyle}
                    title={t('automations.actions.edit')}
                    onClick={() => openEdit(s)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    style={actionIconStyle}
                    title={t('automations.actions.delete')}
                    onClick={() => handleDelete(s)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--g-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--g-text-sub)')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div
          style={{
            border: '1px dashed var(--g-line)',
            borderRadius: 14,
            padding: '56px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            color: 'var(--g-text-muted)',
            textAlign: 'center',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--g-text-faint)' }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.2 2M9 2.5h6" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--g-text)' }}>
            {loadError ? t('runHistory.loadFailed') : t('automations.empty.title')}
          </div>
          {!loadError && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--g-text-faint)', maxWidth: 380, lineHeight: 1.7 }}>
                {t('automations.empty.hint')}
              </div>
              <button
                type="button"
                onClick={openCreate}
                style={{
                  border: 'none',
                  background: 'var(--g-accent)',
                  color: 'var(--g-accent-fg)',
                  padding: '7px 16px',
                  borderRadius: 9,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {t('automations.empty.cta')}
              </button>
            </>
          )}
        </div>
      ) : null}

      {/* ---------- 新建/编辑弹窗（审计 A1：motion=false 根除关闭动画遮罩竞态） ---------- */}
      <Modal
        visible={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        motion={false}
        title={editing ? t('automations.modal.edit') : t('automations.modal.create')}
        bodyStyle={{ maxHeight: '68vh', overflowY: 'auto' }}
      >
        {form && (
          <div>
            {/* 基本信息 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={fieldLabelStyle}>
                  {t('automations.form.name')}
                  <span style={{ color: 'var(--g-danger)', marginLeft: 2 }}>*</span>
                </label>
                <input
                  className="input"
                  style={inputStyle}
                  value={form.name}
                  placeholder={t('automations.form.namePlaceholder')}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>
                  {t('automations.form.workflow')}
                  <span style={{ color: 'var(--g-danger)', marginLeft: 2 }}>*</span>
                </label>
                <select
                  style={inputStyle}
                  value={form.workflowCode}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, workflowCode: e.target.value, inputs: {} } : f))
                  }
                >
                  {options.map((o) => (
                    <option key={o.code} value={o.code} disabled={o.currentVersionId == null}>
                      {o.name || o.code}
                      {o.currentVersionId == null ? `（${t('automations.form.workflowHint')}）` : ''}
                    </option>
                  ))}
                </select>
                <div style={hintStyle}>{t('automations.form.workflowHint')}</div>
              </div>
            </div>

            {/* 触发时间 */}
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>
                {t('automations.form.trigger')}
                <span style={{ color: 'var(--g-danger)', marginLeft: 2 }}>*</span>
              </label>
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--g-bg-sunken)',
                  border: '1px solid var(--g-line)',
                  borderRadius: 9,
                  padding: 2,
                  gap: 2,
                  marginBottom: 10,
                }}
              >
                {(['simple', 'cron'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setForm((f) => {
                        if (!f) return f;
                        // 切到 Cron 时带上简单模式生成的表达式，便于微调
                        const cron = tab === 'cron' && f.tab === 'simple' ? cronFromSimple(f.simple) : f.cron;
                        return { ...f, tab, cron };
                      });
                    }}
                    style={{
                      border: 'none',
                      background: form.tab === tab ? 'var(--g-bg-raised)' : 'transparent',
                      color: form.tab === tab ? 'var(--g-text)' : 'var(--g-text-sub)',
                      padding: '4px 14px',
                      borderRadius: 7,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      boxShadow: form.tab === tab ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                    }}
                  >
                    {t(tab === 'simple' ? 'automations.form.tabSimple' : 'automations.form.tabCron')}
                  </button>
                ))}
              </div>

              {form.tab === 'simple' ? (
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FREQS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        style={chipBtnStyle(form.simple.freq === f.value)}
                        onClick={() =>
                          setForm((s) => (s ? { ...s, simple: { ...s.simple, freq: f.value } } : s))
                        }
                      >
                        {t(f.labelKey)}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {form.simple.freq === 'everyHour' && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                          {t('automations.freq.hourMinPrefix')}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          style={{ ...inputStyle, width: 76 }}
                          value={form.simple.hourMin}
                          onChange={(e) =>
                            setForm((s) =>
                              s
                                ? {
                                    ...s,
                                    simple: {
                                      ...s.simple,
                                      hourMin: Math.max(0, Math.min(59, Number(e.target.value) || 0)),
                                    },
                                  }
                                : s
                            )
                          }
                        />
                        <span style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                          {t('automations.freq.hourMinSuffix')}
                        </span>
                      </>
                    )}
                    {['everyDay', 'everyWeek', 'everyMonth'].includes(form.simple.freq) && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                          {t('automations.freq.time')}
                        </span>
                        <input
                          type="time"
                          style={{ ...inputStyle, width: 110 }}
                          value={form.simple.time}
                          onChange={(e) =>
                            setForm((s) =>
                              s ? { ...s, simple: { ...s.simple, time: e.target.value } } : s
                            )
                          }
                        />
                      </>
                    )}
                    {form.simple.freq === 'everyWeek' && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                          {t('automations.freq.weekday')}
                        </span>
                        <select
                          style={{ ...inputStyle, width: 110 }}
                          value={form.simple.weekday}
                          onChange={(e) =>
                            setForm((s) =>
                              s
                                ? { ...s, simple: { ...s.simple, weekday: Number(e.target.value) } }
                                : s
                            )
                          }
                        >
                          {WEEKDAYS.map((w, i) => (
                            <option key={i} value={i}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {form.simple.freq === 'everyMonth' && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--g-text-sub)' }}>
                          {t('automations.freq.monthDay')}
                        </span>
                        <select
                          style={{ ...inputStyle, width: 90 }}
                          value={form.simple.monthDay}
                          onChange={(e) =>
                            setForm((s) =>
                              s
                                ? { ...s, simple: { ...s.simple, monthDay: Number(e.target.value) } }
                                : s
                            )
                          }
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    className="mono"
                    style={{ ...inputStyle, fontFamily: 'ui-monospace, Menlo, monospace' }}
                    value={form.cron}
                    placeholder={t('automations.form.cronPlaceholder')}
                    spellCheck={false}
                    onChange={(e) => setForm((f) => (f ? { ...f, cron: e.target.value } : f))}
                  />
                  <div style={hintStyle}>{t('automations.form.cronHint')}</div>
                </div>
              )}

              {/* 预览（后端权威计算） */}
              <div
                style={{
                  marginTop: 10,
                  border: '1px solid var(--g-line-soft)',
                  background: 'var(--g-bg-sunken)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--g-text-muted)', marginBottom: 6 }}>
                  {t('automations.preview.title')}
                </div>
                {!preview ? (
                  <div style={{ fontSize: 12.5, color: 'var(--g-text-faint)' }}>…</div>
                ) : !preview.valid ? (
                  <div style={{ fontSize: 12.5, color: 'var(--g-danger)' }}>
                    {preview.error || t('automations.preview.invalid')}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
                      {(preview.times ?? []).map((iso, i) => (
                        <span
                          key={iso + i}
                          style={{
                            fontSize: 12.5,
                            color: i === 0 ? 'var(--g-text)' : 'var(--g-text-body)',
                            fontWeight: i === 0 ? 600 : 400,
                          }}
                        >
                          {formatPreviewTime(iso)}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--g-text-faint)', marginTop: 7 }}>
                      {t('automations.preview.tz', { tz: preview.timezone || form.tz })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 运行参数（从所选工作流 start 节点派生） */}
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('automations.params.title')}</label>
              {!selectedOption || paramDefs.length === 0 ? (
                <div style={hintStyle}>{t('automations.params.none')}</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {paramDefs.map((p) => (
                      <div key={p.key}>
                        <label style={{ ...fieldLabelStyle, fontWeight: 500, marginBottom: 5 }}>{p.label}</label>
                        <input
                          style={inputStyle}
                          value={form.inputs[p.key] ?? ''}
                          type={p.type === 'number' ? 'number' : 'text'}
                          placeholder={
                            p.defaultValue != null && p.defaultValue !== ''
                              ? t('automations.params.defaultPlaceholder', { v: String(p.defaultValue) })
                              : ''
                          }
                          onChange={(e) =>
                            setForm((f) =>
                              f ? { ...f, inputs: { ...f.inputs, [p.key]: e.target.value } } : f
                            )
                          }
                        />
                        {p.desc && <div style={hintStyle}>{p.desc}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={hintStyle}>{t('automations.params.hint')}</div>
                </>
              )}
            </div>

            {/* 高级选项 */}
            <details
              style={{
                border: '1px solid var(--g-line)',
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 4,
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '9px 14px',
                  fontSize: 13,
                  color: 'var(--g-text-sub)',
                  userSelect: 'none',
                  listStyle: 'none',
                }}
              >
                {t('automations.adv.title')}
              </summary>
              <div
                style={{
                  padding: '2px 14px 14px',
                  borderTop: '1px solid var(--g-line-soft)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ ...fieldLabelStyle, fontWeight: 500, fontSize: 12.5 }}>
                    {t('automations.adv.misfire')}
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={chipBtnStyle(form.misfire === 'skip')}
                      onClick={() => setForm((f) => (f ? { ...f, misfire: 'skip' } : f))}
                    >
                      {t('automations.adv.misfireSkip')}
                    </button>
                    <button
                      type="button"
                      style={chipBtnStyle(form.misfire === 'run_once')}
                      onClick={() => setForm((f) => (f ? { ...f, misfire: 'run_once' } : f))}
                    >
                      {t('automations.adv.misfireRunOnce')}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontWeight: 500, fontSize: 12.5 }}>
                    {t('automations.adv.tz')}
                  </label>
                  <select
                    style={inputStyle}
                    value={form.tz}
                    onChange={(e) => setForm((f) => (f ? { ...f, tz: e.target.value } : f))}
                  >
                    {TIMEZONES.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            {formError && (
              <div style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--g-danger)' }}>
                {formError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ ...chipBtnStyle(false), padding: '7px 18px', fontSize: 13 }}>
                {t('Cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                style={{
                  border: 'none',
                  background: 'var(--g-accent)',
                  color: 'var(--g-accent-fg)',
                  padding: '7px 18px',
                  borderRadius: 9,
                  fontSize: 13,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {editing ? t('Submit') : t('automations.create')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- 运行历史抽屉（同审计 A1：无动画关闭，避免遮罩残留） ---------- */}
      <SideSheet
        visible={!!historySchedule}
        onCancel={() => setHistorySchedule(null)}
        width={520}
        motion={false}
        title={
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {historySchedule?.scheduleName} · {t('automations.history.title')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--g-text-muted)', marginTop: 2 }}>
              {historySchedule ? cronToHuman(historySchedule.cronExpression) : ''}
            </div>
          </div>
        }
      >
        {historyLoading ? (
          <div style={{ color: 'var(--g-text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>
            …
          </div>
        ) : historyRuns.length === 0 ? (
          <div style={{ ...hintStyle, textAlign: 'center', padding: '32px 0' }}>
            {t('automations.history.empty')}
          </div>
        ) : (
          historyRuns.map((run) => {
            const meta = STATUS_META[run.status] ?? STATUS_META.none;
            const detail = runDetails[run.taskId];
            const expanded = expandedTaskId === run.taskId;
            return (
              <div
                key={run.taskId}
                style={{
                  border: `1px solid ${expanded ? 'var(--g-accent-border)' : 'var(--g-line)'}`,
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => void expandRun(run)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 13px',
                    cursor: 'pointer',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      padding: '2px 9px',
                      borderRadius: 999,
                      background: meta.soft,
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                    {t(meta.key)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        color: 'var(--g-text-muted)',
                        fontSize: 11,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {run.taskId}
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--g-text-faint)', marginTop: 2 }}>
                      {fmtFullTime(run.startedAt)} ·{' '}
                      {run.durationMs != null
                        ? fmtDuration(run.durationMs)
                        : run.status === 'running'
                        ? t('automations.running')
                        : '—'}
                    </span>
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ color: 'var(--g-text-faint)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .14s' }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--g-line-soft)', padding: '10px 13px', fontSize: 12.5 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--g-text-muted)', flexShrink: 0, width: 52 }}>
                        {t('automations.history.inputs')}
                      </span>
                      <span
                        style={{
                          color: 'var(--g-text-body)',
                          wordBreak: 'break-all',
                          fontFamily: 'ui-monospace, Menlo, monospace',
                          fontSize: 11.5,
                        }}
                      >
                        {run.inputsJson || '—'}
                      </span>
                    </div>
                    {run.errorMessage && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: 'var(--g-text-muted)', flexShrink: 0, width: 52 }}>
                          {t('runHistory.errorInfo')}
                        </span>
                        <span style={{ color: 'var(--g-danger)', fontSize: 11.5, wordBreak: 'break-all' }}>
                          {run.errorMessage}
                        </span>
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                      <thead>
                        <tr>
                          {['automations.history.node', 'automations.history.type', 'automations.history.status', 'automations.history.duration'].map(
                            (k) => (
                              <th
                                key={k}
                                style={{
                                  textAlign: 'left',
                                  fontWeight: 500,
                                  fontSize: 11,
                                  color: 'var(--g-text-faint)',
                                  padding: '4px 8px',
                                  borderBottom: '1px solid var(--g-line-soft)',
                                }}
                              >
                                {t(k)}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.nodes ?? []).map((n) => {
                          const kind =
                            n.status === 'success' || n.status === 'succeeded'
                              ? 'success'
                              : n.status === 'failed'
                              ? 'failed'
                              : n.status === 'canceled'
                              ? 'canceled'
                              : n.status === 'processing'
                              ? 'running'
                              : 'pending';
                          const colorMap: Record<string, string> = {
                            success: 'var(--g-success)',
                            failed: 'var(--g-danger)',
                            canceled: 'var(--g-text-faint)',
                            running: 'var(--g-accent)',
                            pending: 'var(--g-text-faint)',
                          };
                          const labelMap: Record<string, string> = {
                            success: t('automations.status.success'),
                            failed: t('automations.status.failed'),
                            canceled: t('automations.status.canceled'),
                            running: t('automations.status.running'),
                            pending: '…',
                          };
                          return (
                            <tr key={n.id}>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--g-line-soft)', fontSize: 12, color: 'var(--g-text-body)' }}>
                                {n.title || n.nodeId}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--g-line-soft)', color: 'var(--g-text-muted)', fontSize: 12 }}>
                                {n.nodeType || '—'}
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--g-line-soft)', fontSize: 12 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: colorMap[kind], display: 'inline-block' }} />
                                  {labelMap[kind]}
                                </span>
                              </td>
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--g-line-soft)', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {n.timeCostMs != null ? fmtDuration(n.timeCostMs) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </SideSheet>
    </div>
  );
};

export default AutomationsManagement;
