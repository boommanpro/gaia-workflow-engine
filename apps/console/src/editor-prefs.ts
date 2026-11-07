/**
 * 编辑器偏好（gaia.editor.*）：工具栏位置 / 节点添加方式 / 画布外观。
 * （节点紧凑密度已于 2026-11-07 改为节点级交互，见 node-compact-store。）
 *
 * 设计依据 docs/editor-ux-benchmark-proposal-2026-11-03.md §4.6（2026-11-04 用户确认）。
 * 全部为展示层偏好：只存 localStorage，不进工作流 JSON、不影响节点契约（NC-01/P-01）。
 * 偏好变更通过 window 事件广播，编辑器内组件（工具栏/节点渲染/左栏面板）自行订阅重渲。
 */
import { useEffect, useState } from 'react';

export type ToolbarPosition = 'center' | 'left' | 'top' | 'rail';
export type EditorThemePref = 'auto' | 'light' | 'dark';
export type CanvasBgPref = 'dots' | 'grid' | 'none';

export interface EditorPrefs {
  /** 编辑器主题：auto=跟随应用 gaia.themeMode */
  theme: EditorThemePref;
  canvasBg: CanvasBgPref;
  /** 强调色 hex，作用于连线/端口/选中态（写入 --g-workflow-*-color 系列变量） */
  accent: string;
  /** 工具栏位置，默认下部居中（2026-11-04 确认） */
  toolbarPosition: ToolbarPosition;
  /** 节点添加方式开关（左侧面板；其余添加方式全开、无开关） */
  addPalette: boolean;
  addPortPlus: boolean;
  addContextMenu: boolean;
  addDragLine: boolean;
}

export const EDITOR_PREFS_KEY = 'gaia.editor.prefs';
export const EDITOR_PREFS_EVENT = 'gaia-editor-prefs-change';

/** 强调色预设（与偏好面板色板一致） */
export const EDITOR_ACCENT_PRESETS = [
  { value: '#4d53e8', labelKey: 'prefs.accentPurple' },
  { value: '#0077fa', labelKey: 'prefs.accentBlue' },
  { value: '#00b2b2', labelKey: 'prefs.accentTeal' },
  { value: '#d6409f', labelKey: 'prefs.accentMagenta' },
] as const;

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  theme: 'auto',
  canvasBg: 'dots',
  accent: '#4d53e8',
  toolbarPosition: 'center',
  addPalette: false,
  addPortPlus: true,
  addContextMenu: true,
  addDragLine: true,
};

export const getEditorPrefs = (): EditorPrefs => {
  // 2026-11-07 密度下线：紧凑模式改为节点级交互（node-compact-store），不再有全局偏好。
  // 2026-11-05 约定优于配置：设置面板只保留「左侧节点面板」开关，
  // 其余项一律默认（主题跟随应用/点阵背景/工具栏下部居中/添加方式全开）。
  // 旧存储里的其余键一概忽略，避免历史值（如深色覆盖、全局紧凑）造成口径漂移。
  try {
    const raw = localStorage.getItem(EDITOR_PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<EditorPrefs>) : {};
    return {
      ...DEFAULT_EDITOR_PREFS,
      addPalette: typeof p.addPalette === 'boolean' ? p.addPalette : false,
    };
  } catch {
    return { ...DEFAULT_EDITOR_PREFS };
  }
};

export const setEditorPrefs = (patch: Partial<EditorPrefs>): EditorPrefs => {
  const next = { ...getEditorPrefs(), ...patch };
  try {
    localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyEditorPrefsSideEffects(next);
  window.dispatchEvent(new Event(EDITOR_PREFS_EVENT));
  return next;
};

/** 强调色等需要落到全局 CSS 变量的副作用（连线/端口读取 --g-workflow-*-color） */
export const applyEditorPrefsSideEffects = (prefs: EditorPrefs = getEditorPrefs()): void => {
  const root = document.documentElement;
  root.style.setProperty('--g-workflow-line-color-default', prefs.accent);
  root.style.setProperty('--g-workflow-line-color-flowing', prefs.accent);
  root.style.setProperty('--g-workflow-port-color-primary', prefs.accent);
  root.style.setProperty('--g-editor-accent', prefs.accent);
};

export const useEditorPrefs = (): EditorPrefs => {
  const [prefs, setPrefs] = useState<EditorPrefs>(getEditorPrefs);
  useEffect(() => {
    const onChange = () => setPrefs(getEditorPrefs());
    window.addEventListener(EDITOR_PREFS_EVENT, onChange);
    return () => window.removeEventListener(EDITOR_PREFS_EVENT, onChange);
  }, []);
  return prefs;
};
