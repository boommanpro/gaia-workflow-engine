/**
 * ChatMessageList —— 对话正文的渲染层（通用模式与专家模式共用）。
 *
 * 排版基调对齐 ZCode/Claude Code 式对话流：
 *   · AI 的正文不套气泡、不带头像，直接排版 —— 正文松、过程紧
 *   · 用户消息是左对齐的浅灰圆角气泡，与 AI 正文同列起头
 *   · 工具调用 / 思考 / 计划全部走极简折叠行，不把过程糊在脸上
 *   · 复制、调试这类动作收成 hover 才出现的小图标
 *   · 对话居中成一条窄栏，宽屏不会拉成一整行
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip, Toast } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconChevronDown,
  IconChevronRight,
  IconTerminal,
} from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import type { DisplayMessage } from '../agent/types';
import Markdown from '../agent/Markdown';
import { LiveAssistantContent, TimelineView, ThinkingItem } from '../agent/LiveAssistantMessage';
import { liveStreamStore } from '../agent/live-stream-store';
import { useSyncExternalStore } from 'react';
import SubagentCard from '../agent/SubagentCard';
import { PlanCard } from '../agent/PlanCard';
import { useLanguage, t } from '../i18n';
import { useLatestArtifact } from '../agent/artifact-store';
import { CHAT, CHAT_COLUMN_WIDTH, ChatStyles } from './theme';
import { ToolSteps } from './ToolSteps';
import { TaskCollapse } from './TaskCollapse';
import { AskCard } from './AskCard';
import {
  LiveCanvasCard,
  ReleaseCard,
} from './ArtifactCards';

/** token 数缩写（dsh token-format 观感）：12345 → 12.3k */
const fmtTok = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const MONO: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

/** 时间戳 → HH:mm（无效值返回空串，不占位） */
const fmtTime = (ts?: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 本轮耗时（ms → 秒，向上取整）；无数据返回 undefined，折叠行退化为「执行过程」 */
const durMsToSec = (ms?: number): number | undefined =>
  ms != null && ms > 0 ? Math.round(ms / 1000) : undefined;

/** 历史时间线渲染体：过程项（思考/工具/播报）折叠进「任务耗时」，正文文本块直接渲染 */
const HistoryTimeline: React.FC<{
  timeline: NonNullable<DisplayMessage['timeline']>;
  elapsedSec?: number;
}> = ({ timeline, elapsedSec }) => {
  const processItems = timeline.filter((i) => i.kind !== 'text');
  const textItems = timeline.filter((i) => i.kind === 'text');
  return (
    <>
      {processItems.length > 0 && (
        <TaskCollapse elapsedSec={elapsedSec}>
          <TimelineView timeline={processItems} streaming={false} />
        </TaskCollapse>
      )}
      {textItems.length > 0 && <TimelineView timeline={textItems} streaming={false} />}
    </>
  );
};

/** 助手头像：品牌色圆角方块 + 黑白版 G logo（public/logo.svg 的节点连线 G，currentColor 跟随主题反转） */
const AssistantAvatar: React.FC = () => (
  <span
    aria-hidden
    style={{
      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
      background: CHAT.accent, color: CHAT.accentFg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    {/* 黑白版 logo：结构与 public/logo.svg 一致，渐变/彩色圆点统一替换为 currentColor；
        viewBox 相比原版做了居中裁边（26 42 185 185），否则 G 在 256 画布里只占六成，头像内显得空 */}
    <svg width="24" height="24" viewBox="26 42 185 185" fill="none">
      <path
        d="M188 86 Q128 55, 86 97 Q55 138, 86 180 Q128 222, 188 190 L188 149 L133 149"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="188" cy="86" r="13" fill="currentColor" />
      <circle cx="86" cy="97" r="11" fill="currentColor" />
      <circle cx="55" cy="138" r="11" fill="currentColor" />
      <circle cx="86" cy="180" r="11" fill="currentColor" />
      <circle cx="188" cy="190" r="13" fill="currentColor" />
      <circle cx="188" cy="149" r="11" fill="currentColor" />
      <circle cx="133" cy="149" r="13" fill="currentColor" />
    </svg>
  </span>
);

/** 消息头：名称 + 时间（助手消息的身份行） */
const MessageTitle: React.FC<{ ts?: number }> = ({ ts }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: CHAT.text }}>{t('workspace.brand')}</span>
    {ts ? <span style={{ fontSize: 11, color: CHAT.textFaint }}>{fmtTime(ts)}</span> : null}
  </div>
);

/**
 * 回复尾部的本轮用量（dsh TurnUsagePanel 同位）：小字持久展示，点击弹单轮账本卡
 * （输入/缓存/输出拆分 + 耗时/速度 + 模型）。账目来自 run_end + /turn-usage 聚合。
 */
const TokenUsagePill: React.FC<{
  usage: { promptTokens: number; completionTokens: number; durationMs?: number; cachedTokens?: number; model?: string };
}> = ({ usage }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const total = usage.promptTokens + usage.completionTokens;
  if (total <= 0) return null;

  const hasCache = usage.cachedTokens != null && usage.cachedTokens > 0 && usage.promptTokens > usage.cachedTokens;
  const cachePct = hasCache ? (usage.cachedTokens! / usage.promptTokens) * 100 : null;
  const secs = usage.durationMs != null && usage.durationMs > 0 ? (usage.durationMs / 1000).toFixed(1) : null;
  const speed = secs && usage.completionTokens > 0
    ? Math.round(usage.completionTokens / (usage.durationMs! / 1000))
    : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick, true);
    };
  }, [open]);

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-expanded={open}
        title={t('chat.turnUsageTitle')}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '1px 8px',
          borderRadius: 999,
          fontSize: 11,
          border: 'none',
          background: 'transparent',
          color: CHAT.textFaint,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background .14s, color .14s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = CHAT.hover;
          e.currentTarget.style.color = CHAT.textSub;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = CHAT.textFaint;
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
        {t('chat.turnUsageConsumed')} <b style={{ ...MONO, fontWeight: 600 }}>{fmtTok(total)}</b>
        {cachePct != null && (
          <>
            {' · '}
            {t('chat.usageCacheShort')} <b style={{ ...MONO, fontWeight: 600 }}>{Math.round(cachePct)}%</b>
          </>
        )}
      </button>
      {open && (
        <div
          className="chat-fade"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: 300,
            background: 'var(--g-bg-raised)',
            border: `1px solid ${CHAT.line}`,
            borderRadius: 12,
            boxShadow: 'var(--g-panel-shadow, 0 6px 24px rgba(20,20,40,0.12))',
            padding: '13px 16px 14px',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: CHAT.text }}>
            {t('chat.turnUsageTitle')}
            <span style={{ marginLeft: 'auto', fontWeight: 500, ...MONO, fontSize: 11.5, color: CHAT.textSub }}>
              {total.toLocaleString()} tokens
            </span>
          </div>
          <div style={{ height: 1, background: CHAT.lineSoft, margin: '10px 0 11px' }} />
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 7, columnGap: 18, fontSize: 12, margin: 0 }}>
            <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageInput')}</dt>
            <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
              {(usage.promptTokens - (hasCache ? usage.cachedTokens! : 0)).toLocaleString()}
            </dd>
            {hasCache && (
              <>
                <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageCached')}</dt>
                <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                  {usage.cachedTokens!.toLocaleString()}
                </dd>
              </>
            )}
            <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageOutput')}</dt>
            <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
              {usage.completionTokens.toLocaleString()}
            </dd>
            {(secs || speed) && (
              <>
                <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.turnUsageTimeSpeed')}</dt>
                <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>
                  {secs ?? '—'}{speed ? ` · ${speed} tok/s` : ''}
                </dd>
              </>
            )}
            {usage.model && (
              <>
                <dt style={{ color: CHAT.textMuted, fontWeight: 400 }}>{t('chat.usageModel')}</dt>
                <dd style={{ margin: 0, textAlign: 'right', ...MONO, fontSize: 11.5, color: CHAT.textBody }}>{usage.model}</dd>
              </>
            )}
          </dl>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${CHAT.lineSoft}`, fontSize: 11, color: CHAT.textFaint }}>
            {t('chat.turnUsageNote')}
          </div>
        </div>
      )}
    </span>
  );
};

/**
 * 上下文压缩注记（dsh CompactionItem 皮肤）：icon 芯片 + 标题 + 一行摘要，
 * 可展开看摘要正文。数据仍是后端 compaction 产物的【前情摘要】消息。
 */
const CompactionCard: React.FC<{ content: string; compact?: boolean }> = ({ content, compact }) => {
  const [open, setOpen] = useState(false);
  const lines = content.split('\n');
  const summary = (lines[0] || '').replace(/^【前情摘要】\s*/, '');
  const body = lines.slice(1).join('\n').trim();
  const expandable = body.length > 0;
  return (
    <div className="chat-fade" style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
      <div style={{ maxWidth: '86%', minWidth: 0 }}>
        <button
          type="button"
          aria-expanded={expandable ? open : undefined}
          onClick={() => expandable && setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            textAlign: 'left',
            border: 'none',
            background: 'none',
            padding: '5px 8px',
            margin: 0,
            marginLeft: -8,
            borderRadius: 9,
            cursor: expandable ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (expandable) e.currentTarget.style.background = CHAT.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: CHAT.accentSoft,
              border: `1px solid ${CHAT.accentBorder}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CHAT.textSub,
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8h16M4 16h10" />
            </svg>
          </span>
          <span style={{ fontSize: compact ? 12 : 12.5, fontWeight: 600, color: CHAT.text, flexShrink: 0 }}>
            {t('chat.compactionTitle')}
          </span>
          <span style={{ flex: '0 1 26px', height: 1, background: CHAT.line }} />
          <span
            style={{
              fontSize: compact ? 11.5 : 12,
              color: CHAT.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {summary}
          </span>
          {expandable && (
            <span style={{ color: CHAT.textFaint, flexShrink: 0, display: 'inline-flex' }}>
              {open ? <IconChevronDown size="small" /> : <IconChevronRight size="small" />}
            </span>
          )}
        </button>
        {open && expandable && (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '8px 10px 2px',
              lineHeight: 1.6,
              fontSize: compact ? 12 : 12.5,
              color: CHAT.textSub,
            }}
          >
            {body}
          </div>
        )}
      </div>
    </div>
  );
};

const IconButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <Tooltip content={title} position="top">
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        border: 'none',
        borderRadius: 7,
        background: 'transparent',
        color: CHAT.textMuted,
        cursor: 'pointer',
        transition: 'background .14s, color .14s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CHAT.hover;
        e.currentTarget.style.color = CHAT.textSub;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = CHAT.textMuted;
      }}
    >
      {children}
    </button>
  </Tooltip>
);

const TypingIndicator: React.FC = () => (
  <div className="chat-fade" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 0 2px' }}>
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

interface ChatMessageListProps {
  /** 侧边栏等窄容器使用 */
  compact?: boolean;
  /** 关闭底部留白（专家模式侧边栏已经由外层留白） */
  dense?: boolean;
  /** 2026-10-17：todo 改由顶部 TodoCard 固定渲染，消息流不再内嵌计划卡 */
  hidePlanCards?: boolean;
  }

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  compact = false,
  dense = false,
  hidePlanCards = false,
}) => {
  const { messages, streaming, liveMessageId, sendMessage, queueLength, currentSessionKey } = useAgent();
  useLanguage();
  /** run 期间最新的 workflow 产物 —— 驱动对话流里的画布活卡（随版本原地生长） */
  const liveWorkflowArtifact = useLatestArtifact(currentSessionKey, 'workflow');

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  /** 流式帧订阅：typing 门控 + 合帧滚动（token 不再触发 messages effect） */
  const streamState = useSyncExternalStore(liveStreamStore.subscribe, liveStreamStore.getSnapshot);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'assistant' && m.content) return m.id;
    }
    return null;
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = distance < 80;
    setShowJump(distance > 220);
  }, []);

  useEffect(() => {
    if (stickRef.current) scrollToBottom('auto');
  }, [messages, streaming, scrollToBottom]);

  useEffect(() => {
    // 流式帧（≤20fps）：跟随滚动在此统一处理，避免逐 token 的 scroll 布局抖动
    if (streamState.version > 0 && stickRef.current) scrollToBottom('auto');
  }, [streamState.version, scrollToBottom]);

  const handleOptionClick = useCallback(
    (option: string) => {
      if (!streaming) void sendMessage(option);
    },
    [streaming, sendMessage]
  );

  const copyMessage = useCallback((content: string) => {
    void navigator.clipboard.writeText(content).then(
      () => Toast.success(t('chat.copied')),
      () => Toast.error(t('chat.copyFailed'))
    );
  }, []);

  const openDebug = useCallback((id: string) => {
    const evt = new CustomEvent('gaia:open-debug', { detail: id });
    window.dispatchEvent(evt);
  }, []);

  /** 历史窗口（owb TURN_WINDOW 对标）：默认只渲染最近 10 个用户轮次，更早的收在按钮里 */
  const [turnsWindow, setTurnsWindow] = useState(10);

  /** 把连续的工具消息切成一「组」，交给 ToolSteps 折叠渲染 */
  const items = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    // 轮次起点（每个 user 消息开启一轮）：默认只保留最近 turnsWindow 轮
    const userIdx: number[] = [];
    messages.forEach((mm, idx) => { if (mm.role === 'user') userIdx.push(idx); });
    const firstVisibleIdx = userIdx.length > turnsWindow ? userIdx[userIdx.length - turnsWindow] : 0;
    const hiddenCount = firstVisibleIdx > 0 ? firstVisibleIdx : 0;
    let i = 0;
    if (hiddenCount > 0) {
      i = hiddenCount;
      nodes.push(
        <div key="older-turns" style={{ textAlign: 'center', padding: '6px 0' }}>
          <button
            type="button"
            onClick={() => setTurnsWindow((w) => w + 10)}
            style={{
              border: `1px solid ${CHAT.line || '#eee'}`,
              background: 'transparent',
              borderRadius: 8,
              padding: '4px 14px',
              fontSize: 12,
              color: CHAT.textSub,
              cursor: 'pointer',
            }}
          >
            显示更早的 {hiddenCount} 条消息
          </button>
        </div>,
      );
    }
    while (i < messages.length) {
      const m = messages[i];

      if (m.role === 'assistant' && m.id !== liveMessageId && !m.content && !m.thinking && !m.subagentSteps && !m.subagentResult && !m.planSteps && !m.toolSteps && !m.ask) {
        // 空的助手占位消息（历史重建的产物）：无正文无卡片，直接跳过
        i += 1;
        continue;
      }

      if (m.subagentSteps || m.subagentResult) {
        nodes.push(<SubagentCard key={`sub-${m.id}`} message={m} />);
        i += 1;
        continue;
      }

      // ask_user 提问卡：流式期间也可交互（工具正挂起等待这个回答）；与助手消息同栏位，视觉上同属 AI 发起
      if (m.ask) {
        nodes.push(
          <div key={`ask-${m.id}`} className="chat-fade" style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
            <AssistantAvatar />
            <div style={{ minWidth: 0, flex: 1 }}>
              <AskCard ask={m.ask} sessionKey={currentSessionKey || undefined} />
            </div>
          </div>
        );
        i += 1;
        continue;
      }

      if (m.role === 'tool') {
        if (m.planSteps && m.planSteps.length > 0 && !hidePlanCards) {
          nodes.push(<PlanCard key={m.id} steps={m.planSteps} />);
          i += 1;
          continue;
        }
        if (m.artifact) {
          // 试运行（test_report）不再单独渲染卡：run 本身就是一次工具调用，
          // IN/OUT 由工具行承载（dsh 同款语义）；发布（release）仍保留收口卡
          if (m.artifact.type === 'release') {
            nodes.push(<ReleaseCard key={m.id} artifact={m.artifact} />);
          }
          i += 1;
          continue;
        }
        const group: DisplayMessage[] = [];
        while (i < messages.length && messages[i].role === 'tool') {
          const tm = messages[i];
          if (tm.planSteps && tm.planSteps.length > 0) break;
          if (!tm.content && !tm.toolCall && !tm.subagentSteps) {
            i += 1;
            continue;
          }
          group.push(tm);
          i += 1;
        }
        if (group.length > 0) {
          nodes.push(<ToolSteps key={`tools-${group[0].id}`} messages={group} compact={compact} />);
        }
        continue;
      }

      if (m.role === 'user') {
        // 上下文摘要（后端 compaction 产物）：dsh CompactionItem 皮肤的系统注记卡，不占用户气泡
        if (m.content && m.content.startsWith('【前情摘要】')) {
          nodes.push(<CompactionCard key={m.id} content={m.content} compact={compact} />);
          i += 1;
          continue;
        }
        // 用户新开一轮对话块：右对齐气泡 + 头像，与上一轮之间留呼吸感（首条消息顶部留白由容器 padding 承担）
        nodes.push(
          <div key={m.id} className="chat-fade" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '2px 0', marginTop: 22 }}>
            <div style={{ maxWidth: compact ? '88%' : '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 0 }}>
              {m.content && (
                <div
                  style={{
                    padding: '9px 14px',
                    borderRadius: 16,
                    background: CHAT.userBubble,
                    color: CHAT.userBubbleText,
                    fontSize: compact ? 13 : 14,
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
              )}
              {m.images && m.images.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {m.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt=""
                      style={{
                        width: 96,
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: `1px solid ${CHAT.line}`,
                        display: 'block',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        i += 1;
        continue;
      }

      // assistant：一次 run 合并为一条回复 —— 头像 + 身份行在前，过程行折叠，正文在后
      nodes.push(
        <div
          key={m.id}
          className="chat-msg chat-fade"
          style={{ display: 'flex', gap: 12, padding: '4px 0' }}
        >
          <AssistantAvatar />
          <div style={{ minWidth: 0, flex: 1 }}>
            <MessageTitle ts={m.timestamp} />
            {/* TRAE 式极简（2026-10-17 二次反馈）：思考 + 工具过程默认收进「任务耗时」一行，
                点击才展开。live 行的过程由 store 时间线渲染（LiveAssistantContent 内），
                此处只管历史消息 —— 条件里排除 liveMessageId 防止双路重复 */}
            {!m.timeline?.length && m.id !== liveMessageId && (m.thinking || (m.toolSteps && m.toolSteps.length > 0)) && (
              <TaskCollapse elapsedSec={durMsToSec(m.tokenUsage?.durationMs)}>
                {m.thinking && <ThinkingItem text={m.thinking} />}
                {m.toolSteps && m.toolSteps.length > 0 && (
                  <ToolSteps
                    messages={m.toolSteps.map((ts) => ({
                      id: `ts-${ts.id}`,
                      role: 'tool' as const,
                      content: '',
                      toolCall: ts,
                      timestamp: m.timestamp,
                    }))}
                    compact={compact}
                  />
                )}
              </TaskCollapse>
            )}
            {m.planSteps && m.planSteps.length > 0 && !hidePlanCards && <PlanCard key={`plan-${m.id}`} steps={m.planSteps} />}
            {/* live 行渲染体不要求 streaming=true：done→reload 交接期（streaming 已落定、
                历史重载未返回）store.timeline 仍持有完整内容，避免闪一帧空回复 */}
            {m.id === liveMessageId ? (
              <LiveAssistantContent />
            ) : m.timeline && m.timeline.length > 0 ? (
              <HistoryTimeline timeline={m.timeline} elapsedSec={durMsToSec(m.tokenUsage?.durationMs)} />
            ) : (
              <Markdown
                content={m.content}
                onOptionClick={handleOptionClick}
                optionsDisabled={streaming}
                optionsRetired={!!lastAssistantId && m.id !== lastAssistantId}
              />
            )}
            <div
              className="chat-msg-actions"
              style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4, marginLeft: -4 }}
            >
              <IconButton title={t('chat.copy')} onClick={() => copyMessage(m.content)}>
                <IconCopy size="small" />
              </IconButton>
              {m.debugEntryId && (
                <IconButton title={t('chat.debug')} onClick={() => openDebug(m.debugEntryId as string)}>
                  <IconTerminal size="small" />
                </IconButton>
              )}
              {m.tokenUsage && m.id !== liveMessageId && <TokenUsagePill usage={m.tokenUsage} />}
            </div>
          </div>
        </div>
      );
      i += 1;
    }
    return nodes;
  }, [messages, compact, streaming, liveMessageId, lastAssistantId, handleOptionClick, copyMessage, openDebug]);

  const lastMsg = messages[messages.length - 1];
  // 打字点只兜「无 live 占位行」的空窗（历史末条是 assistant 且非 live，如重连间隙）；
  // live 行自身已带 WaitingDots + 状态行，再渲染 TypingIndicator 会出现两个 AI 头像
  const showTyping = streaming && !!lastMsg && lastMsg.role === 'assistant'
    && lastMsg.id !== liveMessageId
    && !streamState.content && !streamState.thinking && streamState.timeline.length === 0;

  // 画布活卡只在「这一轮真的动过画布」时出现：streaming 开始时记下当前产物版本，
  // 版本号在本轮内发生过变化才亮卡；run 结束即定格（对话流交还给快照卡）。
  const [liveCanvasVersion, setLiveCanvasVersion] = useState<number | null>(null);
  const prevStreamingRef = useRef(false);
  const versionAtStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (streaming && !prevStreamingRef.current) {
      versionAtStartRef.current = liveWorkflowArtifact?.version ?? null;
      setLiveCanvasVersion(null);
    }
    if (streaming && liveWorkflowArtifact) {
      if (versionAtStartRef.current !== null && versionAtStartRef.current !== liveWorkflowArtifact.version) {
        setLiveCanvasVersion(liveWorkflowArtifact.version);
      } else if (versionAtStartRef.current === null && liveWorkflowArtifact.version > 0) {
        // run 从零构建：本会话此前没有产物，第一次 upsert 就算「动了」
        versionAtStartRef.current = 0;
        setLiveCanvasVersion(liveWorkflowArtifact.version);
      }
    }
    if (!streaming && prevStreamingRef.current) {
      setLiveCanvasVersion(null);
      versionAtStartRef.current = null;
    }
    prevStreamingRef.current = streaming;
  }, [streaming, liveWorkflowArtifact]);


  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
      <ChatStyles />
      <div
        ref={scrollRef}
        className="chat-scroll"
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: dense
            ? '4px 0 8px'
            : compact
              ? '10px 12px 12px'
              : '18px 24px 24px',
        }}
      >
        <div
          style={{
            maxWidth: compact ? '100%' : CHAT_COLUMN_WIDTH,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {items}
          {streaming && liveCanvasVersion !== null && liveWorkflowArtifact && (
            <LiveCanvasCard artifact={liveWorkflowArtifact} />
          )}
          {showTyping && <TypingIndicator />}
          {queueLength > 0 && streaming && (
            <div
              className="chat-fade"
              style={{
                marginTop: 8,
                fontSize: 12,
                color: CHAT.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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
                }}
              />
              {t('chat.queued', { count: queueLength })}
            </div>
          )}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          title={t('chat.scrollToBottom')}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `1px solid ${CHAT.line}`,
            background: 'var(--g-bg-raised)',
            color: CHAT.textSub,
            boxShadow: '0 3px 10px rgba(20,20,40,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevronDown />
        </button>
      )}
    </div>
  );
};

export default ChatMessageList;
