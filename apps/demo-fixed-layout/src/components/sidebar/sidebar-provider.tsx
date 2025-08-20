/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import { SidebarContext } from '../../context';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [nodeId, setNodeId] = useState<string | undefined>();
  return (
    <SidebarContext.Provider value={{ visible: !!nodeId, nodeId, setNodeId }}>
      {children}
    </SidebarContext.Provider>
  );
}
