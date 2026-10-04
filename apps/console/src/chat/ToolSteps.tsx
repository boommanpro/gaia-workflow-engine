/**
 * ToolSteps —— 工具调用的折叠视图。
 *
 * 设计立场：**过程默认折叠**。用户关心的是「结果对不对」，不是「AI 调了哪个函数」。
 * 所以正常路径下这里只是一行灰色小字（已执行 N 步 · 全部成功），
 * 出错时才自动展开、并且用红色把失败那一步标出来。
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconTickCircle,
  IconAlertCircle,
  IconLoading,
} from '@douyinfe/semi-icons';

import type { DisplayMessage, ToolCallEvent } from '../agent/types';
import { t } from '../i18n';
import { CHAT } from './theme';

interface ToolStepsProps {
  messages: DisplayMessage[];
  compact?: boolean;
}

function summarizeArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args || {});
  if (keys.length === 0) return '';
  return keys
    .map((k) => {
      const raw = args[k];
      const value = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      return `${k}: ${value.length > 48 ? `${value.slice(0, 48)}…` : value}`;
    })
    .join('  ·  ');
}

/** 工具结果是不是失败 */
function isFailure(result?: string): boolean {
  if (!result) return false;
  const lower = result.toLowerCase();
  return lower.includes('"error"') || lower.includes('"success":false') || lower.includes('error:');
}

function resultPreview(result?: string, limit = 220): string {
  if (!result) return '';
  let text = result;
  try {
    text = JSON.stringify(JSON.parse(result), null, 2);
  } catch {
    /* 不是 JSON 就原样展示 */
  }
  return text.length > limit ? `${text.slice(0, limit)}\n…` : text;
}

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      fontSize: 11.5,
      lineHeight: 1.6,
      color: CHAT.textSub,
      wordBreak: 'break-all',
      whiteSpace: 'pre-wrap',
    }}
  >
    {children}
  </div>
);

const StepRow: React.FC<{ call: ToolCallEvent; compact?: boolean }> = ({ call, compact }) => {
  const failed = isFailure(call.result);
  const running = call.result === undefined;

  return (
    <div
      style={{
        padding: '8px 12px',
        borderTop: `1px solid ${CHAT.lineSoft}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {running ? (
          <IconLoading
            size="small"
            spin
            style={{ color: CHAT.accent, animation: 'chat-spin .9s linear infinite' }}
          />
        ) : failed ? (
          <IconAlertCircle size="small" style={{ color: CHAT.danger }} />
        ) : (
          <IconTickCircle size="small" style={{ color: CHAT.success }} />
        )}
        <span style={{ fontSize: 12.5, fontWeight: 500, color: failed ? CHAT.danger : CHAT.text }}>
          {call.action}
        </span>
        {running && (
          <span style={{ fontSize: 11.5, color: CHAT.textMuted }}>{t('chat.toolRunning')}</span>
        )}
      </div>
      {summarizeArgs(call.args || {}) && <Mono>{summarizeArgs(call.args || {})}</Mono>}
      {call.result !== undefined && call.result !== '' && (
        <Mono>{resultPreview(call.result)}</Mono>
      )}
    </div>
  );
};

export const ToolSteps: React.FC<ToolStepsProps> = ({ messages, compact }) => {
  const calls = useMemo(
    () => messages.map((m) => m.toolCall).filter((c): c is ToolCallEvent => !!c),
    [messages]
  );
  const results = useMemo(() => messages.filter((m) => !m.toolCall && m.content), [messages]);

  const running = calls.some((c) => c.result === undefined);
  const failed = calls.some((c) => isFailure(c.result));
  const stepCount = calls.length || results.length;

  // 执行中盯一眼（用户此刻在等），出错时也摊开（用户只在这时才真的关心），
  // 顺利结束时收回折叠态 —— 一切正常就不该占地方。
  const [open, setOpen] = useState(running || failed);
  useEffect(() => {
    setOpen(running || failed);
  }, [running, failed]);

  if (calls.length === 0 && results.length === 0) return null;

  const label = running
    ? t('chat.toolStepsRunning', { count: stepCount })
    : failed
      ? t('chat.toolStepsFailed', { count: stepCount })
      : t('chat.toolStepsDone', { count: stepCount });

  return (
    <div className="chat-fade" style={{ padding: compact ? '2px 0' : '4px 0' }}>
      <div
        style={{
          border: `1px solid ${failed ? 'var(--g-danger-soft)' : CHAT.line}`,
          background: failed ? 'var(--g-danger-soft)' : CHAT.bgSunken,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: compact ? '7px 10px' : '8px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          {open ? (
            <IconChevronDown size="small" style={{ color: CHAT.textMuted, flexShrink: 0 }} />
          ) : (
            <IconChevronRight size="small" style={{ color: CHAT.textMuted, flexShrink: 0 }} />
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              color: failed ? CHAT.danger : CHAT.textSub,
            }}
          >
            {running ? (
              <IconLoading size="small" spin style={{ color: CHAT.accent }} />
            ) : failed ? (
              <IconAlertCircle size="small" style={{ color: CHAT.danger }} />
            ) : (
              <IconTickCircle size="small" style={{ color: CHAT.success }} />
            )}
            {label}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: CHAT.textFaint,
              flexShrink: 0,
            }}
          >
            {open ? t('chat.collapseSteps') : t('chat.expandSteps')}
          </span>
        </button>

        {open && (
          <div style={{ borderTop: `1px solid ${failed ? 'var(--g-danger-soft)' : CHAT.line}` }}>
            {calls.map((call, index) => (
              <div key={index} style={index === 0 ? { borderTop: 'none' } : undefined}>
                <StepRow call={call} compact={compact} />
              </div>
            ))}
            {results.map((m, index) => (
              <div
                key={m.id}
                style={{
                  padding: '8px 12px',
                  borderTop: `1px solid ${CHAT.lineSoft}`,
                  background: index % 2 === 1 ? 'var(--g-line-soft)' : 'transparent',
                }}
              >
                <Mono>{resultPreview(m.content)}</Mono>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolSteps;
