/**
 * StatsPills —— 输入框工具栏的统计药丸（方案 A：dsh StatsPills 形态 + owb 阈值显隐哲学）。
 *
 * · 用量药丸（有账目才渲染）：「用量 128.4k · 缓存 86%」，点开全会话账本 —— 数字来自
 *   agent_llm_call_log 全量对话调用聚合，与压缩决策无关，压缩后不变。
 * · 容量药丸（过压缩阈值才渲染）：「上下文 63%」，阈值~85% 灰、85~92% 警告、≥92% 危险；
 *   点开分段容量卡（系统提示词 / 工具 / 消息 / 其他 / 空闲）。告警线 = 后端 compactThreshold
 *   （跨 run 压缩的真实触发线），前端不算数 —— 低占用时整颗药丸不渲染，不做噪音。
 *
 * 两颗药丸共用一套 stat-dialog 皮肤：触发点上方浮层、Esc / 点外关闭、淡入动画。
 * run 结束后由外层 bump refreshTick 触发重取。
 */
import React, { useEffect, useMemo, useState } from 'react';

import { agentApi } from '../agent/api';
import { useAgent } from '../agent/AgentContext';
import { useLanguage, t } from '../i18n';
import { CHAT } from './theme';

interface ContextStats {
  usedTokens: number;
  estimated: boolean;
  breakdown?: { systemPrompt: number; tools: number; messages: number; other: number };
  cacheHitRate?: number;
  sampledCalls?: number;
  lastCallAt?: string;
  model?: string;
  contextWindow?: number;
  compactThreshold?: number;
  session?: { promptTokens: number; cachedTokens: number; completionTokens: number };
}

/** token 数缩写：12345 → 12.3k */
const fmtTok = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const MONO: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

/** 占用色阶：阈值~85% 中性灰、85~92% 警告、≥92% 危险 */
const ratioColor = (ratio: number): string =>
  ratio >= 0.92 ? CHAT.danger : ratio >= 0.85 ? CHAT.warn : CHAT.textMuted;

/* ------------------------------------------------------------------
 * stat-dialog 皮肤：触发点上方浮层（Esc / 点外关闭，一次只开一张）
 * ------------------------------------------------------------------ */
const StatDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  width: number;
  rootRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}> = ({ open, onClose, width, rootRef, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      // 点在浮层内不算外（浮层是 rootRef 兄弟节点，用 data 标记识别）
      let el = target as HTMLElement | null;
      while (el) {
        if (el.dataset?.statDialog === 'true') return;
        el = el.parentElement;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick, true);
    };
  }, [open, onClose, rootRef]);

  if (!open) return null;
  return (
    <div
      data-stat-dialog="true"
      className="chat-fade"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: 0,
        width,
        background: 'var(--g-bg-raised)',
        border: `1px solid ${CHAT.line}`,
        borderRadius: 12,
        boxShadow: 'var(--g-panel-shadow, 0 6px 24px rgba(20,20,40,0.12))',
        padding: '13px 16px 14px',
        zIndex: 40,
      }}
    >
      {children}
    </div>
  );
};

const DialogTitle: React.FC<{ icon: React.ReactNode; label: string; right?: React.ReactNode; rightTitle?: string }> = ({
  icon,
  label,
  right,
  rightTitle,
}) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: CHAT.text }}>
      {icon}
      <span>{label}</span>
      {right && (
        <span style={{ marginLeft: 'auto', fontWeight: 500, ...MONO, fontSize: 11.5, color: CHAT.textSub }} title={rightTitle}>
          {right}
        </span>
      )}
    </div>
    <div style={{ height: 1, background: CHAT.lineSoft, margin: '10px 0 11px' }} />
  </>
);

/* ------------------------------------------------------------------
 * 分类分段条（容量卡内部）：系统提示词 / 工具 / 消息 / 其他 / 空闲
 * 颜色语义跨组件统一（与消息流 compaction 卡、Trajectory 一致）
 * ------------------------------------------------------------------ */
const CATEGORY_COLORS = {
  systemPrompt: CHAT.success,
  tools: '#d97706',
  messages: CHAT.accent,
  other: CHAT.textFaint,
} as const;

const CapacityDetail: React.FC<{ stats: ContextStats; used: number; limit: number; threshold: number }> = ({
  stats,
  used,
  limit,
  threshold,
}) => {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const segments = useMemo(() => {
    const b = stats.breakdown;
    const rows = [
      { key: 'systemPrompt', label: t('chat.contextSystemPrompt'), color: CATEGORY_COLORS.systemPrompt, tok: b?.systemPrompt ?? 0 },
      { key: 'tools', label: t('chat.contextTools'), color: CATEGORY_COLORS.tools, tok: b?.tools ?? 0 },
      { key: 'messages', label: t('chat.contextMessages'), color: CATEGORY_COLORS.messages, tok: b?.messages ?? 0 },
      { key: 'other', label: t('chat.contextOther'), color: CATEGORY_COLORS.other, tok: b?.other ?? 0 },
    ].filter((c) => c.tok > 0);
    const free = Math.max(0, limit - used);
    return { rows, free };
  }, [stats, used, limit]);

  const hint = ratio >= threshold
    ? { tone: CHAT.warn, text: t('chat.capacityHintOver', { percent: Math.round(threshold * 100) }) }
    : { tone: CHAT.textMuted, text: t('chat.capacityHintBelow', { percent: Math.round(threshold * 100) }) };

  return (
    <>
      <DialogTitle
        icon={<CapacityIcon size={13} />}
        label={t('chat.contextCapacity')}
        right={
          <>
            {used.toLocaleString()} / {limit.toLocaleString()} · {(ratio * 100).toFixed(1)}%
            {stats.estimated ? ' ~' : ''}
          </>
        }
        rightTitle={stats.estimated ? t('chat.capacityEstimatedNote') : undefined}
      />
      {/* 分段条：每类占「窗口」的份额 + 空闲段 */}
      <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', margin: '2px 0 10px' }}>
        {segments.rows.map((c) => (
          <span key={c.key} style={{ display: 'block', height: '100%', width: `${Math.max(0.6, (c.tok / limit) * 100)}%`, background: c.color }} />
        ))}
        <span
          className="seg-free"
          style={{
            flex: 1,
            display: 'block',
            height: '100%',
            background: CHAT.bgSunken,
            border: `1px solid ${CHAT.lineSoft}`,
            borderTop: 'none',
            borderBottom: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: CHAT.textSub }}>
        {segments.rows.map((c) => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            <span>{c.label}</span>
            <span style={{ marginLeft: 'auto', ...MONO, fontSize: 11 }}>{fmtTok(c.tok)}</span>
            <span style={{ width: 52, textAlign: 'right', ...MONO, fontSize: 11, color: CHAT.textFaint }}>
              {((c.tok / limit) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHAT.bgSunken, border: `1px solid ${CHAT.line}`, flexShrink: 0 }} />
          <span>{t('chat.contextFree')}</span>
          <span style={{ marginLeft: 'auto', ...MONO, fontSize: 11 }}>{fmtTok(segments.free)}</span>
          <span style={{ width: 52, textAlign: 'right', ...MONO, fontSize: 11, color: CHAT.textFaint }}>
            {((segments.free / limit) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      {stats.cacheHitRate != null && (stats.sampledCalls ?? 0) > 0 && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 9,
            borderTop: `1px solid ${CHAT.lineSoft}`,
            fontSize: 11.5,
            color: CHAT.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{t('chat.contextCacheHit')}</span>
          <b style={{ color: CHAT.textSub, ...MONO }}>{(stats.cacheHitRate * 100).toFixed(1)}%</b>
          <span style={{ color: CHAT.textFaint }}>· {t('chat.contextSampled', { count: stats.sampledCalls })}</span>
        </div>
      )}
      <div style={{ marginTop: 9, display: 'flex', gap: 6, fontSize: 11.5, color: hint.tone, alignItems: 'flex-start' }}>
        <WarnIcon size={12} color={hint.tone} />
        <span>{hint.text}</span>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------
 * 图标（内联 SVG，避免逐个核对 Semi 图标名）
 * ------------------------------------------------------------------ */
const UsageIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);

const CapacityIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

const WarnIcon: React.FC<{ size?: number; color: string }> = ({ size = 12, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
  </svg>
);

/* ------------------------------------------------------------------
 * StatsPills 主体
 * ------------------------------------------------------------------ */
export const StatsPills: React.FC<{
  sessionKey?: string;
  /** run 结束后 +1 触发重取（父层维护） */
  refreshTick?: number;
}> = ({ sessionKey, refreshTick = 0 }) => {
  useLanguage();
  const { tokenUsage } = useAgent();
  const [stats, setStats] = useState<ContextStats | null>(null);
  const [open, setOpen] = useState<'usage' | 'capacity' | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sessionKey) {
      setStats(null);
      return;
    }
    let cancelled = false;
    agentApi
      .getContextStats(sessionKey)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionKey, refreshTick]);

  const limit = stats?.contextWindow || (tokenUsage.limit > 0 ? tokenUsage.limit : 32768);
  const used = stats?.usedTokens ?? 0;
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  // 告警线 = 跨 run 压缩真线（后端下发）；旧后端没有该字段时退 60%
  const thresholdRatio = stats?.compactThreshold && stats.compactThreshold > 0 && limit > 0
    ? Math.min(1, stats.compactThreshold / limit)
    : 0.6;

  // 会话累计账（全部对话调用）：用量药丸的数据
  const session = stats?.session;
  const billedTotal = session ? session.promptTokens + session.completionTokens : 0;
  const usagePct = session && session.promptTokens > 0 ? session.cachedTokens / session.promptTokens : stats?.cacheHitRate;
  const showUsage = !!stats && (billedTotal > 0 || used > 0);
  const showCapacity = !!stats && used > 0 && ratio >= thresholdRatio && limit > 0;

  if (!sessionKey || !stats || (!showUsage && !showCapacity)) return null;

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    border: 'none',
    borderRadius: 9,
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    color: CHAT.textMuted,
    transition: 'background .14s, color .14s',
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0, display: 'inline-flex', gap: 2 }}>
      {/* 用量药丸：全会话账本 */}
      {showUsage && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open === 'usage'}
            title={t('chat.contextExpand')}
            onClick={() => setOpen(open === 'usage' ? null : 'usage')}
            style={pillStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CHAT.hover;
              e.currentTarget.style.color = CHAT.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = CHAT.textMuted;
            }}
          >
            <UsageIcon />
            <span>
              {t('chat.usagePillLabel')}{' '}
              <span style={MONO}>{fmtTok(billedTotal > 0 ? billedTotal : used)}</span>
              {usagePct != null && (
                <>
                  {' · '}
                  {t('chat.usageCacheShort')} <span style={MONO}>{Math.round(usagePct * 100)}%</span>
                </>
              )}
            </span>
          </button>
          <StatDialog open={open === 'usage'} onClose={() => setOpen(null)} width={320} rootRef={rootRef}>
            <DialogTitle
              icon={<UsageIcon size={13} />}
              label={t('chat.usageDialogTitle')}
              right={`${(billedTotal > 0 ? billedTotal : used).toLocaleString()} tokens`}
            />
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 7, columnGap: 18, fontSize: 12, margin: 0 }}>
              {session && session.promptTokens > 0 ? (
                <>
                  <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageInput')}</dt>
                  <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                    {(session.promptTokens - session.cachedTokens).toLocaleString()}
                  </dd>
                  {session.cachedTokens > 0 && (
                    <>
                      <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageCached')}</dt>
                      <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                        {session.cachedTokens.toLocaleString()}
                      </dd>
                    </>
                  )}
                </>
              ) : (
                <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.contextCapacityHint')}</dt>
              )}
              {session && session.completionTokens > 0 && (
                <>
                  <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageOutput')}</dt>
                  <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                    {session.completionTokens.toLocaleString()}
                  </dd>
                </>
              )}
              {session && session.promptTokens > 0 && (
                <>
                  <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageCalls')}</dt>
                  <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                    {t('chat.contextSampled', { count: stats.sampledCalls ?? 0 })}
                  </dd>
                </>
              )}
              {stats.model && (
                <>
                  <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageModel')}</dt>
                  <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>{stats.model}</dd>
                </>
              )}
            </dl>
          </StatDialog>
        </div>
      )}

      {/* 容量药丸：过压缩阈值才出现，随危险度升级 */}
      {showCapacity && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open === 'capacity'}
            title={t('chat.contextExpand')}
            onClick={() => setOpen(open === 'capacity' ? null : 'capacity')}
            style={{ ...pillStyle, color: ratio >= 0.85 ? ratioColor(ratio) : CHAT.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ratio >= 0.85 ? 'transparent' : CHAT.hover;
              e.currentTarget.style.color = ratio >= 0.85 ? ratioColor(ratio) : CHAT.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = ratio >= 0.85 ? ratioColor(ratio) : CHAT.textMuted;
            }}
          >
            <CapacityIcon />
            <span>
              {t('chat.contextCapacity')} <span style={MONO}>{(ratio * 100).toFixed(0)}%</span>
            </span>
          </button>
          <StatDialog open={open === 'capacity'} onClose={() => setOpen(null)} width={400} rootRef={rootRef}>
            <CapacityDetail stats={stats} used={used} limit={limit} threshold={thresholdRatio} />
          </StatDialog>
        </div>
      )}
    </div>
  );
};

export default StatsPills;
