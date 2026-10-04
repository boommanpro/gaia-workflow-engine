/**
 * AdminLayout — Manage 模式布局（原管理后台）
 *
 * 复用统一外壳 AppShell：【左栏：管理导航】｜【顶栏：页面标题 + 页面动作】｜【内容区】。
 * 子页面通过 Outlet context 注入「顶部标题右侧」的动作按钮（如新建）。
 */
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Modal, Input, Button as SemiButton, Tooltip } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { workflowApi } from '../../services/workflow-api';
import { getApiBaseUrl, updateApiBaseUrl } from '../../utils/apiConfig';
import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';
import { AppShell, ManageNav } from '../../components/app-shell';

/** 子页面注入顶栏动作按钮的 context 形状 */
export interface AdminOutletContext {
  setHeaderAction: (action: { label: string; onClick: () => void } | null) => void;
}

const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/manage/workflows')) return t('admin.workflows');
  if (pathname.startsWith('/manage/templates')) return t('admin.templates');
  if (pathname.startsWith('/manage/agent-config')) return t('agent.config.title');
  if (pathname.startsWith('/manage/sessions')) return t('sessionReview.title');
  return t('admin.title.default');
};

/* ---------------- Layout component ---------------- */

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // 订阅语言切换，语言变化时触发重渲染
  useLanguage();
  const pageTitle = getPageTitle(location.pathname);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [checking, setChecking] = useState(true);
  const [headerAction, setHeaderAction] = useState<{ label: string; onClick: () => void } | null>(null);

  useEffect(() => {
    workflowApi.health().then(() => setChecking(false)).catch(() => {
      // 后端未连接，自动弹窗让用户配置服务端地址
      setChecking(false);
      setServerUrl(getApiBaseUrl());
      setShowServerConfig(true);
    });
  }, []);

  return (
    <>
      <AppShell
        mode="manage"
        railMiddle={<ManageNav />}
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
        bodyStyle={{ display: 'block', overflowY: 'auto', background: CHAT.bgSunken, padding: 24 }}
      >
        {checking ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: CHAT.textMuted, fontSize: 15 }}>
            {t('admin.connecting')}
          </div>
        ) : (
          <Outlet context={{ setHeaderAction }} />
        )}
      </AppShell>

      {/* 后端未连接时弹窗配置服务端地址 */}
      <Modal
        title={t('serverConfig.title')}
        visible={showServerConfig}
        closable={false}
        maskClosable={false}
        footer={null}
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 14, color: CHAT.textSub, marginBottom: 16, lineHeight: 1.6 }}>
            {t('serverConfig.desc')}
          </p>
          <Input
            value={serverUrl}
            onChange={(v) => setServerUrl(v)}
            placeholder="http://127.0.0.1:48080/api"
            style={{ width: '100%', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <SemiButton
              onClick={() => {
                setShowServerConfig(false);
                navigate('/');
              }}
              style={{ borderRadius: 6 }}
            >
              {t('serverConfig.returnHome')}
            </SemiButton>
            <SemiButton
              theme="solid"
              style={{ background: CHAT.accent, color: CHAT.accentFg, borderRadius: 6 }}
              onClick={() => {
                if (serverUrl.trim()) {
                  updateApiBaseUrl(serverUrl.trim());
                  window.location.reload();
                }
              }}
            >
              {t('serverConfig.saveReconnect')}
            </SemiButton>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AdminLayout;
