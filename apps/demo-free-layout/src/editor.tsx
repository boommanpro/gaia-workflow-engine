/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';
import { 
  EditorRenderer, 
  FreeLayoutEditorProvider, 
  useClientContext,
  useService,
  WorkflowDocument
} from '@flowgram.ai/free-layout-editor';

import '@flowgram.ai/free-layout-editor/index.css';
import './index.css';
import './styles/index.css';
import { setupAuthorization } from './plugins/runtime-plugin';
import { nodeRegistries } from './nodes';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks';
import { DemoTools } from './components/tools';
import { initWujieCommunication, setGlobalContext, setGlobalDocument } from './utils/wujie-communication';

let loadedWorkflowData = null;

// 全局函数用于接收工作流数据
window.setLoadedWorkflowData = (data) => {
  loadedWorkflowData = data;
  console.log('设置加载的工作流数据:', data);
};

// 内部组件：负责初始化微前端通信
const WujieCommunicationInitializer = () => {
  const ctx = useClientContext();
  const documentService = useService(WorkflowDocument);
  
  console.log('WujieCommunicationInitializer - context:', ctx);
  console.log('WujieCommunicationInitializer - document service:', documentService);

  useEffect(() => {
    console.log('Initializing Wujie communication in provider context:', ctx, documentService);
    
    // 设置全局上下文
    if (ctx) {
      setGlobalContext(ctx);
    }
    
    // 设置全局文档服务
    if (documentService) {
      setGlobalDocument(documentService);
    }
    
    // 初始化微前端通信
    initWujieCommunication(ctx);
  }, [ctx, documentService]);

  return null; // 这个组件不渲染任何内容
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
        <div className="demo-container">
          <EditorRenderer className="demo-editor" />
        </div>
        <DemoTools />
        {/* 初始化微前端通信的组件 */}
        <WujieCommunicationInitializer />
      </FreeLayoutEditorProvider>
    </div>
  );
};