// 定义 sidebar 中各个功能的状态接口
import React from 'react';

import { NodeRenderReturnType } from '@flowgram.ai/free-layout-editor';

// 定义枚举类型
export enum PanelEnum {
  WorkflowRun = 'workflowRun',
  NodeRun = 'nodeRun',
  NodeEdit = 'nodeEdit',
}

export const StatePriority = [
  // 优先级
  PanelEnum.WorkflowRun,
  PanelEnum.NodeRun,
  PanelEnum.NodeEdit,
];

export interface PanelValue {
  isRunning: boolean;
  [key: string]: any; // 允许放入其他数据
}

// 创建一个映射类型来管理 sidebar 的状态
export type SidebarState = {
  [key in PanelEnum]: PanelValue;
};

// 创建一个接口来管理 sidebar 的方法和其他属性
export interface SidebarContextType extends SidebarState {
  getFirstEnablePanel: () => { key: PanelEnum; value: PanelValue } | null;
  updatePanelValue: (state: PanelEnum, value: PanelValue) => void;
}

// 创建一个 Context 来管理 sidebar 的状态
export const SidebarContext = React.createContext<SidebarContextType>({
  [PanelEnum.WorkflowRun]: { isRunning: false },
  [PanelEnum.NodeRun]: { isRunning: false },
  [PanelEnum.NodeEdit]: { isRunning: false },
  getFirstEnablePanel: () => null,
  updatePanelValue: () => {},
});

export const IsSidebarContext = React.createContext<boolean>(false);
