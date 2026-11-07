/**
 * 变量 Dock（底部）对外入口 —— 2026-11-05 方案 A。
 * 面板工厂注册见 hooks/use-editor-props.tsx；工具栏入口组件在此导出。
 */

export { VARIABLE_DOCK_PANEL_KEY, variableDockPanelFactory } from './variable-dock-panel';
export {
  useVariableDockState,
  useVariableDockToggle,
  useVariableDockShortcut,
} from './use-variable-dock';
export { VariableDockButton } from './variable-dock-button';
