/**
 * ChatWelcome —— 空会话的欢迎态。
 *
 * 不摆一堆功能说明，只干一件事：让用户知道「现在可以说什么」，
 * 并且给几个可以直接点的例子（点一下就真的发出去了）。
 */
import React from 'react';
import { IconArrowRight } from '@douyinfe/semi-icons';

import { t } from '../i18n';
import { CHAT } from './theme';

const Spark: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 1.8l1.9 5.9 5.9 1.9-5.9 1.9L12 17.4l-1.9-5.9L4.2 9.6l5.9-1.9L12 1.8z" />
    <path d="M18.6 14.4l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" opacity=".65" />
  </svg>
);

interface ChatWelcomeProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onPick?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  title,
  description,
  suggestions = [],
  onPick,
  disabled = false,
  compact = false,
}) => (
  <div
    style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? '24px 12px' : '48px 24px',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: compact ? 44 : 52,
        height: compact ? 44 : 52,
        borderRadius: compact ? 14 : 16,
        background: `linear-gradient(135deg, ${CHAT.accent} 0%, #7b7ff0 100%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 6px 18px rgba(77,83,232,0.26)',
      }}
    >
      <Spark />
    </div>

    <div
      style={{
        fontSize: compact ? 16 : 20,
        fontWeight: 600,
        color: CHAT.text,
        letterSpacing: '-0.01em',
        marginBottom: 8,
      }}
    >
      {title ?? t('chat.welcomeTitle')}
    </div>
    <div
      style={{
        fontSize: compact ? 12.5 : 13.5,
        color: CHAT.textMuted,
        lineHeight: 1.7,
        maxWidth: 460,
        marginBottom: suggestions.length > 0 ? 24 : 0,
      }}
    >
      {description ?? t('chat.welcomeDesc')}
    </div>

    {suggestions.length > 0 && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
          gap: 10,
          width: '100%',
          maxWidth: compact ? 420 : 620,
        }}
      >
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(text)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              textAlign: 'left',
              padding: compact ? '11px 13px' : '13px 15px',
              border: `1px solid ${CHAT.line}`,
              borderRadius: 12,
              background: '#fff',
              color: CHAT.textBody,
              fontSize: compact ? 12.5 : 13,
              lineHeight: 1.55,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color .15s, box-shadow .15s, transform .15s',
            }}
            onMouseEnter={(e) => {
              if (disabled) return;
              e.currentTarget.style.borderColor = CHAT.accent;
              e.currentTarget.style.boxShadow = '0 3px 12px rgba(77,83,232,0.12)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              const icon = e.currentTarget.querySelector('.welcome-arrow') as HTMLElement | null;
              if (icon) icon.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = CHAT.line;
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
              const icon = e.currentTarget.querySelector('.welcome-arrow') as HTMLElement | null;
              if (icon) icon.style.opacity = '0';
            }}
          >
            <span>{text}</span>
            <span
              className="welcome-arrow"
              style={{
                color: CHAT.accent,
                opacity: 0,
                transition: 'opacity .15s',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <IconArrowRight size="small" />
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default ChatWelcome;
