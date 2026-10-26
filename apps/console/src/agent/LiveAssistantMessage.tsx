/**
 * LiveAssistantMessage —— 流式期间 live 助手消息的时间线渲染体（对标 dsh）。
 *
 * 展示逻辑与真实调用链路一致：思考 → 工具 → 思考 → 工具 → … → 正文，
 * 按事件到达顺序交错渲染。
 *
 * 性能（条目级 memo 契约）：
 *   · 合帧层（store，~20fps）保证发布频率；本层保证单次发布的渲染成本——
 *     时间线条目全部 React.memo，timeline 拷贝时未变条目复用旧引用即 bail out，
 *     每帧只有「正在生长的那一条」真正重渲染。
 *   · 尾块 Markdown 以 200ms 节流降频重解析（对标 dsh transient-chunk 轻 DOM：
 *     活动尾行低频换装，收尾后一次性完整渲染），settled 段零重解析。
 *
 * shimmer 语义（条目自身完备性驱动，不靠 run 级标志透传）：
 *   条目仅在自己的 closed !== true 且连接未中断时才流式闪烁；
 *   工具/通知入场、run 终态、断线重连任一发生即停 —— 已完成的思考块永远安静。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useRuntime, shallowEqual } from './runtime/store';
import type { ActivityLabel } from './use-stable-activity';
import { useStableActivity } from './use-stable-activity';
import type { TimelineItem } from './types';
import Markdown from './Markdown';
import { t } from '../i18n';
import { CHAT } from '../chat/theme';
import { StepRow } from '../chat/ToolSteps';
import { TaskCollapse } from '../chat/TaskCollapse';

/** 已收尾文本块的 memo 化渲染 */
const MemoText: React.FC<{ text: string }> = React.memo(({ text }) => (
  <Markdown content={text} />
));

/** 思考首行（dsh ReasoningRow：流式时取最新完成段落的首行） */
function latestCompletedFirstLine(text: string): string {
  const paras = text.split(/\r?\n(?:[\t ]*\r?\n)+/);
  for (let i = paras.length - 1; i >= 0; i -= 1) {
    const line = (paras[i] || '').split('\n')[0].trim().split('**').join('');
    if (line) return line;
  }
  return '';
}

/** 思考行：思考图标 + 首行摘要（流式 shimmer），展开完整正文（dsh ReasoningRow）；历史消息的独立思考块也复用 */
export const ThinkingItem: React.FC<{ text: string; live?: boolean }> = React.memo(({ text, live }) => {
  const [open, setOpen] = useState(false);
  const summary = live ? latestCompletedFirstLine(text) : (text.split('\n')[0] || '').split('**').join('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 24,
          minWidth: 0,
          width: '100%',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          padding: 0,
          color: 'var(--g-text-faint)',
          transition: 'color .1s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--g-text-muted)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--g-text-faint)'; }}
      >
        {/* 思考图标（dsh IconThinkOutline 同款轮廓气泡） */}
        <span style={{ flex: 'none', width: 16, height: 16, marginRight: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 5.5C13 3.6 10.8 2 8 2S3 3.6 3 5.5c0 1.2.8 2.2 2 2.8V11a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8.3c1.2-.6 2-1.6 2-2.8z" />
            <path d="M6.5 14h3" />
          </svg>
        </span>
        <span style={{ flex: 'none', fontSize: 13, fontWeight: 400, lineHeight: '24px' }}>
          {t('chat.stepTypeThink')}
        </span>
        {summary && (
          <>
            <span
              style={{
                flex: 'none',
                width: 2,
                height: 2,
                borderRadius: 1,
                margin: '0 8px',
                background: 'var(--g-text-faint)',
              }}
            />
            <span
              className={live ? 'dsh-shimmer' : undefined}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13,
                lineHeight: '24px',
              }}
            >
              {summary}
            </span>
          </>
        )}
        <span style={{ flex: 'none', marginLeft: 6, display: 'inline-flex', opacity: open ? 1 : 0.55 }}>
          {open ? <span style={{ fontSize: 10 }}>▾</span> : <span style={{ fontSize: 10 }}>▸</span>}
        </span>
      </button>
      {open && (
        <div
          style={{
            margin: '2px 0 6px 22px',
            color: CHAT.textMuted,
            fontSize: 13,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            maxHeight: 300,
            overflowY: 'auto',
            padding: '2px 0',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
});

/** 值节流：高频 value 以固定间隔采样（尾块 Markdown 重解析降频用） */
function useThrottledValue<T>(value: T, ms: number): T {
  const [delayed, setDelayed] = useState(value);
  const latestRef = useRef(value);
  latestRef.current = value;
  useEffect(() => {
    const timer = setInterval(() => {
      setDelayed((prev) => (Object.is(prev, latestRef.current) ? prev : latestRef.current));
    }, ms);
    return () => clearInterval(timer);
  }, [ms]);
  return delayed;
}

const TAIL_PARSE_INTERVAL_MS = 200;

/** 文本块：按段落切块，已收尾段落 memo；活动尾块 Markdown 降频重解析 */
const TextItem: React.FC<{ text: string; streaming?: boolean }> = React.memo(({ text, streaming }) => {
  const blocks = useMemo(() => {
    if (!streaming) return { settled: [text], tail: '' };
    // 流式中：按空行分块，最后一块视为未收尾
    const parts = text.split(/\n\n+/);
    if (parts.length <= 1) return { settled: [], tail: text };
    return { settled: parts.slice(0, -1), tail: parts[parts.length - 1] };
  }, [text, streaming]);
  // 活动尾块：markdown 解析 200ms 节流（每帧字符串追加不重解析，对标 dsh transient chunk）
  const throttledTail = useThrottledValue(blocks.tail, TAIL_PARSE_INTERVAL_MS);
  return (
    <div className="md-body">
      {blocks.settled.map((b, i) => (
        <MemoText key={i} text={b} />
      ))}
      {blocks.tail && (
        <Markdown content={streaming ? throttledTail : blocks.tail} optionsDisabled />
      )}
    </div>
  );
});

/** 系统通知条（护栏复读警报 / wrap_up / 重试 / 中断 / 压缩播报）：dsh 式 notice 行 */
const NoticeItem: React.FC<{ text: string; source?: string; meta?: Record<string, any> }> = React.memo(
  ({ text, source, meta }) => {
    const warn = source === 'repeat' || source === 'wrap_up';
    // llm_retry：带退避倒计时条（对标 OWB 结构化 attempt/delayMs 播报）
    if (source === 'llm_retry' && meta?.delayMs) {
      return <RetryNotice text={text} delayMs={Number(meta.delayMs) || 0} />;
    }
    // run_end 时间账小结卡：耗时/工具占比/最慢步骤/失败链 + 执行追踪入口
    if (source === 'run_summary') {
      return <RunSummaryCard text={text} meta={meta || {}} />;
    }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          margin: '2px 0',
          padding: '5px 10px',
          borderRadius: 6,
          fontSize: 12.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          color: warn ? '#b45309' : CHAT.textMuted,
          background: warn ? 'rgba(245, 158, 11, 0.08)' : 'rgba(148, 163, 184, 0.08)',
          border: `1px solid ${warn ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
        }}
      >
        <span style={{ flexShrink: 0 }}>{warn ? '🛡️' : source === 'compaction' ? '📜' : 'ℹ️'}</span>
        <span style={{ minWidth: 0 }}>{text}</span>
      </div>
    );
  }
);

/** 重试倒计时条：delayMs 内线性收缩的进度线 */
const RetryNotice: React.FC<{ text: string; delayMs: number }> = ({ text, delayMs }) => {
  const [remaining, setRemaining] = useState(delayMs);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const left = delayMs - (Date.now() - started);
      setRemaining(Math.max(0, left));
      if (left <= 0) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [delayMs]);
  const pct = delayMs > 0 ? Math.max(0, Math.min(100, (remaining / delayMs) * 100)) : 0;
  return (
    <div
      style={{
        margin: '2px 0',
        padding: '5px 10px 7px',
        borderRadius: 6,
        fontSize: 12.5,
        lineHeight: 1.55,
        color: CHAT.textMuted,
        background: 'rgba(148, 163, 184, 0.08)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}
    >
      <div>ℹ️ {text}</div>
      <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(148, 163, 184, 0.25)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: CHAT.accent,
            transition: 'width .12s linear',
          }}
        />
      </div>
    </div>
  );
};

/** token 数缩写（dsh token-format 同款观感）：12345 → 12.3k */
function fmtTokens(n?: number): string {
  const v = Number(n) || 0;
  if (v <= 0) return '-';
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

/** run 时间账小结卡：token 用量（dsh TurnUsagePanel 式）+ 失败链徽标 + 「执行追踪」入口 */
const RunSummaryCard: React.FC<{ text: string; meta: Record<string, any> }> = ({ text, meta }) => {
  const chain: string[] = Array.isArray(meta.failureChain) ? meta.failureChain : [];
  const failed = meta.outcome === 'error' || chain.some((c) => !c.startsWith('wrap_up'));
  const slowest: Array<{ name: string; durationMs: number }> = Array.isArray(meta.slowestTools)
    ? meta.slowestTools
    : [];
  const inTok = Number(meta.promptTokens) || 0;
  const outTok = Number(meta.completionTokens) || 0;
  const hasUsage = inTok + outTok > 0;
  return (
    <div
      style={{
        margin: '2px 0',
        padding: '6px 10px',
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.6,
        color: CHAT.textMuted,
        background: failed ? 'rgba(239, 68, 68, 0.06)' : 'rgba(148, 163, 184, 0.08)',
        border: `1px solid ${failed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(148, 163, 184, 0.2)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span>{text}</span>
        {chain.map((c, i) => (
          <span
            key={i}
            style={{
              padding: '0 6px',
              borderRadius: 4,
              fontSize: 11,
              color: '#b45309',
              background: 'rgba(245, 158, 11, 0.12)',
            }}
            title="失败归因链：护栏/重试/触顶的结构化标记"
          >
            {c}
          </span>
        ))}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gaia-open-trace'))}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            color: CHAT.accent,
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
          }}
        >
          执行追踪 →
        </button>
      </div>
      {hasUsage && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 4,
            padding: '2px 9px',
            borderRadius: 999,
            fontSize: 11.5,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: CHAT.textSub,
            background: 'var(--g-bg-sunken, rgba(148, 163, 184, 0.1))',
            border: `0.5px solid ${CHAT.line}`,
          }}
          title={`本轮累计模型用量（计费口径，${Number(meta.turns) || '-'} 次模型调用合计）：输入 ${inTok.toLocaleString()} tok / 输出 ${outTok.toLocaleString()} tok。每轮调用都会重发全部历史，所以它远大于下方「上下文容量」显示的当前上下文占用`}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>⚡</span>
          <b style={{ color: CHAT.text, fontWeight: 600 }}>{fmtTokens(inTok + outTok)} tok</b>
          <span>in {fmtTokens(inTok)} / out {fmtTokens(outTok)}</span>
          {(Number(meta.turns) || 0) > 0 && (
            <span title="本轮 run 的模型调用次数（累计用量 = 每次调用的输入输出之和）">
              · {Number(meta.turns)} 次调用
            </span>
          )}
        </div>
      )}
      {slowest.length > 0 && (
        <div style={{ marginTop: 2, color: CHAT.textFaint }}>
          最慢：{slowest.map((s) => `${s.name} ${(s.durationMs / 1000).toFixed(1)}s`).join(' · ')}
        </div>
      )}
    </div>
  );
};

/** 时间线渲染：交错条目 + 轮状态行。
 *  connected=false（断线重连中）时所有条目一律按已收尾渲染 —— 重连期不得假装还在流式。 */
export const TimelineView: React.FC<{
  timeline: TimelineItem[];
  streaming: boolean;
  connected?: boolean;
}> = ({ timeline, streaming, connected = true }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {timeline.map((item) => {
      if (item.kind === 'thinking') {
        const live = streaming && connected && item.closed !== true;
        return <ThinkingItem key={item.id} text={item.text} live={live} />;
      }
      if (item.kind === 'notice') {
        return <NoticeItem key={item.id} text={item.text} source={item.source} meta={item.meta} />;
      }
      if (item.kind === 'tool') {
        return <StepRow key={item.id} call={item.call} defaultOpen={streaming} />;
      }
      return <TextItem key={item.id} text={item.text} streaming={streaming && connected && item.closed !== true} />;
    })}
  </div>
);

/** 状态行：只保留异常态（重连中 / 疑似卡死）。
 *  常规的「当前工具 + 耗时」已由 TaskCollapse 折叠行承担（TRAE 式极简），
 *  但重连/卡死是可靠性信号，必须无视折叠常显。自带 5s 心跳：静止期也能检出卡死。 */
const StreamStatusBar: React.FC = () => {
  const status = useRuntime(
    (s) => ({ streaming: s.streaming, connection: s.connection, lastEventAt: s.lastEventAt, startedAt: s.startedAt, currentTool: s.currentTool }),
    shallowEqual
  );
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((v) => v + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!status.streaming) return null;

  const reconnecting = status.connection === 'reconnecting';
  // 挂起等待用户作答不算「卡死」：ask_user 期间没有事件是设计使然（可能等满超时窗口）
  if (status.currentTool === 'ask_user') return null;

  // 卡死中判定：streaming 且 >90s 无任何事件到达（不假装还在跑）
  const stalled =
    status.startedAt > 0 &&
    status.lastEventAt > 0 &&
    Date.now() - status.lastEventAt > 90000;
  if (!reconnecting && !stalled) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11.5,
        color: CHAT.textMuted,
        padding: '3px 0 1px',
        userSelect: 'none',
      }}
    >
      {reconnecting ? (
        <span style={{ color: '#b45309' }}>⚠ {t('chat.reconnecting')}</span>
      ) : (
        <span style={{ color: '#b45309' }}>⚠ 运行疑似卡住（超过 90s 无事件），可停止后重试</span>
      )}
    </div>
  );
};

/** 等待首个事件（思考或 token）的打字点 */
const WaitingDots: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 0' }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: CHAT.textFaint,
          display: 'inline-block',
          animation: `chat-typing 1.2s ${i * 0.16}s infinite ease-in-out`,
        }}
      />
    ))}
  </div>
);

/**
 * 当前活动标签（live 专用）：按时间线尾部未闭合条目推导「任务在干什么」。
 * ask_user 挂起优先（在等用户，不在干活）；工具收尾到下一段思考之间的
 * 空窗视为模型在推理。返回结构化标签（稳定 key + 文案），
 * 经 useStableActivity 做最小停留防抖后展示 —— 子能力毫秒级连发时
 * 标签不再逐事件闪烁。
 */
function currentActivity(state: {
  currentTool: string | null;
  timeline: TimelineItem[];
}): ActivityLabel {
  if (state.currentTool === 'ask_user') {
    return { key: 'wait', label: t('chat.taskWaitingAnswer'), immediate: true };
  }
  // 快速连发聚合：2s 内 ≥3 个工具启动 → 不逐个报名，聚合为计数
  const now = Date.now();
  const recentTools = state.timeline.filter(
    (i) => (i as any).kind === 'tool' && now - ((i as any).startedAt ?? 0) < 2000
  ).length;
  if (recentTools >= 3) {
    return { key: 'tool-burst', label: t('chat.taskToolBurst', { count: recentTools }) };
  }
  for (let i = state.timeline.length - 1; i >= 0; i -= 1) {
    const item = state.timeline[i] as any;
    if (item.closed === true) break; // 尾部开条目才是「正在进行」
    if (item.kind === 'thinking') return { key: 'think', label: t('chat.taskThinking') };
    if (item.kind === 'tool' && item.endedAt == null) {
      const name = item.call?.action || 'tool';
      return { key: `tool:${name}`, label: t('chat.taskCalling', { name }) };
    }
    if (item.kind === 'text') return { key: 'compose', label: t('chat.taskComposing') };
    if (item.kind === 'notice') continue; // 播报不改活动，继续往前找开条目
    break;
  }
  // 空窗（run 刚起 / 工具刚收尾）都视为模型在推理
  return { key: 'think', label: t('chat.taskThinking') };
}

/**
 * live 助手消息渲染体：时间线走 store。
 * TRAE 式极简（2026-10-17 二次反馈）：思考 / 工具 / 系统播报全部收进
 * 「任务耗时 Xs」折叠行默认隐藏，只有正文文本块直接流式渲染。
 */
export const LiveAssistantContent: React.FC = () => {
  const state = useRuntime(
    (s) => ({
      streaming: s.streaming,
      connected: s.connection !== 'reconnecting',
      timeline: s.timeline,
      startedAt: s.startedAt,
      currentTool: s.currentTool,
    }),
    shallowEqual
  );
  // 活动前缀走稳定展示（最小停留 + 连发聚合），不随事件逐条闪烁
  const stableActivity = useStableActivity(state.streaming ? currentActivity(state) : undefined);
  // ask_user 挂起等待：任务没有「在进行」，是在等用户 —— 显式提示，别让秒表假装还在干活
  const waitingAsk = state.streaming && state.currentTool === 'ask_user';
  if (state.timeline.length === 0) {
    return (
      <div>
        {waitingAsk ? <WaitingAnswerBar /> : <WaitingDots />}
        <StreamStatusBar />
      </div>
    );
  }
  // 过程项（思考/工具/播报）与正文文本块分离：前者折叠，后者照常流式
  const processItems = state.timeline.filter((i) => i.kind !== 'text');
  const textItems = state.timeline.filter((i) => i.kind === 'text');
  const connected = state.connected;
  return (
    <div>
      {waitingAsk && <WaitingAnswerBar />}
      {processItems.length > 0 && (
        <TaskCollapse
          live={state.streaming}
          startedAt={state.startedAt > 0 ? state.startedAt : undefined}
          activity={stableActivity}
        >
          <TimelineView timeline={processItems} streaming={state.streaming} connected={connected} />
        </TaskCollapse>
      )}
      {textItems.length > 0 && (
        <TimelineView timeline={textItems} streaming={state.streaming} connected={connected} />
      )}
      <StreamStatusBar />
    </div>
  );
};

/** ask_user 挂起中的等待提示（任务在等用户，不在干活） */
const WaitingAnswerBar: React.FC = () => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', margin: '2px 0 6px',
      borderRadius: 10,
      border: `1px solid ${CHAT.accentBorder}`,
      background: CHAT.accentSoft,
      color: CHAT.textBody,
      fontSize: 12.5,
      lineHeight: 1.6,
    }}
  >
    <span style={{ flexShrink: 0 }}>💬</span>
    <span>{t('chat.waitingYourAnswer')}</span>
  </div>
);

export default LiveAssistantContent;
