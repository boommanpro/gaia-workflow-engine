/**
 * WorkRail —— Work 模式左栏。
 *
 * Work 的定位是「带文件夹分组的对话」：文件夹里的对话共享产物与上下文记忆。
 * Phase 1 前端先行：先给出文件夹区的结构占位，下面平铺全部会话，
 * 待后端 workspace 表就绪后把会话按文件夹归类即可，交互形态不再变。
 */
import React from 'react';

import { SessionList } from '../../agent/SessionList';
import { CHAT } from '../../chat/theme';
import { useLanguage, t } from '../../i18n';
import { IconFolder } from './icons';

interface WorkRailProps {
  onSelect: (sessionKey: string) => void;
}

export const WorkRail: React.FC<WorkRailProps> = ({ onSelect }) => {
  useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 文件夹区（Phase 1 占位） */}
      <div style={{ padding: '2px 12px 6px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: CHAT.textFaint,
            padding: '0 2px 6px',
          }}
        >
          <IconFolder />
          <span>{t('shell.workFolders')}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 9,
            border: `1px dashed ${CHAT.line}`,
            fontSize: 12,
            color: CHAT.textFaint,
          }}
        >
          {t('shell.workNoFolder')}
        </div>
      </div>

      {/* 全部会话 */}
      <div
        style={{
          padding: '4px 14px 4px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: CHAT.textFaint,
          flexShrink: 0,
        }}
      >
        {t('shell.workAllSessions')}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <SessionList hideChrome onSelect={onSelect} />
      </div>
    </div>
  );
};

export default WorkRail;
