/**
 * 工具栏「变量」入口按钮 —— 2026-11-05 方案 A。
 * 点击 / ⌘J 切换底部变量 Dock。2026-11-06 图标定为自绘 {x} 线性 SVG
 * （icon-variable.tsx，Lucide variable 几何），替换 PNG 位图以跟随深浅主题。
 */

import { IconButton, Tooltip } from '@douyinfe/semi-ui';

import { useLanguage, t } from '../../i18n';
import { IconVariable } from '../../assets/icon-variable';
import {
  useVariableDockShortcut,
  useVariableDockState,
  useVariableDockToggle,
} from './use-variable-dock';

export const VariableDockButton = () => {
  useLanguage();
  // 快捷键挂在这里：按钮随工具栏常驻（WorkflowViewer / TemplateEditor 同样生效）
  useVariableDockShortcut();
  const { open } = useVariableDockState();
  const toggle = useVariableDockToggle();

  return (
    <Tooltip content={`${t('tool.variables')} (⌘J)`}>
      <IconButton
        icon={IconVariable}
        type="tertiary"
        theme={open ? 'light' : 'borderless'}
        aria-pressed={open}
        aria-label={t('tool.variables')}
        onClick={toggle}
      />
    </Tooltip>
  );
};
