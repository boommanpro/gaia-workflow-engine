/**
 * 全站共用的顶部导航（首页 / 预览 / API 文档 / 调用看板都走这一个）。
 *
 * 统一的意义：这几个页面在用户眼里是「同一层级的站点页面」，
 * 之前首页自绘一套、内容页用另一套，点一下就换了壳，观感像换了个产品。
 * 现在同一个 header、同一组入口，只有「当前项高亮」和「是否显示开始对话 CTA」不同。
 *
 * 桌面端横向展开，移动端折叠为抽屉；层级清晰、留白充足。
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage, t } from '../i18n';
import { LanguageToggle } from './language-toggle';

const ACCENT = '#4d53e8';

const LINKS: { key: string; path: string }[] = [
  { key: 'nav.preview', path: '/preview' },
  { key: 'nav.apiDocs', path: '/docs' },
  { key: 'nav.dashboard', path: '/dashboard' },
  { key: 'landing.admin', path: '/admin/workflows' },
];

const BrandMark: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 9,
        background: `linear-gradient(135deg, ${ACCENT} 0%, #7b7ff0 100%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(77,83,232,0.28)',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 1.8l1.9 5.9 5.9 1.9-5.9 1.9L12 17.4l-1.9-5.9L4.2 9.6l5.9-1.9L12 1.8z" />
        <path d="M18.6 14.4l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" opacity=".65" />
      </svg>
    </div>
    <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Gaia</span>
  </div>
);

export const ContentTopNav: React.FC<{
  /** 当前高亮的路径；不传则按 location 自动判断 */
  active?: string;
  /** 是否显示「开始对话」CTA；首页自身不需要 */
  showCta?: boolean;
}> = ({ active, showCta = true }) => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => active === path || location.pathname.startsWith(path);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0f0f2',
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate('/')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <BrandMark />
        </button>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                color: isActive(l.path) ? ACCENT : '#555',
                background: isActive(l.path) ? '#f3f3ff' : 'transparent',
              }}
            >
              {t(l.key)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {showCta && (
            <button
              onClick={() => navigate('/')}
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white sm:block"
              style={{ background: ACCENT }}
            >
              {t('landing.workspace')}
            </button>
          )}
          <LanguageToggle />
          {/* 移动端抽屉开关 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#eee] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* 移动端下拉抽屉 */}
      {open && (
        <div className="border-t border-[#f0f0f2] bg-white px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => {
                navigate(l.path);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium"
              style={{ color: isActive(l.path) ? ACCENT : '#333', background: isActive(l.path) ? '#f3f3ff' : 'transparent' }}
            >
              {t(l.key)}
            </button>
          ))}
          {showCta && (
            <button
              onClick={() => {
                navigate('/');
                setOpen(false);
              }}
              className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white"
              style={{ background: ACCENT }}
            >
              {t('landing.workspace')}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default ContentTopNav;
