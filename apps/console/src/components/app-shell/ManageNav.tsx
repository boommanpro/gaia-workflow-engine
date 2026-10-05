/**
 * ManageNav —— Manage 模式左栏导航。
 *
 * 管理端的四块内容：工作流管理 / 模板管理 / Agent 配置中心 / 会话审查。
 * 与 Chat 模式的会话列表互斥：左栏同一时刻只呈现当前模式的内容。
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';

export type ManageSection = 'workflows' | 'templates' | 'agentConfig' | 'sessions';

const stroke = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconWorkflow = () => (
  <svg {...stroke}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="13" width="7" height="8" rx="1.5" />
    <path d="M10 6.5h4M10 6.5a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2" />
  </svg>
);

const IconTemplate = () => (
  <svg {...stroke}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 9v12" />
  </svg>
);

const IconConfig = () => (
  <svg {...stroke}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconSession = () => (
  <svg {...stroke}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const ITEMS: Array<{ key: ManageSection; labelKey: string; path: string; icon: React.ReactNode }> = [
  { key: 'workflows', labelKey: 'admin.workflows', path: '/manage/workflows', icon: <IconWorkflow /> },
  { key: 'templates', labelKey: 'admin.templates', path: '/manage/templates', icon: <IconTemplate /> },
  { key: 'agentConfig', labelKey: 'agent.config.title', path: '/manage/agent-config', icon: <IconConfig /> },
  { key: 'sessions', labelKey: 'admin.sessions', path: '/manage/sessions', icon: <IconSession /> },
];

/** 从当前路径推导激活的管理分区 */
export const manageSectionFromPath = (pathname: string): ManageSection => {
  if (pathname.startsWith('/manage/templates')) return 'templates';
  if (pathname.startsWith('/manage/agent-config')) return 'agentConfig';
  if (pathname.startsWith('/manage/sessions')) return 'sessions';
  return 'workflows';
};

export const ManageNav: React.FC<{ active?: ManageSection }> = ({ active }) => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = active ?? manageSectionFromPath(location.pathname);

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
      {ITEMS.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              background: isActive ? CHAT.hover : 'transparent',
              boxShadow: isActive ? `inset 0 0 0 1px ${CHAT.line}` : 'none',
              padding: '8px 10px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 400,
              color: CHAT.text,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background .14s, color .14s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = CHAT.hover;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            {item.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t(item.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default ManageNav;
