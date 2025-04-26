import { useState } from 'react';

import { PanelEnum, PanelValue, SidebarContext, StatePriority } from '../../context';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 初始化状态
  const [sidebarState, setSidebarState] = useState<Record<PanelEnum, PanelValue>>({
    [PanelEnum.WorkflowRun]: { isRunning: false },
    [PanelEnum.NodeRun]: { isRunning: false },
    [PanelEnum.NodeEdit]: { isRunning: false },
  });

  // 更新状态的方法
  const updatePanelValue = (state: PanelEnum, value: PanelValue) => {
    setSidebarState((prevState) => ({
      ...prevState,
      [state]: value,
    }));
  };

  // 获取第一个启用的面板

  const getFirstEnablePanel = () => {
    let state = sidebarState;
    for (const key of StatePriority) {
      if (state[key].isRunning) {
        return { key, value: state[key] };
      }
    }
    return null;
  };

  return (
    <SidebarContext.Provider value={{ ...sidebarState, getFirstEnablePanel, updatePanelValue }}>
      {children}
    </SidebarContext.Provider>
  );
}
