/**
 * API 配置管理
 * 统一管理 API 基础地址的获取逻辑
 */

export const getApiBaseUrl = () => {
  // 如果有自定义环境变量则使用
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // 开发环境使用相对路径（通过vite代理）
  if (import.meta.env?.DEV) {
    return '/api'
  }
  // 生产环境使用后端服务
  return 'http://127.0.0.1:48080'
}

export const API_BASE_URL = getApiBaseUrl()
