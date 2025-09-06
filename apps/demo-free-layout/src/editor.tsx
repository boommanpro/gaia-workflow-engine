/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EditorRenderer, FreeLayoutEditorProvider } from '@flowgram.ai/free-layout-editor';

import '@flowgram.ai/free-layout-editor/index.css';
import './index.css';
import './styles/index.css';
import { nodeRegistries } from './nodes';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks';
import { DemoTools } from './components/tools';
import { SidebarProvider, SidebarRenderer } from './components/sidebar';
import { useEffect, useRef } from 'react';

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
  } else if (loadedWorkflowData) {
    console.log('使用全局设置的工作流数据:', loadedWorkflowData);
    initialWorkflowData = loadedWorkflowData;
  }

  const editorProps = useEditorProps(initialWorkflowData, nodeRegistries);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // 监听来自主应用的加载工作流事件
    const handleLoadWorkflow = (data) => {
      console.log('Editor组件收到加载工作流事件:', data);
      if (data.payload && !hasLoadedRef.current) {
        // 重新加载文档数据
        if (editorProps.document && data.payload.content) {
          console.log('正在加载工作流内容到编辑器');
          editorProps.document.reload(data.payload.content)
            .then(() => {
              console.log('工作流内容加载完成');
              editorProps.document.fitView();
            })
            .catch((error) => {
              console.error('工作流内容加载失败:', error);
            });
          hasLoadedRef.current = true;
        }
      }
    };

    // 如果是微前端环境，监听wujie事件
    if (window.$wujie) {
      window.$wujie.bus.$on('loadWorkflow', handleLoadWorkflow);
    }

    // 清理函数
    return () => {
      if (window.$wujie) {
        window.$wujie.bus.$off('loadWorkflow', handleLoadWorkflow);
      }
    };
  }, [editorProps]);

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
