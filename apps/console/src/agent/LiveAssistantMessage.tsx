/**
 * LiveAssistantMessage —— 流式期间 live 助手消息的时间线渲染体（对标 dsh）。
 *
 * 展示逻辑与真实调用链路一致：思考 → 工具 → 思考 → 工具 → … → 正文，
 * 按事件到达顺序交错渲染；write/save_workflow 的应用卡内联在对应工具
 * 行之后（不再是悬浮在对话尾部的孤儿卡）。
 *
 * 性能：正文/思考直接订阅 liveStreamStore（三重 rAF 合帧），token 更新
 * 不触发 messages state 变化，历史行零重渲染；已收尾文本段 memo 缓存。
 */
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { liveStreamStore } from './live-stream-store';
import type { TimelineItem } from './types';
import Markdown from './Markdown';
import { t } from '../i18n';
import { CHAT } from '../chat/theme';
import { StepRow } from '../chat/ToolSteps';
import { ApplyWorkflowCard } from '../chat/ArtifactCards';

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

/** 思考行：思考图标 + 首行摘要（流式 shimmer），展开完整正文（dsh ReasoningRow） */
const ThinkingItem: React.FC<{ text: string; live?: boolean }> = ({ text, live }) => {
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
};

/** 文本块：按段落切块，已收尾段落 memo（每帧只重解析尾段） */
const TextItem: React.FC<{ text: string; streaming?: boolean }> = ({ text, streaming }) => {
  const blocks = useMemo(() => {
    if (!streaming) return { settled: [text], tail: '' };
    // 流式中：按空行分块，最后一块视为未收尾
    const parts = text.split(/\n\n+/);
    if (parts.length <= 1) return { settled: [], tail: text };
    return { settled: parts.slice(0, -1), tail: parts[parts.length - 1] };
  }, [text, streaming]);
  return (
    <div className="md-body">
      {blocks.settled.map((b, i) => (
        <MemoText key={i} text={b} />
      ))}
      {blocks.tail && <Markdown content={blocks.tail} optionsDisabled />}
    </div>
  );
};

/** 时间线渲染：交错条目 + 内联应用卡 + 轮状态行 */
export const TimelineView: React.FC<{
  timeline: TimelineItem[];
  streaming: boolean;
  pendingConfirm?: { toolCallId: string; action: string; args: Record<string, unknown> } | null;
  onResolveConfirm?: (approved: boolean) => void;
}> = ({ timeline, streaming, pendingConfirm, onResolveConfirm }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {timeline.map((item) => {
      if (item.kind === 'thinking') {
        return <ThinkingItem key={item.id} text={item.text} live={streaming} />;
      }
      if (item.kind === 'tool') {
        const isPendingConfirm = pendingConfirm?.toolCallId === item.id;
        return (
          <React.Fragment key={item.id}>
            <StepRow call={item.call} defaultOpen={streaming} />
            {isPendingConfirm && onResolveConfirm && (
              <div style={{ margin: '4px 0 2px 12px' }}>
                <ApplyWorkflowCard args={pendingConfirm!.args} onResolve={onResolveConfirm} />
              </div>
            )}
          </React.Fragment>
        );
      }
      return <TextItem key={item.id} text={item.text} streaming={streaming} />;
    })}
  </div>
);

/** 状态行：第 N/M 轮 · 当前工具 · 耗时（500ms 心跳） */
const StreamStatusBar: React.FC = () => {
  const state = useSyncExternalStore(liveStreamStore.subscribe, liveStreamStore.getSnapshot);
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!state.streaming) return;
    const timer = setInterval(() => forceTick((v) => v + 1), 500);
    return () => clearInterval(timer);
  }, [state.streaming]);
  if (!state.streaming) return null;

  const elapsed = state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0;
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
      <span
        style={{
          width: 10,
          height: 10,
          border: `1.5px solid ${CHAT.line}`,
          borderTopColor: CHAT.accent,
          borderRadius: '50%',
          animation: 'chat-spin .8s linear infinite',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {state.maxTurns > 0 && (
        <span>{t('chat.streamTurn', { turn: state.turn, max: state.maxTurns })}</span>
      )}
      {state.currentTool && (
        <span style={{ color: CHAT.accent, fontWeight: 500 }}>{state.currentTool}</span>
      )}
      <span style={{ marginLeft: 'auto', color: CHAT.textFaint }}>{elapsed.toFixed(1)}s</span>
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
 * live 助手消息渲染体：时间线走 store；确认卡内联；
 * 工具步骤等结构化内容由 store.timeline 驱动（结构性事件低频）。
 */
export const LiveAssistantContent: React.FC<{
  onResolveConfirm?: (approved: boolean) => void;
  /**
   * 挂起确认的权威来源（AgentContext React state）：SSE 重连/页面刷新后
   * 快照恢复可靠；store 副本在 beginRun 时会被重置，只作兜底。
   */
  pendingConfirm?: { toolCallId: string; action: string; args: Record<string, unknown> } | null;
}> = ({ onResolveConfirm, pendingConfirm }) => {
  const state = useSyncExternalStore(liveStreamStore.subscribe, liveStreamStore.getSnapshot);
  const effectiveConfirm = pendingConfirm !== undefined ? pendingConfirm : state.pendingConfirm;
  const empty = state.timeline.length === 0;
  return (
    <div>
      {empty ? <WaitingDots /> : (
        <TimelineView
          timeline={state.timeline}
          streaming={state.streaming}
          pendingConfirm={effectiveConfirm}
          onResolveConfirm={onResolveConfirm}
        />
      )}
      {empty && effectiveConfirm && onResolveConfirm && (
        /* timeline 尚空但确认已挂起（边界时序）：卡不能等 timeline */
        <div style={{ margin: '4px 0 2px 12px' }}>
          <ApplyWorkflowCard args={effectiveConfirm.args} onResolve={onResolveConfirm} />
        </div>
      )}
      <StreamStatusBar />
    </div>
  );
};

export default LiveAssistantContent;
