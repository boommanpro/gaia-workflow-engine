/**
 * SectionSwitcher —— 左上角三态切换器（Chat / Work / Manage）。
 *
 * 类似 Codex 左上角的模式切换：切换的是「左栏是什么」这件事，
 * 而不是某个页面。切换后进入对应模式的默认路由：
 *   Chat   → /chat     （纯对话）
 *   Work   → /work     （工作空间，文件夹分组的对话）
 *   Manage → /manage   （管理后台：工作流 / 模板 / Agent 配置 / 会话审查）
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAgent } from '../../agent';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';
import { IconChatLine, IconManageSliders, IconWorkFolder } from './icons';

export type SectionMode = 'chat' | 'work' | 'manage';

interface SectionSwitcherProps {
  mode: SectionMode;
}

const ORDER: Array<{ mode: SectionMode; labelKey: string; icon: React.ReactNode }> = [
  { mode: 'chat', labelKey: 'shell.modeChat', icon: <IconChatLine /> },
  { mode: 'work', labelKey: 'shell.modeWork', icon: <IconWorkFolder /> },
  { mode: 'manage', labelKey: 'shell.modeManage', icon: <IconManageSliders /> },
];

export const SectionSwitcher: React.FC<SectionSwitcherProps> = ({ mode }) => {
  useLanguage();
  const navigate = useNavigate();
  const { currentSessionKey } = useAgent();

  const go = (target: SectionMode) => {
    if (target === mode) return;
    if (target === 'chat') {
      navigate(currentSessionKey ? `/chat/${currentSessionKey}` : '/chat');
    } else if (target === 'work') {
      navigate(currentSessionKey ? `/work/c/${currentSessionKey}` : '/work');
    } else {
      navigate('/manage/workflows');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        borderRadius: 10,
        background: CHAT.bgSunken,
        border: `1px solid ${CHAT.lineSoft}`,
      }}
    >
      {ORDER.map((item) => {
        const isActive = item.mode === mode;
        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => go(item.mode)}
            title={t(item.labelKey)}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              border: 'none',
              background: isActive ? 'var(--g-bg-raised)' : 'transparent',
              boxShadow: isActive ? '0 1px 2px rgba(20,20,40,.08)' : 'none',
              padding: '6px 4px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? CHAT.text : CHAT.textMuted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background .14s, color .14s',
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0, color: isActive ? CHAT.accent : 'inherit' }}>
              {item.icon}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t(item.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SectionSwitcher;
