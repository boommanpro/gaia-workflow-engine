/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef, useState } from 'react';
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
import { updateApiBaseUrl, getApiBaseUrl } from './utils/apiConfig';

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

export const Editor = (props) => {
  // 使用ref来跟踪是否已经处理过API配置，防止重复处理
  const apiConfigProcessedRef = useRef(false);
  
  // 添加状态用于强制重新渲染
  const [shouldRender, setShouldRender] = useState(true);
  
  console.log('Editor组件渲染，props:', props);
  console.log('window.$wujie?.props存在:', !!window.$wujie?.props);
  
  // 在组件挂载时处理API配置
  useEffect(() => {
    console.log('Editor组件挂载，开始检查API配置...');
    
    const processApiConfig = () => {
      if (apiConfigProcessedRef.current) {
        console.log('API配置已经被处理过，跳过');
        return;
      }
      
      console.log('检查API配置来源...');
      
      // 检查多个可能的API配置来源
      let apiBaseUrl = null;
      
      // 1. 检查组件props
      if (props?.apiConfig?.apiBaseUrl) {
        apiBaseUrl = props.apiConfig.apiBaseUrl;
        console.log('从组件props获取API配置:', apiBaseUrl);
      }
      
      // 2. 如果props中没有，检查window.$wujie.props
      if (!apiBaseUrl && window?.$wujie?.props?.apiConfig?.apiBaseUrl) {
        apiBaseUrl = window.$wujie.props.apiConfig.apiBaseUrl;
        console.log('从window.$wujie.props获取API配置:', apiBaseUrl);
      }
      
      // 3. 如果还没有，检查window.$wujie.props直接属性
      if (!apiBaseUrl && window?.$wujie?.props?.apiBaseUrl) {
        apiBaseUrl = window.$wujie.props.apiBaseUrl;
        console.log('从window.$wujie.props.apiBaseUrl获取API配置:', apiBaseUrl);
      }
      
      // 4. 如果仍然没有，尝试从localStorage获取
      if (!apiBaseUrl) {
        const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
        if (storedApiBaseUrl) {
          apiBaseUrl = storedApiBaseUrl;
          console.log('从localStorage获取API配置:', apiBaseUrl);
        }
      }
      
      if (apiBaseUrl) {
        console.log('从主应用接收到API配置，更新API基础URL:', apiBaseUrl);
        const currentApiBaseUrl = getApiBaseUrl();
        if (currentApiBaseUrl !== apiBaseUrl) {
          updateApiBaseUrl(apiBaseUrl);
          // API配置改变，需要重新渲染以应用新的配置
          setShouldRender(prev => !prev); // 切换状态以触发重新渲染
        }
        apiConfigProcessedRef.current = true;
      } else {
        console.log('未找到API配置，将在稍后继续检查...');
      }
    };

    // 立即执行一次
    processApiConfig();

    // 设置定时器定期检查，因为有时props可能在组件挂载后才可用
    const intervalId = setInterval(() => {
      if (!apiConfigProcessedRef.current) {
        processApiConfig();
      } else {
        clearInterval(intervalId);
      }
    }, 500); // 每500毫秒检查一次，最多检查10次

    // 设置超时停止检查
    setTimeout(() => {
      clearInterval(intervalId);
    }, 5000); // 5秒后停止检查

    return () => {
      clearInterval(intervalId);
    };
  }, [props]); // 添加props到依赖数组

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

  // 使用当前的API基础URL生成editorProps
  const editorProps = useEditorProps(initialWorkflowData, nodeRegistries);

  return (
    <div className="doc-free-feature-overview-div">
      <FreeLayoutEditorProvider {...editorProps}>
        <div className="demo-container">
          <EditorRenderer className="demo-editor" key={shouldRender ? 'rendered' : 'unrendered'} />
        </div>
        <DemoTools />
        {/* 初始化微前端通信的组件 */}
        <WujieCommunicationInitializer />
      </FreeLayoutEditorProvider>
    </div>
  );
};