/**
 * API 配置管理
 * 统一管理 API 基础地址的获取逻辑
 * 支持运行时通过 localStorage 配置（用于 GitHub Pages 部署 + 自定义后端场景）
 */

export const getApiBaseUrl = (): string => {
  // 1. 优先从 localStorage 获取用户设置的服务器地址
  const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
  if (storedApiBaseUrl) {
    return storedApiBaseUrl;
  }

  // 2. 开发环境（rsbuild dev server port 3000）使用相对路径，由代理转发
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return '/api';
  }

  // 3. 生产环境默认本地后端
  return 'http://127.0.0.1:48080/api';
};

// 用于动态更新 API 基础 URL 的函数
export const updateApiBaseUrl = (newBaseUrl: string): void => {
  localStorage.setItem('apiBaseUrl', newBaseUrl);
};

// 获取完整的 API 端点 URL
export const getApiEndpoint = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
    return baseUrl + endpoint.substring(1);
  } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
    return `${baseUrl}/${endpoint}`;
  } else {
    return baseUrl + endpoint;
  }
};
