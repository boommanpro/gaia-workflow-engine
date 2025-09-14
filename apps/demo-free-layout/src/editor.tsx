/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {EditorRenderer, FreeLayoutEditorProvider} from '@flowgram.ai/free-layout-editor';

import '@flowgram.ai/free-layout-editor/index.css';
import './index.css';
import './styles/index.css';
import {nodeRegistries} from './nodes';
import {initialData} from './initial-data';
import {useEditorProps} from './hooks';
import {DemoTools} from './components/tools';
import {SidebarProvider, SidebarRenderer} from './components/sidebar';
import {setupAuthorization} from "./plugins/runtime-plugin";

let loadedWorkflowData = null;

// 全局函数用于接收工作流数据
window.setLoadedWorkflowData = (data) => {
  loadedWorkflowData = data;
  console.log('设置加载的工作流数据:', data);
};

export const Editor = () => {
  // 检查是否有通过wujie传递的工作流数据
  let initialWorkflowData = initialData;
  if (window.$wujie?.props?.workflowData?.content) {
    console.log('使用wujie传递的工作流数据:', window.$wujie.props.workflowData.content);
    initialWorkflowData = window.$wujie.props.workflowData.content;
    setupAuthorization(window.$wujie.props.authorization);
  } else if (loadedWorkflowData) {
    console.log('使用全局设置的工作流数据:', loadedWorkflowData);
    initialWorkflowData = loadedWorkflowData;
  }

  const editorProps = useEditorProps(initialWorkflowData, nodeRegistries);


  return (
    <div className="doc-free-feature-overview-div">
      <FreeLayoutEditorProvider {...editorProps}>
        <SidebarProvider>
          <div className="demo-container">
            <EditorRenderer className="demo-editor" />
          </div>
          <DemoTools />
          <SidebarRenderer />
        </SidebarProvider>
      </FreeLayoutEditorProvider>
    </div>
  );
};
