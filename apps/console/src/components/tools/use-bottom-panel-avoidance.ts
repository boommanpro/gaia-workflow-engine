/**
 * 底部面板避让（bottom 区）—— 2026-11-07。
 * 变量 Dock 与运行历史面板都住在 panel-manager 的 bottom 区；底部居中工具栏
 * 在其展开时需要上移避让。此前只有变量 Dock 做了避让（use-variable-dock），
 * 运行历史打开后会把工具栏盖住——这里按「bottom 区可见面板的最大高度」统一计算，
 * 未来新增 bottom 面板自动获得同一避让，不需要各面板再各写一份。
 */
import { useCallback, useEffect, useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';

/** bottom 区可见（非全屏）面板的最大像素高度；无可见面板时为 0 */
export function useBottomPanelAvoidance(): number {
  const panelManager = usePanelManager();

  const read = useCallback((): number => {
    let height = 0;
    for (const panel of panelManager.getPanels('bottom')) {
      const { visible, fullscreen, size } = panel.store.getState();
      if (visible && !fullscreen) {
        height = Math.max(height, size);
      }
    }
    return height;
  }, [panelManager]);

  const [height, setHeight] = useState(read);
  useEffect(() => {
    let unsubscribeStore: (() => void) | undefined;
    const sync = () => {
      unsubscribeStore?.();
      // 同一时刻 bottom 区通常只有一个可见面板，但拖拽调高度也会触发 store 更新；
      // 订阅每个 bottom 面板的 store，取最大值
      const unsubscribers = panelManager
        .getPanels('bottom')
        .map((panel) => panel.store.subscribe(() => setHeight(read())));
      unsubscribeStore = () => unsubscribers.forEach((u) => u());
      setHeight(read());
    };
    const disposable = panelManager.onPanelsChange(sync);
    sync();
    return () => {
      disposable.dispose();
      unsubscribeStore?.();
    };
  }, [panelManager, read]);

  return height;
}
