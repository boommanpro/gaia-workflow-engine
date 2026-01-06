/**
 * 微前端通信工具
 * 用于处理主应用和子应用之间的消息传递
 */

import { 
  FreeLayoutPluginContext,
  WorkflowNodeJSON,
  WorkflowDocument,
  useService
} from '@flowgram.ai/free-layout-editor';
import { nodeRegistries } from '../nodes';
import { WorkflowNodeType } from '../nodes/constants';

// 存储上下文和相关服务的变量
let globalCtx: FreeLayoutPluginContext | null = null;
let globalDocument: any = null;
let pendingRequests: any[] = []; // 存储等待上下文可用的请求

// 设置全局上下文
export const setGlobalContext = (ctx: FreeLayoutPluginContext) => {
  console.log('Setting global context:', ctx);
  globalCtx = ctx;
  
  // 如果 ctx.document 存在，使用它
  if (ctx && ctx.document) {
    globalDocument = ctx.document;
    console.log('Global document set from ctx.document');
  }
  
  if (globalDocument) {
    console.log('Global document set, processing pending requests');
    // 处理等待的请求
    processPendingRequests();
  }
};

// 设置全局文档
export const setGlobalDocument = (document: any) => {
  console.log('Setting global document:', document);
  globalDocument = document;
  
  if (globalDocument) {
    console.log('Global document set from external source, processing pending requests');
    // 处理等待的请求
    processPendingRequests();
  }
};

// 处理等待的请求
const processPendingRequests = () => {
  console.log(`Processing ${pendingRequests.length} pending requests`);
  while (pendingRequests.length > 0) {
    const request = pendingRequests.shift();
    if (request) {
      handleAddComponentInternal(request);
    }
  }
};

// 内部处理添加组件的消息
const handleAddComponentInternal = (componentData: any) => {
  console.log('handleAddComponentInternal 被调用', componentData);
  console.log('Current globalCtx:', globalCtx);
  console.log('Current globalDocument:', globalDocument);
  
  if (!globalDocument) {
    console.error('Global document not available');
    // 通过wujie bus发送错误消息回主应用
    if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
      window.$wujie.bus.$emit('componentAdded', {
        success: false,
        error: 'Global document not available',
        message: '添加组件失败: 全局文档不可用'
      });
    }
    return;
  }

  try {
    console.log('Document available, attempting to add component:', componentData);
    
    // 组件类型映射
    const componentTypeMap: Record<string, string> = {
      'condition': WorkflowNodeType.Condition,
      '条件判断': WorkflowNodeType.Condition,
      '数据处理器': WorkflowNodeType.Code,
      'API调用': WorkflowNodeType.HTTP,
      '消息通知': WorkflowNodeType.Comment,
      '循环处理': WorkflowNodeType.Loop,
      '变量': WorkflowNodeType.Variable,
      '字符串格式化': WorkflowNodeType.StringFormat,
      '工作流': WorkflowNodeType.Workflow,
      '分配人': WorkflowNodeType.Assignee,
      '分支': WorkflowNodeType.Branches,
      'LLM': WorkflowNodeType.LLM,
      '开始': WorkflowNodeType.Start,
      '结束': WorkflowNodeType.End,
    };

    // 确定节点类型
    let nodeType = componentData.type;
    if (!nodeType) {
      // 根据组件名称映射类型
      for (const [key, value] of Object.entries(componentTypeMap)) {
        if (componentData.name?.includes(key) || componentData.name?.includes(value)) {
          nodeType = value;
          console.log('根据名称匹配到节点类型:', key, '->', value);
          break;
        }
      }
    }
    
    // 如果仍没有找到类型，使用默认类型
    if (!nodeType) {
      nodeType = WorkflowNodeType.Condition;
      console.log('使用默认节点类型:', nodeType);
    }

    // 查找节点注册信息
    const nodeRegistry = nodeRegistries.find(reg => reg.type === nodeType);
    if (!nodeRegistry) {
      console.error(`Node registry not found for type: ${nodeType}`);
      // 通过wujie bus发送错误消息回主应用
      if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
        window.$wujie.bus.$emit('componentAdded', {
          success: false,
          error: `Node registry not found for type: ${nodeType}`,
          message: `添加组件失败: 节点类型 "${nodeType}" 未注册`
        });
      }
      return;
    }

    console.log('Found node registry for type:', nodeType, nodeRegistry);
    
    // 获取默认节点配置
    const defaultNodeConfig = nodeRegistry.onAdd();
    console.log('Default node config:', defaultNodeConfig);
    
    // 合并来自AI助手的数据
    const nodeJSON: WorkflowNodeJSON = {
      ...defaultNodeConfig.data,
      title: componentData.name || defaultNodeConfig.data.title || '新组件',
      description: componentData.description || defaultNodeConfig.data.description,
      ...componentData.data
    };

    console.log('Final node JSON:', nodeJSON);
    
    // 计算新节点的位置（在画布中心附近随机位置）
    const newNodePosition = {
      x: Math.random() * 200 + 200, // 在200-400范围内随机
      y: Math.random() * 200 + 200  // 在200-400范围内随机
    };

    console.log('Attempting to create node with type:', nodeType, 'at position:', newNodePosition);
    
    // 创建新节点
    const newNode: any = globalDocument.createWorkflowNodeByType(
      nodeType,
      newNodePosition,
      nodeJSON
    );

    console.log('Successfully added component:', newNode);
    
    // 通过wujie bus发送成功消息回主应用
    if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
      console.log('Sending success message via wujie bus');
      window.$wujie.bus.$emit('componentAdded', {
        success: true,
        nodeId: (newNode as any).id,
        nodeType: nodeType,
        message: `成功添加 "${componentData.name || nodeType}" 组件`
      });
    }
  } catch (error) {
    console.error('Error adding component:', error);
    
    // 通过wujie bus发送错误消息回主应用
    if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
      window.$wujie.bus.$emit('componentAdded', {
        success: false,
        error: (error as Error).message,
        message: `添加组件失败: ${(error as Error).message}`
      });
    }
  }
};

// 处理添加组件的消息（公共接口）
export const handleAddComponent = (componentData: any) => {
  // 如果文档不可用，将请求加入等待队列
  if (!globalDocument) {
    console.log('Document not ready, adding request to pending queue:', componentData);
    pendingRequests.push(componentData);
    return;
  }
  
  // 如果文档可用，直接处理请求
  handleAddComponentInternal(componentData);
};

// 初始化微前端通信
export const initWujieCommunication = (ctx?: FreeLayoutPluginContext) => {
  console.log('Initializing Wujie communication with context:', ctx);
  
  // 设置全局上下文
  if (ctx) {
    setGlobalContext(ctx);
  }
  
  // 监听来自主应用的wujie bus消息
  if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
    console.log('Setting up wujie bus listeners');
    window.$wujie.bus.$on('addWorkflowComponent', (payload) => {
      console.log('Received addWorkflowComponent via wujie bus:', payload);
      handleAddComponent(payload);
    });
  }

  // 通知主应用子应用已准备就绪
  if (window.$wujie && typeof window.$wujie.bus !== 'undefined') {
    console.log('Sending appReady message via wujie bus');
    window.$wujie.bus.$emit('appReady', { ready: true });
  }
  
  console.log('Wujie communication initialized');
};