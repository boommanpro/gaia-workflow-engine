/**
 * AutomationsLayout —— 定时任务中心布局（应用态一级页面，与 /workflows 同构）。
 *
 * 左栏 = AppRail（新建任务 / 工作流管理 / 定时任务 / 项目列表）；
 * 子页面（AutomationsManagement）通过 Outlet context 注入顶栏「新建」动作按钮。
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { useLanguage, t } from '../../i18n';
import { CHAT } from '../../chat/theme';
import { AppShell, AppRail } from '../../components/app-shell';
import { ServerConfigGuard } from '../../components/ServerConfigGuard';

/* ---------------- Layout component ---------------- */

export const AutomationsLayout = () => {
  useLanguage();
  const [headerAction, setHeaderAction] = useState<{ label: string; onClick: () => void } | null>(
    null
  );

  return (
    <AppShell
      railMiddle={<AppRail />}
      title={
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: CHAT.text }}>
          {t('admin.automations')}
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

export default AutomationsLayout;
