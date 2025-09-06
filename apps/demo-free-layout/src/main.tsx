import React from 'react';

import './index.css';
import ReactDOM from 'react-dom/client';

import App from './App';

// 确保根元素有正确的样式
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.width = '100%';
  rootElement.style.height = '100%';
}

let currentRoot = null;

const render = () => {
  currentRoot = ReactDOM.createRoot(document.getElementById('root')!);
  currentRoot.render(<App />);
};

// 处理保存工作流请求
const handleSaveWorkflow = (data) => {
  console.log('React微应用收到保存请求:', data);
  
  // 获取当前文档数据
  // 注意：这里需要通过某种方式获取当前的文档数据
  // 在实际应用中，你可能需要通过全局状态或回调函数来获取
  
  // 发送确认消息回主应用
  if (window.$wujie) {
    window.$wujie.bus.$emit('workflowSaved', { 
      type: 'workflowSaved', 
      payload: { 
        success: true, 
        timestamp: Date.now(),
        workflowId: data.payload?.workflowId
      } 
    });
    console.log('已发送保存确认回主应用');
  }
};

// 处理加载工作流请求
const handleLoadWorkflow = (data) => {
  console.log('React微应用收到加载工作流请求:', data);
  // 这里可以将数据传递给应用的某个全局状态管理器
  // 例如通过window对象或自定义事件
  
  // 发送确认消息回主应用
  if (window.$wujie) {
    window.$wujie.bus.$emit('workflowLoaded', { 
      type: 'workflowLoaded', 
      payload: { 
        success: true, 
        timestamp: Date.now(),
        workflowId: data.payload?.id
      } 
    });
    console.log('已发送加载确认回主应用');
  }
};

if (window.__POWERED_BY_WUJIE__) {
  // 监听主应用下发的props
  window.__WUJIE_MOUNT = () => {
    const props = window.$wujie?.props;
    console.log("无界加载成功-----------");
    console.log("收到的props:", props);
    
    // 监听来自主应用的消息
    window.$wujie?.bus.$on('saveWorkflow', handleSaveWorkflow);
    window.$wujie?.bus.$on('loadWorkflow', handleLoadWorkflow);
    console.log("已注册事件监听器");
    
    render();
  };
  
  window.__WUJIE_UNMOUNT = () => {
    // 清理事件监听器
    window.$wujie?.bus.$off('saveWorkflow', handleSaveWorkflow);
    window.$wujie?.bus.$off('loadWorkflow', handleLoadWorkflow);
    
    // 卸载React应用
    if (currentRoot) {
      currentRoot.unmount();
    }
  };
  
  // 发送生命周期事件给主应用
  window.$wujie?.bus.$emit('sub-app-mounted', { name: 'freelayout-editor' });
} else {
  // 非微前端环境下也注册事件监听器用于测试
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'saveWorkflow') {
        handleSaveWorkflow(event.data);
      }
      if (event.data?.type === 'loadWorkflow') {
        handleLoadWorkflow(event.data);
      }
    });
  }
  
  render();
}