/**
 * API 配置管理
 * 统一管理 API 基础地址的获取逻辑
 */

export const getApiBaseUrl = (): string => {
  // 优先从 localStorage 获取用户设置的服务器地址
  const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
  if (storedApiBaseUrl) {
    return storedApiBaseUrl;
  }

  // 如果有自定义环境变量则使用
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  // 开发环境使用默认地址
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'http://127.0.0.1:48080/api';
  }

  // 生产环境使用后端服务 - 如果在微前端环境中，可能需要从主应用获取配置
  return 'http://127.0.0.1:48080/api';
};

export const API_BASE_URL = getApiBaseUrl();

// 用于动态更新API基础URL的函数
export const updateApiBaseUrl = (newBaseUrl: string): void => {
  localStorage.setItem('apiBaseUrl', newBaseUrl);
  // 注意：由于JavaScript的限制，我们无法动态更新已经导出的常量API_BASE_URL
  // 所以应用程序应该始终使用getApiBaseUrl()函数来获取最新的URL
  console.log(`API基础URL已更新为: ${newBaseUrl}`);
  
  // 触发全局事件通知其他模块更新
  window.dispatchEvent(new CustomEvent('apiBaseUrlChanged', { detail: newBaseUrl }));
};

// 获取完整的API端点URL
export const getApiEndpoint = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // 确保baseUrl和endpoint正确拼接
  if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
    return baseUrl + endpoint.substring(1);
  } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
    return `${baseUrl}/${endpoint}`;
  } else {
    return baseUrl + endpoint;
  }
};
