/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { SidebarContext } from '../../context';
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
  const [nodeId, setNodeId] = useState<string | undefined>();
  return (
    <SidebarContext.Provider value={{ visible: !!nodeId, nodeId, setNodeId }}>
      {children}
    </SidebarContext.Provider>
  );
}
