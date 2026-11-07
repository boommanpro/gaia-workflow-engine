/**
 * 变量 Dock 开关状态 —— 2026-11-05 方案 A。
 *
 * 面板本体由 panel-manager-plugin 托管（bottom 区、shell 层渲染），这里只做三件事：
 *  · 读开关与高度（面板 store 是 zustand vanilla，onPanelsChange + store.subscribe 双订阅）
 *  · 提供 toggle（工具栏按钮用）
 *  · ⌘J / Ctrl+J 全局快捷键（输入框聚焦时不抢键）
 *
 * 工具栏读取 height 的用途：底部居中工具栏在 Dock 展开时上移避让。
 */

import { useCallback, useEffect, useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';

import { VARIABLE_DOCK_PANEL_KEY } from './variable-dock-panel';

export interface VariableDockState {
  open: boolean;
  /** Dock 像素高度；关闭时为 0（工具栏避让用） */
  height: number;
}

function findDockPanel(panelManager: ReturnType<typeof usePanelManager>) {
  return panelManager.getPanels('bottom').find((p) => p.key === VARIABLE_DOCK_PANEL_KEY);
}

/** 订阅变量 Dock 的开关状态与高度（拖拽改高度也会触发更新） */
export function useVariableDockState(): VariableDockState {
  const panelManager = usePanelManager();
  const read = useCallback((): VariableDockState => {
    const panel = findDockPanel(panelManager);
    if (!panel) return { open: false, height: 0 };
    const { visible, fullscreen, size } = panel.store.getState();
    return { open: !!visible, height: visible && !fullscreen ? size : 0 };
  }, [panelManager]);

  const [state, setState] = useState<VariableDockState>(read);
  useEffect(() => {
    let unsubscribeStore: (() => void) | undefined;
    const sync = () => {
      unsubscribeStore?.();
      const panel = findDockPanel(panelManager);
      // 面板实例可能被重建（keepDOM 下通常只建一次）：store 订阅跟随重挂
      unsubscribeStore = panel?.store.subscribe(() => setState(read()));
      setState(read());
    };
    const disposable = panelManager.onPanelsChange(sync);
    sync();
    return () => {
      disposable.dispose();
      unsubscribeStore?.();
    };
  }, [panelManager, read]);

  return state;
}

/** 开 / 关变量 Dock（工具栏按钮动作） */
export function useVariableDockToggle(): () => void {
  const panelManager = usePanelManager();
  return useCallback(() => {
    const panel = findDockPanel(panelManager);
    if (panel?.visible) {
      panelManager.close(VARIABLE_DOCK_PANEL_KEY);
    } else {
      panelManager.open(VARIABLE_DOCK_PANEL_KEY, 'bottom');
    }
  }, [panelManager]);
}

/** ⌘J / Ctrl+J 切换变量 Dock；输入框 / 文本域聚焦时不拦截 */
export function useVariableDockShortcut(): void {
  const toggle = useVariableDockToggle();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'j') return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);
}
