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
    const url = new URL(apiBaseUrl);
    return {
      domain: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', ''),
      pathname: url.pathname !== '/' ? url.pathname : undefined,
    };
  } catch (error) {
    console.warn('Failed to parse API base URL, using default config:', error);
    // 如果解析失败，返回默认配置
    return {
      domain: process.env.REACT_APP_SERVER_DOMAIN as string,
      port: parseInt(process.env.REACT_APP_SERVER_PORT as string),
      protocol: process.env.REACT_APP_SERVER_PROTOCOL,
      pathname: process.env.REACT_APP_SERVER_PATHNAME,
    };
  }
};

export const DEFAULT_SERVER_CONFIG: ServerConfig = parseApiBaseUrl();