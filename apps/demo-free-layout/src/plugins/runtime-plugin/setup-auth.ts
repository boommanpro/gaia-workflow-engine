/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * 设置认证信息
 * 该函数用于从Vue主应用接收认证信息并将其传递给React微应用
 * @param authorization 完整的认证头信息，例如: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function setupAuthorization(authorization: string | null): void {
  // 将认证信息存储到全局对象中，供插件系统使用
  (window as any).WORKFLOW_AUTHORIZATION = authorization;
  
  // 如果有认证信息，记录日志
  if (authorization) {
    console.log('Authorization token received and set for workflow runtime');
  } else {
    console.log('Authorization token cleared for workflow runtime');
  }
}

/**
 * 获取当前设置的认证信息
 * @returns 当前的认证头信息
 */
export function getAuthorization(): string | null {
  return (window as any).WORKFLOW_AUTHORIZATION || null;
}