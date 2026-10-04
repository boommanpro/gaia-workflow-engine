/**
 * 全站共用的顶部导航（首页 / API 文档等走这一个）。
 *
 * 两种形态：
 *  1) 常规站点页（文档等）：导航为站点入口（管理后台）；
 *  2) 首页：传入 `tabs`，把「对话 / 在线演示 / 发布日志」直接作为顶部 tab，
 *     站点入口（管理后台）移到右侧保留。
 *
 * 右侧统一挂载服务端连接状态灯，桌面端横向展开，移动端折叠为抽屉。
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage, t } from '../i18n';
import { LanguageToggle } from './language-toggle';
import { ConnectionStatus } from './ConnectionStatus';
import { publicPath } from '../utils/public-path';

const ACCENT = '#4d53e8';

/**
 * 常规站点入口。
 * 「预览」「API 文档」「调用看板」不再是独立站点页：在线演示/发布日志收进首页 tab，
 * API 文档收敛到工作流管理行内按钮，这里只保留管理后台。
 */
const LINKS: { key: string; path: string }[] = [
  { key: 'landing.admin', path: '/admin/workflows' },
];

/** 品牌标识：使用项目原版 G 节点 logo（尺寸与管理后台一致），不再用 AI 生成的星形图标 */
const BrandMark: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <img src={publicPath('logo.svg')} alt="Gaia" style={{ width: 48, height: 48 }} />
    <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Gaia</span>
  </div>
);

export const ContentTopNav: React.FC<{
  /** 当前高亮的路径；不传则按 location 自动判断 */
  active?: string;
  /** 是否显示「开始对话」CTA；首页自身不需要 */
  showCta?: boolean;
  /** 首页 tab 模式：把 tabs 作为顶部导航（对话 / 在线演示 / 发布日志） */
  tabs?: { key: string; labelKey: string }[];
  /** 当前选中的 tab key */
  activeTab?: string;
  /** tab 切换回调 */
  onTabChange?: (key: string) => void;
}> = ({ active, showCta = true, tabs, activeTab, onTabChange }) => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => active === path || location.pathname.startsWith(path);
  const hasTabs = !!tabs && tabs.length > 0;

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

        {/* 桌面端：首页为顶部 tab，站点页为常规导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {hasTabs
            ? tabs!.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => onTabChange?.(tb.key)}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tb.key ? ACCENT : '#555',
                    background: activeTab === tb.key ? '#f3f3ff' : 'transparent',
                  }}
                >
                  {t(tb.labelKey)}
                </button>
              ))
            : LINKS.map((l) => (
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
          {/* 首页 tab 模式下，站点入口移到右侧 */}
          {hasTabs && (
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
          )}
          {showCta && (
            <button
              onClick={() => navigate('/')}
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white sm:block"
              style={{ background: ACCENT }}
            >
              {t('landing.workspace')}
            </button>
          )}
          <ConnectionStatus />
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

      {/* 移动端下拉抽屉：首页展示 tabs，站点页展示常规导航 */}
      {open && (
        <div className="border-t border-[#f0f0f2] bg-white px-4 py-2 md:hidden">
          {hasTabs &&
            tabs!.map((tb) => (
              <button
                key={tb.key}
                onClick={() => {
                  onTabChange?.(tb.key);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium"
                style={{
                  color: activeTab === tb.key ? ACCENT : '#333',
                  background: activeTab === tb.key ? '#f3f3ff' : 'transparent',
                }}
              >
                {t(tb.labelKey)}
              </button>
            ))}
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
