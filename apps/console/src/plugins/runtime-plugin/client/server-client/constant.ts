/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ServerConfig } from '../../type';
import { getApiBaseUrl } from '../../../../utils/apiConfig';

// 从API基础URL解析域名、协议、端口和路径
const parseApiBaseUrl = (): ServerConfig => {
  const apiBaseUrl = getApiBaseUrl();
  try {
    // 处理相对URL（如 /api），拼接当前页面 origin
    const fullUrl = apiBaseUrl.startsWith('http')
      ? apiBaseUrl
      : `${window.location.origin}${apiBaseUrl}`;
    const url = new URL(fullUrl);
    return {
      domain: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', ''),
      pathname: url.pathname !== '/' ? url.pathname : undefined,
    };
  } catch (error) {
    console.warn('Failed to parse API base URL, using current origin:', error);
    // 解析失败时，使用当前页面的 origin 作为默认值
    return {
      domain: window.location.hostname,
      port: window.location.port ? parseInt(window.location.port) : (window.location.protocol === 'https:' ? 443 : 80),
      protocol: window.location.protocol.replace(':', ''),
      pathname: '/api',
    };
  }
};

export const DEFAULT_SERVER_CONFIG: ServerConfig = parseApiBaseUrl();