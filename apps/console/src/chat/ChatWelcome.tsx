/**
 * WelcomeGreeting —— 欢迎态的问候头（Gaia logo + 标题 + 一句副标题）。
 *
 * 输入卡是欢迎页的主角，问候只负责给出「现在可以说什么」的一句话语境；
 * 不再摆示例按钮与设置面板（设置收敛进输入卡顶部的 NewTaskChips）。
 */
import React from 'react';

import logo from '../assets/logo.svg';
import { t } from '../i18n';
import { CHAT } from './theme';

export const WelcomeGreeting: React.FC = () => (
  <div style={{ textAlign: 'center', marginBottom: 32 }}>
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 16,
        border: `1px solid ${CHAT.lineSoft}`,
        background: 'var(--g-bg-raised)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 1px 3px rgba(20,20,40,.05)',
        overflow: 'hidden',
      }}
    >
      <img src={logo} alt="Gaia" style={{ width: 40, height: 40, display: 'block' }} />
    </div>
    <div
      style={{
        fontSize: 'clamp(22px, 1.45vw, 30px)',
        fontWeight: 600,
        color: CHAT.text,
        letterSpacing: '-0.01em',
        marginBottom: 9,
      }}
    >
      {t('workspace.greeting')}
    </div>
    <div style={{ fontSize: 'clamp(14px, 0.85vw, 16px)', color: CHAT.textMuted, lineHeight: 1.7 }}>
      {t('workspace.greetingDesc')}
    </div>
  </div>
);

export default WelcomeGreeting;
