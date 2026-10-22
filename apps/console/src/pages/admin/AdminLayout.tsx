/**
 * AdminLayout — 设置二级区布局（对话优先 IA）。
 *
 * 左下角「设置」进入这里：【左栏：返回 App + 后台导航（模板管理 / Agent 配置中心）】｜【顶栏：页面标题 + 页面动作】。
 * 主导航（对话 / 工作流管理 / 项目）在应用态侧边栏 AppRail，两态互斥。
 * 子页面通过 Outlet context 注入「顶部标题右侧」的动作按钮（如新建）。
 */
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';
import { AppShell } from '../../components/app-shell';
import { ServerConfigGuard } from '../../components/ServerConfigGuard';

/** 子页面注入顶栏动作按钮的 context 形状 */
export interface AdminOutletContext {
  setHeaderAction: (action: { label: string; onClick: () => void } | null) => void;
}

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/manage/templates')) return t('admin.templates');
  if (pathname.startsWith('/manage/agent-config')) return t('agent.config.title');
  return t('admin.title.default');
};

/** 设置二级区左栏导航：偏后台的能力都收纳在这里 */
const SettingsNav = () => {
  useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: t('admin.templates'), path: '/manage/templates' },
    { label: t('agent.config.title'), path: '/manage/agent-config' },
  ];

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: 'none',
              background: isActive ? CHAT.hover : 'transparent',
              boxShadow: isActive ? `inset 0 0 0 1px ${CHAT.line}` : 'none',
              padding: '8px 10px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 400,
              color: CHAT.text,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background .14s, color .14s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = CHAT.hover;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

/* ---------------- Layout component ---------------- */

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // 订阅语言切换，语言变化时触发重渲染
  useLanguage();
  const pageTitle = getPageTitle(location.pathname);
  const [headerAction, setHeaderAction] = useState<{ label: string; onClick: () => void } | null>(null);

  return (
    <AppShell
      railTop={
        <button
          type="button"
          onClick={() => navigate('/chat')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: 'none',
            background: CHAT.hover,
            boxShadow: `inset 0 0 0 1px ${CHAT.line}`,
            color: CHAT.text,
            padding: '8px 10px',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: CHAT.textMuted }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('shell.backToWorkspace')}
        </button>
      }
      railMiddle={<SettingsNav />}
      title={
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: CHAT.text }}>
          {pageTitle}
        </h1>
      }
      actions={
        headerAction && (
          <Tooltip content={headerAction.label} position="bottom">
            <button
              type="button"
              onClick={headerAction.onClick}
              aria-label={headerAction.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 8,
                border: 'none',
                background: CHAT.accent,
                color: CHAT.accentFg,
                cursor: 'pointer',
                transition: 'opacity 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <IconPlus />
            </button>
          </Tooltip>
        )
      }
      bodyStyle={{ display: 'block', overflowY: 'auto', background: CHAT.bg, padding: 24 }}
    >
      <ServerConfigGuard>
        <Outlet context={{ setHeaderAction }} />
      </ServerConfigGuard>
    </AppShell>
  );
};

export default AdminLayout;
