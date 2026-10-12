/**
 * AskCard — ask_user 工具的交互卡片（对标 dsh/OWB 的 ask 交互）。
 *
 * 模型需要用户选择/确认/补充信息时调用 ask_user，后端挂起等待；
 * 这里渲染问题 + 选项按钮 + 自由输入，作答即唤醒挂起的工具调用继续 run。
 * 已答状态收敛为只读（其他窗口代答时由 ask_resolved 事件同步）。
 */
import React, { useState } from 'react';

import { agentApi } from '../agent/api';
import { useLanguage, t } from '../i18n';
import { CHAT } from './theme';

export const AskCard: React.FC<{
  ask: { askId: string; question: string; options?: string[]; answered?: boolean; answer?: string };
  sessionKey?: string;
}> = ({ ask, sessionKey }) => {
  useLanguage();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const answered = !!ask.answered;

  const answer = async (text: string) => {
    if (!text.trim() || !sessionKey || answered || sending) return;
    setSending(true);
    try {
      await agentApi.answerAsk(sessionKey, ask.askId, text.trim());
      // 收敛态由 ask_resolved 事件回填（与其它窗口一致），本地乐观禁用即可
    } catch {
      setSending(false);
    }
  };

  return (
    <div
      className="chat-fade"
      style={{
        margin: '6px 0',
        padding: '12px 14px',
        borderRadius: 12,
        border: `1px solid ${answered ? CHAT.line : CHAT.accentBorder}`,
        background: 'var(--g-bg-raised)',
        maxWidth: 560,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: answered ? 8 : 10 }}>
        <span style={{ fontSize: 13, lineHeight: '20px' }}>🙋</span>
        <div style={{ fontSize: 13.5, lineHeight: 1.65, color: CHAT.textBody, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {ask.question}
        </div>
      </div>

      {answered ? (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '7px 10px', borderRadius: 8,
            background: CHAT.successSoft, color: CHAT.success, fontSize: 12.5, lineHeight: 1.6,
          }}
        >
          <span style={{ flexShrink: 0 }}>✓</span>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {t('chat.askAnswered')}：{ask.answer}
          </span>
        </div>
      ) : (
        <>
          {(ask.options || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {ask.options!.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={sending}
                  onClick={() => void answer(option)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: sending ? 'default' : 'pointer',
                    padding: '8px 12px', borderRadius: 9,
                    border: `1px solid ${CHAT.line}`, background: CHAT.bg,
                    color: CHAT.textBody, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
                    transition: 'border-color .14s, background .14s',
                    opacity: sending ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!sending) { e.currentTarget.style.borderColor = CHAT.accent; e.currentTarget.style.background = CHAT.hover; } }}
                  onMouseLeave={(e) => { if (!sending) { e.currentTarget.style.borderColor = CHAT.line; e.currentTarget.style.background = CHAT.bg; } }}
                >
                  {option}
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
