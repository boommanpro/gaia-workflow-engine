/**
 * Agent 后端 API 封装
 */
import { getApiBaseUrl, getAbsoluteApiUrl } from '../utils/apiConfig';
import type { AgentSession, AgentMessage, PermissionPolicy, WorkFolder } from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const agentApi = {
  // 会话管理
  listSessions: (params?: {
    scope?: string;
    keyword?: string;
    folderId?: number;
    unfiled?: boolean;
    includeArchived?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.scope) qs.set('scope', params.scope);
    if (params?.keyword) qs.set('keyword', params.keyword);
    if (params?.folderId != null) qs.set('folderId', String(params.folderId));
    if (params?.unfiled) qs.set('unfiled', 'true');
    if (params?.includeArchived) qs.set('includeArchived', 'true');
    if (params?.page != null) qs.set('page', String(params.page));
    if (params?.pageSize != null) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<AgentSession[]>(`/agent/session/list${q ? `?${q}` : ''}`);
  },
  /** 会话标记（置顶/归档），只更新传入字段 */
  updateSessionFlags: (sessionKey: string, flags: { pinned?: boolean; archived?: boolean }) =>
    request<boolean>(`/agent/session/${sessionKey}/flags`, {
      method: 'PUT',
      body: JSON.stringify(flags),
    }),
  createSession: (title?: string, opts?: { scope?: 'chat' | 'work'; folderId?: number | null }) =>
    request<AgentSession>('/agent/session/create', {
      method: 'POST',
      body: JSON.stringify({ title, scope: opts?.scope, folderId: opts?.folderId ?? undefined }),
    }),
  renameSession: (sessionKey: string, title: string) =>
    request<boolean>('/agent/session/rename', {
      method: 'PUT',
      body: JSON.stringify({ sessionKey, title }),
    }),
  deleteSession: (sessionKey: string) =>
    request<boolean>(`/agent/session/${sessionKey}`, { method: 'DELETE' }),
  getMessages: (sessionKey: string) =>
    request<AgentMessage[]>(`/agent/session/${sessionKey}/messages`),

  // ===== 会话级后端自治运行（纯后端 / 多窗口 / 关窗继续） =====

  /** 触发一次后端自治运行（异步受理，立即返回；过程事件走 SSE 订阅） */
  startRun: (
    sessionKey: string,
    message: string,
    pageContext: string,
    images?: string[],
    locale?: string,
    agentId?: string
  ) =>
    request<{ accepted: boolean; sessionKey?: string; runId?: string; error?: string }>(
      `/agent/session/${sessionKey}/run`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          pageContext,
          images,
          locale: locale || undefined,
          agentId: agentId || undefined,
        }),
      }
    ),
  /** 停止当前运行（尽力而为） */
  /** 当前挂起的确认（require 模式）：刷新/重连后即时恢复确认卡（不等 20s 心跳） */
  getPendingConfirm: (sessionKey: string): Promise<{
    pending: boolean;
    toolCallId?: string;
    action?: string;
    args?: Record<string, unknown>;
  }> => request(`/agent/session/${encodeURIComponent(sessionKey)}/pending-confirm`),

  stopRun: (sessionKey: string) =>
    request<boolean>(`/agent/session/${sessionKey}/stop`, { method: 'POST' }),
  /** 当前运行快照 */
  getRunStatus: (sessionKey: string) =>
    request<any>(`/agent/session/${sessionKey}/status`),
  /** 当前服务端画布草稿（会话切换时恢复产物渲染） */
  getSessionDocument: (sessionKey: string) =>
    request<any>(`/agent/session/${sessionKey}/document`),
  /** 会话产物列表（workflow / plan / test_report / release） */
  getArtifacts: (sessionKey: string) =>
    request<import('./types').AgentArtifactDto[]>(`/agent/session/${sessionKey}/artifacts`),
  /** 确认 / 拒绝一次等待中的工具调用（confirm require 模式） */
  confirmTool: (sessionKey: string, toolCallId: string, approved: boolean) =>
    request<{ success: boolean; error?: string }>(`/agent/session/${sessionKey}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ toolCallId, approved }),
    }),
  /** 基于工作流当前落版初始化会话草稿（「基于工作流迭代」入口） */
  seedDraft: (sessionKey: string, workflowCode: string) =>
    request<{ success: boolean; versionNumber?: string; nodeCount?: number; error?: string }>(
      `/agent/session/${sessionKey}/seed-draft`,
      { method: 'POST', body: JSON.stringify({ workflowCode }) },
    ),

  // 调试信息持久化
  saveDebugData: (sessionKey: string, debugData: string) =>
    request<boolean>(`/agent/session/${sessionKey}/debug`, {
      method: 'PUT',
      body: JSON.stringify({ debugData }),
    }),
  getDebugData: async (sessionKey: string): Promise<string> => {
    // debug 接口可能返回空 body（debugData 为 null），不能用通用 request 的 response.json()
    const url = `${getApiBaseUrl()}/agent/session/${sessionKey}/debug`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'string' ? parsed : text;
    } catch {
      return text;
    }
  },

  // 会话审查（人工标记）
  updateReview: (sessionKey: string, review: {
    reviewRating?: string | null;
    reviewIssue?: string | null;
    reviewStatus?: string;
    reviewFixNote?: string | null;
  }) =>
    request<boolean>(`/agent/session/${sessionKey}/review`, {
      method: 'PUT',
      body: JSON.stringify(review),
    }),
  // 导出链接用于浏览器外部（curl/新窗口），必须是绝对 URL（含协议+主机+端口）
  exportSessionUrl: (sessionKey: string) =>
    getAbsoluteApiUrl(`/agent/session/${sessionKey}/export?pretty=true`),

  // 工作空间（文件夹分组的对话）
  listFolders: () => request<WorkFolder[]>('/agent/workspace/folders'),
  createFolder: (name: string) =>
    request<WorkFolder>('/agent/workspace/folder', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  renameFolder: (id: number, name: string) =>
    request<boolean>(`/agent/workspace/folder/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteFolder: (id: number) =>
    request<boolean>(`/agent/workspace/folder/${id}`, { method: 'DELETE' }),
  setSessionFolder: (sessionKey: string, folderId: number | null) =>
    request<boolean>(`/agent/workspace/session/${sessionKey}/folder`, {
      method: 'PUT',
      body: JSON.stringify({ folderId }),
    }),

  // 权限管理
  getPermissions: (sessionKey: string) =>
    request<Record<string, PermissionPolicy>>(`/agent/permission/${sessionKey}`),
  updatePermission: (sessionKey: string, action: string, policy: PermissionPolicy) =>
    request<boolean>('/agent/permission', {
      method: 'PUT',
      body: JSON.stringify({ sessionKey, action, policy }),
    }),
  getPermissionDefaults: () =>
    request<Record<string, PermissionPolicy>>('/agent/permission/defaults'),

  // 全局权限（默认策略）
  getGlobalPermissions: () =>
    request<Record<string, PermissionPolicy>>('/agent/permission/global'),
  updateGlobalPermission: (action: string, policy: PermissionPolicy) =>
    request<boolean>('/agent/permission/global', {
      method: 'PUT',
      body: JSON.stringify({ action, policy }),
    }),

  // Agent 配置
  listConfigs: (configType?: string) =>
    request<any[]>(`/agent/config/list${configType ? `?configType=${configType}` : ''}`),
  getConfig: (configKey: string) =>
    request<any>(`/agent/config/${configKey}`),
  saveConfig: (config: any, applyImmediately = false) =>
    request<any>(`/agent/config/save${applyImmediately ? '?applyImmediately=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  deleteConfig: (configKey: string) =>
    request<boolean>(`/agent/config/${configKey}`, { method: 'DELETE' }),
  getConfigHistory: (configKey: string) =>
    request<any[]>(`/agent/config/${configKey}/history`),
  revertConfig: (configKey: string, version: number) =>
    request<any>(`/agent/config/${configKey}/revert/${version}`, { method: 'POST' }),

  // 知识库
  listKnowledge: (keyword?: string) =>
    request<any[]>(`/agent/knowledge/list${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`),
  getKnowledge: (id: number) =>
    request<any>(`/agent/knowledge/${id}`),
  saveKnowledge: (chunk: any) =>
    request<any>('/agent/knowledge/save', { method: 'POST', body: JSON.stringify(chunk) }),
  deleteKnowledge: (id: number) =>
    request<boolean>(`/agent/knowledge/${id}`, { method: 'DELETE' }),
  searchKnowledge: (query: string, topK?: number, lang?: string) =>
    request<any[]>('/agent/knowledge/search', { method: 'POST', body: JSON.stringify({ query, topK: topK || 5, lang }) }),
  reembedAll: () =>
    request<any>('/agent/knowledge/reembed-all', { method: 'POST' }),

  // 知识图谱
  listGraphNodes: (nodeType?: string, keyword?: string) => {
    const params = new URLSearchParams();
    if (nodeType) params.set('nodeType', nodeType);
    if (keyword) params.set('keyword', keyword);
    const qs = params.toString();
    return request<any[]>(`/agent/graph/node/list${qs ? `?${qs}` : ''}`);
  },
  getGraphNode: (nodeKey: string) =>
    request<any>(`/agent/graph/node/${nodeKey}`),
  saveGraphNode: (node: any) =>
    request<any>('/agent/graph/node/save', { method: 'POST', body: JSON.stringify(node) }),
  deleteGraphNode: (nodeKey: string) =>
    request<boolean>(`/agent/graph/node/${nodeKey}`, { method: 'DELETE' }),
  listGraphEdges: (sourceKey?: string, targetKey?: string, edgeType?: string) => {
    const params = new URLSearchParams();
    if (sourceKey) params.set('sourceKey', sourceKey);
    if (targetKey) params.set('targetKey', targetKey);
    if (edgeType) params.set('edgeType', edgeType);
    const qs = params.toString();
    return request<any[]>(`/agent/graph/edge/list${qs ? `?${qs}` : ''}`);
  },
  saveGraphEdge: (edge: any) =>
    request<any>('/agent/graph/edge/save', { method: 'POST', body: JSON.stringify(edge) }),
  deleteGraphEdge: (id: number) =>
    request<boolean>(`/agent/graph/edge/${id}`, { method: 'DELETE' }),

  // 工具定义
  listToolDefinitions: (toolGroup?: string) =>
    request<any[]>(`/agent/tool-definition/list${toolGroup ? `?toolGroup=${toolGroup}` : ''}`),
  getToolDefinition: (toolName: string) =>
    request<any>(`/agent/tool-definition/${toolName}`),
  saveToolDefinition: (def: any) =>
    request<any>('/agent/tool-definition/save', { method: 'POST', body: JSON.stringify(def) }),
  deleteToolDefinition: (toolName: string) =>
    request<boolean>(`/agent/tool-definition/${toolName}`, { method: 'DELETE' }),
  refreshTools: () =>
    request<any>('/agent/tool-definition/refresh', { method: 'POST' }),

  // 配置导出/导入（用于线上升级迁移）
  exportConfig: async (): Promise<string> => {
    const url = `${getApiBaseUrl()}/agent/config/export`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    // 后端返回 attachment JSON，直接读取文本
    return response.text();
  },
  importConfig: (json: string) =>
    request<Record<string, number>>('/agent/config/import', {
      method: 'POST',
      body: json,
    }),
};
