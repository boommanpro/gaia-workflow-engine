/**
 * WorkToolsPanel —— Work 模式右栏「工具」面板。
 *
 * Phase 1：把工作空间常用的几个入口聚合在这里（画布、工作流、Agent 配置），
 * 后续接入 workspace 级共享产物后，这里再扩展为真正的工具集。
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';
import { IconFolder, IconManageSliders, IconPanelRight, IconWorkFolder } from '../../components/app-shell/icons';

interface WorkToolsPanelProps {
  onClose: () => void;
}

export const WorkToolsPanel: React.FC<WorkToolsPanelProps> = ({ onClose }) => {
  useLanguage();
  const navigate = useNavigate();

  const items: Array<{ key: string; labelKey: string; icon: React.ReactNode; path: string }> = [
    { key: 'workflows', labelKey: 'admin.workflows', icon: <IconWorkFolder />, path: '/manage/workflows' },
    { key: 'templates', labelKey: 'admin.templates', icon: <IconFolder />, path: '/manage/templates' },
    { key: 'agent', labelKey: 'agent.config.title', icon: <IconManageSliders />, path: '/manage/agent-config' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: CHAT.bg }}>
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 16px',
          borderBottom: `1px solid ${CHAT.lineSoft}`,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: CHAT.text }}>{t('shell.tools')}</span>
        <button
          type="button"
          onClick={onClose}
          title={t('shell.collapseInspector')}
          aria-label={t('shell.collapseInspector')}
          style={{
            width: 26,
            height: 26,
            border: 'none',
            borderRadius: 7,
            background: 'transparent',
            color: CHAT.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconPanelRight />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10 }}>
        {items.map((item) => (
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
              background: 'transparent',
              padding: '9px 10px',
              borderRadius: 9,
              fontSize: 13,
              color: CHAT.textBody,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = CHAT.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ display: 'flex', color: CHAT.textMuted, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t(item.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WorkToolsPanel;
