/**
 * AI 工作区的左侧栏：新建对话 + 会话列表 + 次要入口。
 *
 * 层级态度不变：工作流库、管理后台、产品介绍都是「二级入口」，
 * 主位留给对话 —— 这是 AI 主视角的核心主张。
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus, IconList, IconSetting, IconBookOpenStroked } from '@douyinfe/semi-icons';

import { SessionList } from '../../agent/SessionList';
import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';
import { LanguageToggle } from '../../components/language-toggle';

interface NavEntry {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
}

interface SessionRailProps {
  /** 选中会话（由工作区决定改 URL 还是直接切） */
  onSelectSession?: (sessionKey: string) => void;
  /** 新建会话 */
  onNewSession?: () => void;
}

export const SessionRail: React.FC<SessionRailProps> = ({ onSelectSession, onNewSession }) => {
  useLanguage();
  const navigate = useNavigate();

  const entries: NavEntry[] = [
    { labelKey: 'workspace.workflowLibrary', path: '/admin/workflows', icon: <IconList size="small" /> },
    { labelKey: 'nav.preview', path: '/preview', icon: <IconBookOpenStroked size="small" /> },
    { labelKey: 'workspace.adminConsole', path: '/admin/agent-config', icon: <IconSetting size="small" /> },
  ];

  return (
    <aside
      style={{
        width: 252,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${CHAT.line}`,
        background: CHAT.bgSunken,
        height: '100%',
      }}
    >
      {/* 品牌 */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 14px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${CHAT.accent} 0%, #7b7ff0 100%)`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(77,83,232,0.28)',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 1.8l1.9 5.9 5.9 1.9-5.9 1.9L12 17.4l-1.9-5.9L4.2 9.6l5.9-1.9L12 1.8z" />
            <path d="M18.6 14.4l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" opacity=".65" />
          </svg>
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: CHAT.text, letterSpacing: '-0.01em' }}>
          {t('workspace.brand')}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 600,
            color: CHAT.textMuted,
            background: '#fff',
            border: `1px solid ${CHAT.line}`,
            borderRadius: 5,
            padding: '2px 6px',
            flexShrink: 0,
          }}
        >
          {t('workspace.modeGeneral')}
        </span>
      </div>

      {/* 新建对话 */}
      <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        <Button
          block
          theme="solid"
          type="primary"
          icon={<IconPlus />}
          onClick={onNewSession}
          style={{ borderRadius: 10, background: CHAT.accent, borderColor: CHAT.accent }}
        >
          {t('workspace.newConversation')}
        </Button>
      </div>

      {/* 会话列表 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* 新建入口只保留上方那一个主按钮，列表内部不再重复提供一个 */}
        <SessionList hideChrome onSelect={onSelectSession} />
      </div>

      {/* 二级入口 */}
      <div style={{ borderTop: `1px solid ${CHAT.line}`, padding: 8, flexShrink: 0 }}>
        {entries.map((entry) => (
          <button
            key={entry.path}
            type="button"
            onClick={() => navigate(entry.path)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              border: 'none',
              background: 'transparent',
              padding: '8px 10px',
              borderRadius: 9,
              fontSize: 12.5,
              color: CHAT.textSub,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background .14s, color .14s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = CHAT.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = CHAT.textSub;
            }}
          >
            {entry.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t(entry.labelKey)}
            </span>
          </button>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
          <LanguageToggle />
        </div>
      </div>
    </aside>
  );
};

export default SessionRail;
