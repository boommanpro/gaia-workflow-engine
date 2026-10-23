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
    throw new Error(await extractError(response));
  }
  return response.json();
}

/** 优先提取后端错误信息（{ message | error | msg }），拿不到再退回 HTTP 状态描述 */
async function extractError(response: Response): Promise<string> {
  const fallback = `API Error: ${response.status} ${response.statusText}`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    const body = JSON.parse(text);
    const message = body?.message ?? body?.error ?? body?.msg;
    return typeof message === 'string' && message.trim() ? message : fallback;
  } catch {
    return fallback;
  }
}

export interface GaiaWorkflow {
  id?: number;
  workflowCode: string;
  workflowName: string;
  workflowDesc?: string;
  currentVersionId?: number;
  templateCode?: string;
  /** 所属项目（agent_work_folder.id）；null=未分组。会话落版新建的工作流自动继承会话所在项目 */
  folderId?: number | null;
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

/** 子流程节点可嵌入的工作流选项（GET /workflow/subflow-options） */
export interface SubflowOption {
  code: string;
  name: string;
  description?: string;
  currentVersionId?: number;
  /** 工作流入参 schema（来自 start 节点 outputs） */
  inputs?: { type?: string; properties?: Record<string, { type?: string; title?: string }> };
  /** 工作流出参 schema（来自 end 节点 inputs） */
  outputs?: { type?: string; properties?: Record<string, { type?: string; title?: string }> };
}

/** 版本差异响应（GET /workflow-version/diff/{id}）：diff 数组是 id/边键列表，标题看 nodeTitles */
export interface WorkflowVersionDiffResponse {
  /** 版本不存在时的错误标记 */
  error?: string;
  workflowCode: string;
  versionNumber: string;
  previousVersionNumber?: string | null;
  diff: {
    nodes: { added?: string[]; removed?: string[]; changed?: string[] };
    edges: { added?: string[]; removed?: string[] };
  };
  nodeTitles?: Record<string, string>;
}

/** 运行历史记录（GET /task/runs，第一档 B：持久化的试运行实例） */
export interface WorkflowRunRecord {
  id: number;
  taskId: string;
  workflowCode?: string | null;
  status: string;
  errorMessage?: string | null;
  inputsJson?: string | null;
  outputsJson?: string | null;
  nodeCount?: number | null;
  durationMs?: number | null;
  triggerChannel?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
}

/** 节点级执行明细（GET /task/runs/{taskId} 的 nodes 项） */
export interface WorkflowNodeRunRecord {
  id: number;
  runTaskId: string;
  nodeId: string;
  nodeType?: string | null;
  title?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  inputsJson?: string | null;
  outputJson?: string | null;
  timeCostMs?: number | null;
}

/** 运行详情响应 */
export interface WorkflowRunDetailResponse {
  run: WorkflowRunRecord;
  nodes: WorkflowNodeRunRecord[];
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
  /** 子流程（workflow 节点）可选清单：含当前生效版的入参(start.outputs)/出参(end.inputs) schema */
  listSubflowOptions: () => request<SubflowOption[]>('/workflow/subflow-options'),
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
  /** 版本差异（与上一版对比）：后端落版时已算好存 diff_json，旧版本现场计算 */
  getVersionDiff: (id: number) => request<WorkflowVersionDiffResponse>(`/workflow-version/diff/${id}`),
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

  // 运行历史（持久化的试运行记录，第一档 B）
  listTaskRuns: async (workflowCode?: string, page = 1, size = 20): Promise<WorkflowRunRecord[]> => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (workflowCode) qs.set('workflowCode', workflowCode);
    const res = await request<{ records?: WorkflowRunRecord[]; total?: number }>(
      `/task/runs?${qs.toString()}`
    );
    return res?.records ?? [];
  },
  getTaskRunDetail: (taskId: string) =>
    request<WorkflowRunDetailResponse>(`/task/runs/${taskId}`),

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
  /** 发布为 API。sessionKey 可选：由 AI 会话产物走出来的发布传入，成功后在会话里落 release 产物卡 */
  publishApi: (workflowCode: string, apiName?: string, apiDesc?: string, sessionKey?: string | null) =>
    request<GaiaApiMeta>('/workflow-api/publish', {
      method: 'POST',
      body: JSON.stringify({ workflowCode, apiName, apiDesc, sessionKey: sessionKey || undefined }),
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
