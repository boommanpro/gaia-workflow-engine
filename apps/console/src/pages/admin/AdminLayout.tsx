/**
 * AdminLayout — 管理后台布局
 * 左侧固定侧边栏 + 右侧主内容区（顶部 header bar + Outlet）
 */
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';

const ACCENT = '#4d53e8';

/* ---------------- Inline SVG icons ---------------- */

const IconWorkflow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="13" width="7" height="8" rx="1.5" />
    <path d="M10 6.5h4M10 6.5a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2" />
  </svg>
);

const IconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 9v12" />
  </svg>
);

const IconBackHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

/* ---------------- Page title map ---------------- */

const PAGE_TITLES: Record<string, string> = {
  '/admin/workflows': '工作流管理',
  '/admin/templates': '模板管理',
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/admin/workflows')) return '工作流管理';
  if (pathname.startsWith('/admin/templates')) return '模板管理';
  return '管理后台';
};

/* ---------------- Layout component ---------------- */

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const navLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? ACCENT : '#1a1a1a',
    background: isActive ? '#f0f0ff' : 'transparent',
    textDecoration: 'none',
    transition: 'background 0.18s ease, color 0.18s ease',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#1a1a1a' }}>
      {/* ---------- Sidebar ---------- */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #e8e8ea',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {/* Logo area */}
        <div style={{ padding: '24px 20px 20px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: ACCENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              G
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>Gaia</span>
              <span style={{ fontSize: 11.5, color: '#999', marginTop: 2 }}>盖亚 · 管理后台</span>
            </div>
          </div>
        </div>

        {/* Nav menu */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/admin/workflows" style={navLinkStyle}>
            <IconWorkflow />
            <span>工作流管理</span>
          </NavLink>
          <NavLink to="/admin/templates" style={navLinkStyle}>
            <IconTemplate />
            <span>模板管理</span>
          </NavLink>
        </nav>

        {/* Bottom back-home */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#666',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.18s ease, color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f7';
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#666';
            }}
          >
            <IconBackHome />
            <span>返回首页</span>
          </button>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header bar */}
        <header
          style={{
            height: 56,
            flexShrink: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e8e8ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: '#1a1a1a' }}>
            {pageTitle}
          </h1>
        </header>

        {/* Content area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#f5f5f7',
            padding: 24,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
