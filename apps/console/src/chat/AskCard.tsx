/**
 * AskCard — ask_user 工具的交互卡片（对标 dsh/OWB 的 ask 交互）。
 *
 * 模型需要用户选择/确认/补充信息时调用 ask_user，后端挂起等待；
 * 这里渲染问题 + 选项按钮 + 自由输入，作答即唤醒挂起的工具调用继续 run。
 * 已答状态收敛为只读（其他窗口代答时由 ask_resolved 事件同步）。
 *
 * options 兼容两种形态：字符串（旧数据）与 {label, detail}（工具 schema 的
 * 规范形态）——统一经 normalizeAskOptions 归一化，原始条目绝不能直接进 JSX
 * （对象子节点会让 React 抛 "Objects are not valid as a React child" 炸掉整页）。
 */
import React, { useState } from 'react';

import { agentApi } from '../agent/api';
import { normalizeAskOptions, type AskCardData } from '../agent/types';
import { useLanguage, t } from '../i18n';
import { CHAT } from './theme';

export const AskCard: React.FC<{
  ask: AskCardData;
  sessionKey?: string;
}> = ({ ask, sessionKey }) => {
  useLanguage();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expired, setExpired] = useState(false);
  const answered = !!ask.answered;
  const options = normalizeAskOptions(ask.options);
  const closed = answered || expired;

  const answer = async (text: string) => {
    if (!text.trim() || !sessionKey || closed || sending) return;
    setSending(true);
    try {
      await agentApi.answerAsk(sessionKey, ask.askId, text.trim());
      // 收敛态由 ask_resolved 事件回填（与其它窗口一致），本地乐观禁用即可
    } catch (e) {
      setSending(false);
      // 提问已不存在（超时/运行停止后端已摘除）：卡片收敛为失效，别让按钮永远转圈
      if (/404/.test(String((e as Error)?.message || ''))) setExpired(true);
    }
  };

  return (
    <div
      className="chat-fade"
      style={{
        margin: '6px 0',
        padding: '13px 15px',
        borderRadius: 14,
        border: `1px solid ${closed ? CHAT.line : CHAT.accentBorder}`,
        background: 'var(--g-bg-raised)',
        boxShadow: '0 1px 3px rgba(20, 20, 40, 0.05)',
        maxWidth: 560,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: closed ? 8 : 11 }}>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            flexShrink: 0,
            marginTop: 1,
            background: CHAT.accentSoft,
            border: `1px solid ${CHAT.accentBorder}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: CHAT.textSub,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <div style={{ fontSize: 13.5, lineHeight: 1.65, color: CHAT.textBody, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {ask.question}
        </div>
      </div>

      {answered ? (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '7px 10px', borderRadius: 8,
            background: ask.auto ? CHAT.hover : CHAT.successSoft,
            color: ask.auto ? CHAT.textSub : CHAT.success, fontSize: 12.5, lineHeight: 1.6,
          }}
        >
          <span style={{ flexShrink: 0 }}>{ask.auto ? '⌛' : '✓'}</span>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {ask.auto ? t('chat.askAutoAnswered') : t('chat.askAnswered')}：{ask.answer}
          </span>
        </div>
      ) : expired ? (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '7px 10px', borderRadius: 8,
            background: CHAT.hover, color: CHAT.textSub, fontSize: 12.5, lineHeight: 1.6,
          }}
        >
          <span style={{ flexShrink: 0 }}>⌛</span>
          <span>{t('chat.askExpired')}</span>
        </div>
      ) : (
        <>
          {options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {options.map((option, idx) => (
                <button
                  key={`${ask.askId}-opt-${idx}`}
                  type="button"
                  disabled={sending}
                  onClick={() => void answer(option.label)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: sending ? 'default' : 'pointer',
                    padding: '8px 12px', borderRadius: 9,
                    border: `1px solid ${option.recommended ? CHAT.accentBorder : CHAT.line}`,
                    background: CHAT.bg,
                    color: CHAT.textBody, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
                    transition: 'border-color .14s, background .14s',
                    opacity: sending ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!sending) { e.currentTarget.style.borderColor = CHAT.accent; e.currentTarget.style.background = CHAT.hover; } }}
                  onMouseLeave={(e) => { if (!sending) { e.currentTarget.style.borderColor = option.recommended ? CHAT.accentBorder : CHAT.line; e.currentTarget.style.background = CHAT.bg; } }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {option.label}
                    {option.recommended && (
                      <span
                        style={{
                          flexShrink: 0, padding: '1px 6px', borderRadius: 999,
                          border: `1px solid ${CHAT.accentBorder}`, background: CHAT.accentSoft,
                          color: CHAT.textSub, fontSize: 10.5, lineHeight: 1.5,
                        }}
                      >
                        {t('chat.askRecommended')}
                      </span>
                    )}
                  </span>
                  {option.detail && (
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: CHAT.textSub }}>
                      {option.detail}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              disabled={sending}
              placeholder={t('chat.askInputPlaceholder')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void answer(input); } }}
              style={{
                flex: 1, minWidth: 0, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit',
                border: `1px solid ${CHAT.line}`, borderRadius: 8, outline: 'none',
                background: CHAT.bg, color: CHAT.text,
              }}
            />
            <button
              type="button"
              disabled={sending || !input.trim()}
              onClick={() => void answer(input)}
              style={{
                padding: '7px 14px', fontSize: 13, fontFamily: 'inherit', cursor: input.trim() && !sending ? 'pointer' : 'default',
                border: 'none', borderRadius: 8, background: CHAT.accent, color: CHAT.accentFg,
                opacity: input.trim() && !sending ? 1 : 0.5,
              }}
            >
              {sending ? '…' : t('chat.askSubmit')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AskCard;
