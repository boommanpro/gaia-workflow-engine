/**
 * UserMenu —— 左栏底部「头像 + 名称」账户入口（Codex 风格）。
 *
 * 点击后在按钮上方弹出账户面板：
 *   · 顶部：本地头像 + 名称
 *   · 语言 / 主题：右侧显示当前值，悬停或点击展开右侧子菜单（与 Codex 一致）
 *   · 设置 / 退出登录
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useLanguage, setLanguage, t } from '../../i18n';
import { CHAT, useThemeMode, setThemeMode, type ThemeMode } from '../../chat/theme';
import avatarUrl from '../../assets/boommanpro.png';

/* ---------------- 图标 ---------------- */

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const Chevron: React.FC<{ up?: boolean; dir?: 'down' | 'right' }> = ({ up, dir = 'down' }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: dir === 'right' ? 'rotate(-90deg)' : up ? 'rotate(180deg)' : 'none',
      transition: 'transform .15s',
      flexShrink: 0,
    }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const Check: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const GlobeIcon: React.FC = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
  </Svg>
);

const SunIcon: React.FC = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

const MoonIcon: React.FC = () => (
  <Svg>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </Svg>
);

const GearIcon: React.FC = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Svg>
);

const ExitIcon: React.FC = () => (
  <Svg>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);

/* ---------------- 样式 ---------------- */

const rowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  border: 'none',
  background: 'transparent',
  color: CHAT.textBody,
  padding: '7px 8px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};

const submenuStyle: React.CSSProperties = {
  position: 'absolute',
  left: 'calc(100% + 8px)',
  top: -6,
  minWidth: 152,
  background: CHAT.bgRaised,
  border: `1px solid ${CHAT.line}`,
  borderRadius: 12,
  boxShadow: CHAT.panelShadow,
  padding: 6,
  zIndex: 1300,
};

const HoverRow: React.FC<{
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
}> = ({ onClick, onMouseEnter, onMouseLeave, active, children, title }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => {
        setHover(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setHover(false);
        onMouseLeave?.();
      }}
      style={{ ...rowStyle, background: hover || active ? CHAT.hover : 'transparent' }}
    >
      {children}
    </button>
  );
};

/* ---------------- 组件 ---------------- */

type SubKey = 'language' | 'theme';

export const UserMenu: React.FC = () => {
  const lang = useLanguage();
  const theme = useThemeMode();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<SubKey | null>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 面板渲染到 body（portal），定位锚定在触发按钮上方，避免被左栏 overflow:hidden 裁切
  const updatePos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8, width: Math.max(rect.width, 236) });
  }, []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onReflow = () => updatePos();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setOpenSub(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setOpenSub(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = t('shell.userName');

  const langOptions: Array<{ value: 'zh' | 'en'; label: string }> = [
    { value: 'zh', label: t('shell.languageZh') },
    { value: 'en', label: t('shell.languageEn') },
  ];
  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: t('shell.themeLight') },
    { value: 'dark', label: t('shell.themeDark') },
  ];
  const langLabel = lang === 'zh' ? t('shell.languageZh') : t('shell.languageEn');
  const themeLabel = theme === 'dark' ? t('shell.themeDark') : t('shell.themeLight');

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={name}
        style={{
          ...rowStyle,
          background: open ? CHAT.bgRaised : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = CHAT.bgRaised;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${CHAT.line}` }}
        />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: CHAT.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ display: 'flex', color: CHAT.textMuted }}>
          <Chevron up={open} />
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: pos.left,
              bottom: pos.bottom,
              width: pos.width,
              background: CHAT.bgRaised,
              border: `1px solid ${CHAT.line}`,
              borderRadius: 14,
              boxShadow: CHAT.panelShadow,
              padding: 6,
              zIndex: 1400,
            }}
          >
          {/* 账户信息 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
            <img
              src={avatarUrl}
              alt={name}
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${CHAT.line}` }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: CHAT.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: 11.5, color: CHAT.textMuted }}>{t('shell.localAccount')}</div>
            </div>
          </div>

          <div style={{ height: 1, background: CHAT.lineSoft, margin: '0 4px 6px' }} />

          {/* 语言 */}
          <div
            style={{ position: 'relative' }}
            onMouseLeave={() => setOpenSub((v) => (v === 'language' ? null : v))}
          >
            <HoverRow
              onClick={() => setOpenSub((v) => (v === 'language' ? null : 'language'))}
              onMouseEnter={() => setOpenSub('language')}
              active={openSub === 'language'}
            >
              <span style={{ display: 'flex', color: CHAT.textSub }}>
                <GlobeIcon />
              </span>
              <span style={{ flex: 1, color: CHAT.text }}>{t('shell.language')}</span>
              <span style={{ fontSize: 12.5, color: CHAT.textMuted }}>{langLabel}</span>
              <span style={{ display: 'flex', color: CHAT.textMuted }}>
                <Chevron dir="right" />
              </span>
            </HoverRow>

            {openSub === 'language' && (
              <div style={submenuStyle}>
                {langOptions.map((item) => {
                  const selected = item.value === lang;
                  return (
                    <HoverRow
                      key={item.value}
                      onClick={() => {
                        setLanguage(item.value);
                        setOpen(false);
                        setOpenSub(null);
                      }}
                    >
                      <span style={{ flex: 1, color: selected ? CHAT.text : CHAT.textBody, fontWeight: selected ? 600 : 400 }}>
                        {item.label}
                      </span>
                      {selected && (
                        <span style={{ display: 'flex', color: CHAT.accent }}>
                          <Check />
                        </span>
                      )}
                    </HoverRow>
                  );
                })}
              </div>
            )}
          </div>

          {/* 主题 */}
          <div
            style={{ position: 'relative' }}
            onMouseLeave={() => setOpenSub((v) => (v === 'theme' ? null : v))}
          >
            <HoverRow
              onClick={() => setOpenSub((v) => (v === 'theme' ? null : 'theme'))}
              onMouseEnter={() => setOpenSub('theme')}
              active={openSub === 'theme'}
            >
              <span style={{ display: 'flex', color: CHAT.textSub }}>
                {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
              </span>
              <span style={{ flex: 1, color: CHAT.text }}>{t('shell.theme')}</span>
              <span style={{ fontSize: 12.5, color: CHAT.textMuted }}>{themeLabel}</span>
              <span style={{ display: 'flex', color: CHAT.textMuted }}>
                <Chevron dir="right" />
              </span>
            </HoverRow>

            {openSub === 'theme' && (
              <div style={submenuStyle}>
                {themeOptions.map((item) => {
                  const selected = item.value === theme;
                  return (
                    <HoverRow
                      key={item.value}
                      onClick={() => {
                        setThemeMode(item.value);
                        setOpen(false);
                        setOpenSub(null);
                      }}
                    >
                      <span style={{ flex: 1, color: selected ? CHAT.text : CHAT.textBody, fontWeight: selected ? 600 : 400 }}>
                        {item.label}
                      </span>
                      {selected && (
                        <span style={{ display: 'flex', color: CHAT.accent }}>
                          <Check />
                        </span>
                      )}
                    </HoverRow>
                  );
                })}
              </div>
            )}
          </div>

          {/* 设置 */}
          <HoverRow
            onClick={() => {
              setOpen(false);
              navigate('/manage/agent-config');
            }}
          >
            <span style={{ display: 'flex', color: CHAT.textSub }}>
              <GearIcon />
            </span>
            <span style={{ flex: 1, color: CHAT.text }}>{t('shell.settings')}</span>
          </HoverRow>

          <div style={{ height: 1, background: CHAT.lineSoft, margin: '6px 4px' }} />

          {/* 退出登录 */}
          <HoverRow
            onClick={() => {
              setOpen(false);
            }}
          >
            <span style={{ display: 'flex', color: CHAT.textSub }}>
              <ExitIcon />
            </span>
            <span style={{ flex: 1, color: CHAT.text }}>{t('shell.signOut')}</span>
          </HoverRow>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default UserMenu;
