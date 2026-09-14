/**
 * Gaia Workflow API Service
 * Communicates with the Spring Boot backend at /api/*
 * Uses getApiBaseUrl() for dynamic server address configuration
 */

import { getApiBaseUrl } from '../utils/apiConfig';

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

export interface GaiaWorkflow {
  id?: number;
  workflowCode: string;
  workflowName: string;
  workflowDesc?: string;
  currentVersionId?: number;
  templateCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GaiaWorkflowTemplate {
  id?: number;
  templateCode: string;
  templateName: string;
  templateDesc?: string;
  templateData?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GaiaWorkflowVersion {
  id?: number;
  workflowCode: string;
  versionNumber: string;
  versionDesc?: string;
  workflowData?: string;
  createdBy?: string;
  createdAt?: string;
  isCurrent?: number;
}

export interface GaiaWorkflowLog {
  id?: number;
  workflowCode: string;
  versionNumber: string;
  executionId: string;
  startTime?: string;
  endTime?: string;
  status: string;
  inputParams?: string;
  outputParams?: string;
  errorMessage?: string;
  executionDuration?: number;
  createdAt?: string;
}

/** 对外发布的 API 元信息（前端文档/看板消费） */
export interface GaiaApiMeta {
  workflowCode: string;
  apiName?: string;
  apiDesc?: string;
  versionNumber?: string;
  apiPath?: string;
  status?: 'published' | 'draft';
  apiKey?: string; // 仅发布/重置时返回明文
  apiKeyMasked?: string;
  requestSchema?: { type: string; properties?: Record<string, { type?: string; description?: string }> };
  responseSchema?: any;
  errorCodes?: Array<{ code: string; message: string; description: string }>;
  createdAt?: string;
  updatedAt?: string;
}

/** 调用看板统计 */
export interface ApiStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  successRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  trend: Array<{ date: string; calls: number; success: number; failed: number; avgDurationMs: number }>;
  failureDistribution: Array<{ reason: string; count: number }>;
  /** 统计窗口（近 N 天）与起止日期，由后端回传，便于前端确认过滤口径 */
  days?: number;
  from?: string;
  to?: string;
}

/** 看板的单条调用记录 */
export interface RecentCall {
  id?: number;
  executionId?: string;
  workflowCode?: string;
  versionNumber?: string;
  status?: string;
  durationMs?: number;
  errorMessage?: string;
  apiKeyPrefix?: string;
  startTime?: string;
  createdAt?: string;
}

export const workflowApi = {
  // Workflow CRUD
  listWorkflows: () => request<GaiaWorkflow[]>('/workflow/list'),
  getWorkflowById: (id: number) => request<GaiaWorkflow>(`/workflow/${id}`),
  getWorkflowByCode: (code: string) => request<GaiaWorkflow>(`/workflow/code/${code}`),
  createWorkflow: (workflow: GaiaWorkflow) =>
    request<boolean>('/workflow/create', { method: 'POST', body: JSON.stringify(workflow) }),
  updateWorkflow: (workflow: GaiaWorkflow) =>
    request<boolean>('/workflow/update', { method: 'PUT', body: JSON.stringify(workflow) }),
  deleteWorkflow: (id: number) =>
    request<boolean>(`/workflow/delete/${id}`, { method: 'DELETE' }),

  // Template CRUD
  listTemplates: () => request<GaiaWorkflowTemplate[]>('/template/list'),
  getTemplateById: (id: number) => request<GaiaWorkflowTemplate>(`/template/${id}`),
  createTemplate: (template: GaiaWorkflowTemplate) =>
    request<boolean>('/template/create', { method: 'POST', body: JSON.stringify(template) }),
  updateTemplate: (template: GaiaWorkflowTemplate) =>
    request<boolean>('/template/update', { method: 'PUT', body: JSON.stringify(template) }),
  deleteTemplate: (id: number) =>
    request<boolean>(`/template/delete/${id}`, { method: 'DELETE' }),

  // Version CRUD
  listVersions: (workflowCode: string) =>
    request<GaiaWorkflowVersion[]>(`/workflow-version/list/${workflowCode}`),
  getVersionById: (id: number) => request<GaiaWorkflowVersion>(`/workflow-version/${id}`),
  createVersion: (version: GaiaWorkflowVersion) =>
    request<boolean>('/workflow-version/create', { method: 'POST', body: JSON.stringify(version) }),
  updateVersion: (version: GaiaWorkflowVersion) =>
    request<boolean>('/workflow-version/update', { method: 'PUT', body: JSON.stringify(version) }),
  deleteVersion: (id: number) =>
    request<boolean>(`/workflow-version/delete/${id}`, { method: 'DELETE' }),
  setCurrentVersion: (id: number) =>
    request<boolean>(`/workflow-version/set-current/${id}`, { method: 'PUT' }),

  // Log CRUD
  listLogs: (workflowCode: string) =>
    request<GaiaWorkflowLog[]>(`/workflow-log/list/${workflowCode}`),
  getLogById: (id: number) => request<GaiaWorkflowLog>(`/workflow-log/${id}`),
  deleteLog: (id: number) =>
    request<boolean>(`/workflow-log/delete/${id}`, { method: 'DELETE' }),

  /**
   * AI 一次成型通道：把整份 DSL 直接写成一个新版本并设为生效版本。
   * 对应后端 POST /api/workflow-version/apply/{workflowCode}
   */
  applyDsl: (
    workflowCode: string,
    dsl: unknown,
    options: { workflowName?: string; workflowDesc?: string; versionDesc?: string; createIfMissing?: boolean } = {}
  ) =>
    request<Record<string, any>>(`/workflow-version/apply/${workflowCode}`, {
      method: 'POST',
      body: JSON.stringify({
        dsl,
        workflowName: options.workflowName,
        workflowDesc: options.workflowDesc,
        versionDesc: options.versionDesc,
        createIfMissing: options.createIfMissing ?? true,
      }),
    }),

  // Execute workflow
  executeWorkflow: (workflowCode: string, inputs: Record<string, any>) =>
    request<{ success: boolean; data?: any; message: string }>(
      `/execute/${workflowCode}`,
      { method: 'POST', body: JSON.stringify(inputs) }
    ),

  // ---------- 对话创建 API 模式 ----------
  /** 发布为 API */
  publishApi: (workflowCode: string, apiName?: string, apiDesc?: string) =>
    request<GaiaApiMeta>('/workflow-api/publish', {
      method: 'POST',
      body: JSON.stringify({ workflowCode, apiName, apiDesc }),
    }),
  /** 下架 API */
  unpublishApi: (workflowCode: string) =>
    request<{ success: boolean }>(`/workflow-api/unpublish/${workflowCode}`, { method: 'POST' }),
  /** 重新生成 API Key（返回明文） */
  regenerateApiKey: (workflowCode: string) =>
    request<GaiaApiMeta>(`/workflow-api/regenerate-key/${workflowCode}`, { method: 'POST' }),
  /** 已发布 API 列表 */
  listApis: () => request<GaiaApiMeta[]>('/workflow-api/list'),
  /** 单个 API 元信息（未发布时返回 { published:false }） */
  getApiMeta: (workflowCode: string) =>
    request<GaiaApiMeta & { published?: boolean }>(`/workflow-api/${workflowCode}`),
  /** 调用看板：全部 API 聚合（days = 近 N 天） */
  getApiStatsOverview: (days = 30) => request<ApiStats>(`/workflow-api/stats/overview?days=${days}`),
  /** 调用看板：单个 API */
  getApiStats: (workflowCode: string, days = 30) =>
    request<ApiStats>(`/workflow-api/stats/${workflowCode}?days=${days}`),
  /** 调用看板：最近调用明细（支持按 API / 时间窗口 / 状态过滤） */
  getRecentCalls: (params: { workflowCode?: string; days?: number; status?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.workflowCode) q.set('workflowCode', params.workflowCode);
    q.set('days', String(params.days ?? 30));
    if (params.status) q.set('status', params.status);
    q.set('limit', String(params.limit ?? 50));
    return request<RecentCall[]>(`/workflow-api/recent-calls?${q.toString()}`);
  },

  // Health check
  health: () => request<{ status: string; message: string; timestamp: number }>('/health'),
};
