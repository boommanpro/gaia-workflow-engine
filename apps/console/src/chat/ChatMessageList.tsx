/**
 * ChatMessageList —— 对话正文的渲染层（通用模式与专家模式共用）。
 *
 * 与旧实现的差别，就是「用户视角」这个字：
 *   · AI 的正文不套气泡，直接排版；只有用户消息是气泡（右对齐）
 *   · 工具调用 / 计划 / 子代理全部走折叠视图，不把过程糊在脸上
 *   · 复制、调试这类动作收成 hover 才出现的小图标
 *   · 对话居中成一条窄栏，宽屏不会拉成一整行
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip, Toast } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconChevronDown,
  IconTerminal,
} from '@douyinfe/semi-icons';

import { useAgent } from '../agent/AgentContext';
import type { DisplayMessage } from '../agent/types';
import Markdown from '../agent/Markdown';
import SubagentCard from '../agent/SubagentCard';
import { PlanCard } from '../agent/PlanCard';
import { useLanguage, t } from '../i18n';
import { useWorkflowDocumentState, workflowDocumentStore } from '../document';
import type { CanvasSnapshot } from '../document';
import { CHAT, CHAT_COLUMN_WIDTH, ChatStyles } from './theme';
import { ToolSteps } from './ToolSteps';
import { CanvasSnapshotCard } from './CanvasSnapshotCard';

/** AI 头像用的四角星，比通用图标更能指向「这是模型说的话」 */
const Spark: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 1.8l1.9 5.9 5.9 1.9-5.9 1.9L12 17.4l-1.9-5.9L4.2 9.6l5.9-1.9L12 1.8z" />
    <path d="M18.6 14.4l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" opacity=".65" />
  </svg>
);

const Avatar: React.FC = () => (
  <div
    style={{
      width: 26,
      height: 26,
      borderRadius: 9,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--g-bg-raised)',
      background: `linear-gradient(135deg, ${CHAT.accent} 0%, var(--g-accent-hover) 100%)`,
      boxShadow: '0 2px 6px rgba(77,83,232,0.24)',
    }}
  >
    <Spark />
  </div>
);

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
  <div className="chat-fade" style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
    <Avatar />
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 7 }}>
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
  </div>
);

interface ChatMessageListProps {
  /** 侧边栏等窄容器使用 */
  compact?: boolean;
  /** 关闭底部留白（专家模式侧边栏已经由外层留白） */
  dense?: boolean;
  /**
   * 点击快照卡上的「查看」。通用模式用来展开右侧产物面板并定位到这一版；
   * 专家模式用来把视线拉回画布。不传则只做回滚，不做跳转。
   */
  onSnapshotView?: (snapshot: CanvasSnapshot) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  compact = false,
  dense = false,
  onSnapshotView,
}) => {
  const { messages, streaming, sendMessage, queueLength } = useAgent();
  useLanguage();
  const { snapshots, cursor } = useWorkflowDocumentState();

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

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

  /** 消息 id → 它产出的画布快照（含失败轮）。一条消息理论上只会有一张，但保留数组更稳。 */
  const snapshotsByMessage = useMemo(() => {
    const map = new Map<string, { snapshot: CanvasSnapshot; versionNo: number }[]>();
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.messageId) return;
      const list = map.get(snapshot.messageId) || [];
      list.push({ snapshot, versionNo: index + 1 });
      map.set(snapshot.messageId, list);
    });
    return map;
  }, [snapshots]);

  const currentSnapshotId = snapshots[cursor]?.id;

  /** 渲染某条消息下面的画布快照卡 */
  const cardsFor = useCallback(
    (messageId: string): React.ReactNode[] => {
      const entries = snapshotsByMessage.get(messageId);
      if (!entries || entries.length === 0) return [];
      return entries.map(({ snapshot, versionNo }) => (
        <CanvasSnapshotCard
          key={snapshot.id}
          snapshot={snapshot}
          versionNo={versionNo}
          isCurrent={snapshot.id === currentSnapshotId}
          compact={compact}
          {...(onSnapshotView ? { onView: () => onSnapshotView(snapshot) } : {})}
          onRollback={() => workflowDocumentStore.rollbackTo(snapshot.id)}
          onRetry={() => void sendMessage(t('chat.snapshotRetryPrompt'))}
        />
      ));
    },
    [snapshotsByMessage, currentSnapshotId, compact, onSnapshotView, sendMessage]
  );

  /** 把连续的工具消息切成一「组」，交给 ToolSteps 折叠渲染 */
  const items = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < messages.length) {
      const m = messages[i];

      if (m.role === 'assistant' && !m.content && !m.thinking && !m.subagentSteps && !m.subagentResult) {
        // 空的助手占位消息不渲染正文，但它的画布快照卡仍需渲染
        //（AI 工具在第一轮就写入了快照，mid 指向这个占位消息）
        nodes.push(...cardsFor(m.id));
        i += 1;
        continue;
      }

      if (m.subagentSteps || m.subagentResult) {
        nodes.push(<SubagentCard key={`sub-${m.id}`} message={m} />);
        i += 1;
        continue;
      }

      if (m.role === 'tool') {
        if (m.planSteps && m.planSteps.length > 0) {
          nodes.push(<PlanCard key={m.id} steps={m.planSteps} />);
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
          // 画布快照卡跟在产出它的工具调用后面 —— 用户先看到「做了什么」，再看「图变成了什么样」
          for (const gm of group) nodes.push(...cardsFor(gm.id));
        }
        continue;
      }

      if (m.role === 'user') {
        nodes.push(
          <div key={m.id} className="chat-fade" style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0' }}>
            <div style={{ maxWidth: compact ? '88%' : '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {m.content && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 5px 16px',
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

      // assistant
      nodes.push(
        <div
          key={m.id}
          className="chat-msg chat-fade"
          style={{ display: 'flex', gap: compact ? 8 : 10, padding: '6px 0', alignItems: 'flex-start' }}
        >
          <Avatar />
          <div style={{ flex: 1, minWidth: 0 }}>
            {m.thinking && (
              <details
                style={{
                  marginBottom: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: `1px dashed ${CHAT.line}`,
                  background: 'var(--g-bg-raised, transparent)',
                  fontSize: 12,
                  color: CHAT.textMuted,
                }}
              >
                <summary style={{ cursor: 'pointer', userSelect: 'none' }}>思考过程</summary>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, lineHeight: 1.6 }}>{m.thinking}</div>
              </details>
            )}
            <Markdown
              content={m.content}
              onOptionClick={handleOptionClick}
              optionsDisabled={streaming}
              optionsRetired={!!lastAssistantId && m.id !== lastAssistantId}
            />
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
            </div>
          </div>
        </div>
      );
      nodes.push(...cardsFor(m.id));
      i += 1;
    }
    return nodes;
  }, [messages, compact, streaming, lastAssistantId, handleOptionClick, copyMessage, openDebug, cardsFor]);

  const lastMsg = messages[messages.length - 1];
  const showTyping = streaming && !!lastMsg && lastMsg.role === 'assistant' && !lastMsg.content;

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
