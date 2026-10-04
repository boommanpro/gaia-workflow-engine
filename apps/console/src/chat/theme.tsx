/**
 * 对话层的设计 token 与全局样式。
 *
 * 交互基调参考成熟的对话式产品（DeepSeek 那一类）：
 *   · 对话是一个「居中的窄栏」，不是铺满整屏的一堆气泡
 *   · AI 的正文不套气泡，直接是排版好的文字；只有用户消息有气泡
 *   · 过程性信息（工具调用 / 思考）默认折叠，用户只在出问题时才展开
 *
 * 配色：token 全部指向 index.css 中的 CSS 变量（--g-*），
 * 从而同一份代码在 light / dark 两种主题下自动切换（Codex 黑白配色）。
 */
import React, { useEffect, useState } from 'react';

export const CHAT = {
  accent: 'var(--g-accent)',
  accentHover: 'var(--g-accent-hover)',
  accentSoft: 'var(--g-accent-soft)',
  accentBorder: 'var(--g-accent-border)',
  /** 强调色上的前景色（light 下为白，dark 下为近黑） */
  accentFg: 'var(--g-accent-fg)',

  text: 'var(--g-text)',
  textBody: 'var(--g-text-body)',
  textSub: 'var(--g-text-sub)',
  textMuted: 'var(--g-text-muted)',
  textFaint: 'var(--g-text-faint)',

  line: 'var(--g-line)',
  lineSoft: 'var(--g-line-soft)',
  bg: 'var(--g-bg)',
  bgApp: 'var(--g-bg-app)',
  bgSunken: 'var(--g-bg-sunken)',
  bgRaised: 'var(--g-bg-raised)',
  hover: 'var(--g-bg-hover)',

  userBubble: 'var(--g-user-bubble)',
  userBubbleText: 'var(--g-user-bubble-text)',

  success: 'var(--g-success)',
  successSoft: 'var(--g-success-soft)',
  danger: 'var(--g-danger)',
  dangerSoft: 'var(--g-danger-soft)',
  warn: 'var(--g-warn)',
  warnSoft: 'var(--g-warn-soft)',

  overlay: 'var(--g-overlay)',
  panelShadow: 'var(--g-panel-shadow)',

  radius: 14,
  radiusSm: 8,
} as const;

/* ------------------------------------------------------------------
 * 主题模式运行时（light / dark）
 * ------------------------------------------------------------------ */
export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'gaia.themeMode';
const THEME_EVENT = 'gaia-theme-change';

export const getThemeMode = (): ThemeMode => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
};

/** 把主题写到 <html data-theme> 与 <body theme-mode>（后者供 Semi 组件跟随） */
export const applyThemeMode = (mode: ThemeMode): void => {
  const root = document.documentElement;
  root.dataset.theme = mode;
  document.body.setAttribute('theme-mode', mode);
};

export const setThemeMode = (mode: ThemeMode): void => {
  applyThemeMode(mode);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
};

/** 在应用挂载前调用，避免首屏闪烁 */
export const initThemeMode = (): void => {
  applyThemeMode(getThemeMode());
};

export const useThemeMode = (): ThemeMode => {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  useEffect(() => {
    const onChange = () => setMode(getThemeMode());
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);
  return mode;
};

/** 对话列最大宽度：窄栏阅读体验，宽屏下不会拉成一整行 */
export const CHAT_COLUMN_WIDTH = 780;
/** 侧边栏形态下的列宽（撑满） */
export const CHAT_COLUMN_WIDTH_COMPACT = 0;

/**
 * 全局样式只注入一次。所有对话相关组件共用，避免逐处 inline 写 hover / 动画。
 */
export const ChatStyles: React.FC = () => (
  <style>{`
    .chat-scroll { scrollbar-width: thin; }
    .chat-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .chat-scroll::-webkit-scrollbar-thumb {
      background: transparent; border-radius: 8px; border: 2px solid transparent;
      background-clip: content-box;
    }
    .chat-scroll:hover::-webkit-scrollbar-thumb { background: var(--g-text-faint); background-clip: content-box; }
    .chat-scroll::-webkit-scrollbar-track { background: transparent; }

    @keyframes chat-spin { to { transform: rotate(360deg); } }
    @keyframes chat-typing {
      0%, 60%, 100% { opacity: .28; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-3px); }
    }
    @keyframes chat-fade-up {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-fade { animation: chat-fade-up .18s ease-out both; }

    /* AI 消息的操作栏：默认隐形，鼠标移上去才出现 */
    .chat-msg-actions { opacity: 0; transition: opacity .14s ease; }
    .chat-msg:hover .chat-msg-actions,
    .chat-msg-actions:focus-within { opacity: 1; }

    /* Markdown 正文 */
    .md-body { font-size: 14px; line-height: 1.75; color: ${CHAT.textBody}; word-break: break-word; }
    .md-body .md-p { margin: 0 0 10px; }
    .md-body .md-p:last-child { margin-bottom: 0; }
    .md-body .md-h { margin: 16px 0 8px; font-weight: 600; line-height: 1.35; color: ${CHAT.text}; }
    .md-body .md-h:first-child { margin-top: 0; }
    .md-body .md-h1 { font-size: 19px; }
    .md-body .md-h2 { font-size: 17px; }
    .md-body .md-h3 { font-size: 15px; }
    .md-body .md-h4, .md-body .md-h5, .md-body .md-h6 { font-size: 14px; }
    .md-body .md-ul, .md-body .md-ol { margin: 8px 0; padding-left: 22px; }
    .md-body .md-ul { list-style: disc; }
    .md-body .md-ol { list-style: decimal; }
    .md-body .md-ul li, .md-body .md-ol li { margin: 3px 0; }
    .md-body .md-inline-code {
      background: ${CHAT.bgSunken}; padding: 1.5px 5px; border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px; color: ${CHAT.danger}; border: 1px solid ${CHAT.lineSoft};
    }
    .md-body .md-code-block {
      background: ${CHAT.bgSunken}; color: ${CHAT.textBody}; border: 1px solid ${CHAT.line};
      border-radius: 10px; padding: 12px 14px; margin: 10px 0; overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px; line-height: 1.6;
    }
    .md-body .md-code-block code { background: transparent; padding: 0; color: inherit; border: none; }
    .md-body .md-quote {
      border-left: 3px solid ${CHAT.accentBorder}; padding: 4px 12px; margin: 10px 0;
      color: ${CHAT.textSub}; background: ${CHAT.bgSunken}; border-radius: 0 8px 8px 0;
    }
    .md-body .md-hr { border: none; border-top: 1px solid ${CHAT.line}; margin: 14px 0; }
    .md-body .md-table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px; }
    .md-body .md-table th { background: ${CHAT.bgSunken}; font-weight: 600; text-align: left; color: ${CHAT.text}; }
    .md-body .md-table th, .md-body .md-table td { border: 1px solid ${CHAT.line}; padding: 7px 10px; }
    .md-body .md-table tbody tr:nth-child(even) { background: ${CHAT.lineSoft}; }
    .md-body .md-link { color: ${CHAT.accent}; text-decoration: none; }
    .md-body .md-link:hover { text-decoration: underline; }
    .md-body strong { font-weight: 600; color: ${CHAT.text}; }
    .md-body em { font-style: italic; }

    /* 选项胶囊：AI 给出的「你可以这样说」 */
    .chat-opt {
      display: block; width: 100%; text-align: left; cursor: pointer;
      padding: 9px 13px; margin-bottom: 6px; border-radius: 10px;
      border: 1px solid ${CHAT.line}; background: ${CHAT.bg};
      color: ${CHAT.textBody}; font-size: 13px; line-height: 1.5;
      font-family: inherit; transition: border-color .14s, background .14s, color .14s;
    }
    .chat-opt:hover:not(:disabled) {
      border-color: ${CHAT.accent}; background: ${CHAT.accentSoft}; color: ${CHAT.accent};
    }
    .chat-opt:disabled { cursor: default; opacity: .55; }
  `}</style>
);
