/**
 * AppShell 专用图标（线性、18px 基准，风格与对话层一致）。
 *
 * 折叠 / 展开用的是 Codex 同款 panel 图标：矩形中一条竖线，
 * 左栏用 PanelLeft（竖线在左），右栏用 PanelRight（竖线在右）。
 */
import React from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconPanelLeft: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <svg {...base} width={size} height={size}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M9 3v18" />
  </svg>
);

export const IconPanelRight: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <svg {...base} width={size} height={size}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <path d="M15 3v18" />
  </svg>
);

export const IconChatLine: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const IconWorkFolder: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.5.7l1 1.2h7.3A2.5 2.5 0 0 1 21 9.4v7.1A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
  </svg>
);

export const IconManageSliders: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="14" cy="18" r="2" />
  </svg>
);

export const IconFolder: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.5.7l1 1.2h7.3A2.5 2.5 0 0 1 21 9.4v7.1A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
  </svg>
);

export const IconTools: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z" />
  </svg>
);
