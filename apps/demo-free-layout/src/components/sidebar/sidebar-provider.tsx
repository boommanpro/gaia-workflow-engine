import { useState } from 'react';

import { PanelEnum, PanelValue, SidebarContext, StatePriority } from '../../context';
import {useClientContext} from "@flowgram.ai/free-layout-editor";

export function SidebarProvider({ children }: { children: React.ReactNode }) {

  const ctx = useClientContext();
  window.$wujie?.bus.$on("测试", function (arg1) {
    console.log("收到事件消息")
    console.log(arg1)

    ctx.document.reload(JSON.parse(arg1));
    setTimeout(() => {
      // 加载后触发画布的 fitview 让节点自动居中
      ctx.document.fitView();
    }, 100);

  });

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

  const getPanelValue = (panel: PanelEnum) => sidebarState[panel];

  return (
    <SidebarContext.Provider
      value={{ ...sidebarState, getFirstEnablePanel, updatePanelValue, getPanelValue }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
