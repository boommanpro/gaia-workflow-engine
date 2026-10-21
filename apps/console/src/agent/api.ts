/**
 * Agent 后端 API 封装
 */
import { getApiBaseUrl } from '../utils/apiConfig';
import { isReplayActive, replayRequest } from './replay/replay-driver';
import type { AgentSession, AgentMessage, WorkFolder } from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isReplayActive()) {
    return replayRequest<T>(path);
  }
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
  stopRun: (sessionKey: string) =>
    request<boolean>(`/agent/session/${sessionKey}/stop`, { method: 'POST' }),
  /** 回答 ask_user 提问（唤醒挂起的工具调用继续 run） */
  answerAsk: (sessionKey: string, askId: string, answer: string) =>
    request<{ ok: boolean }>(
      `/agent/session/${encodeURIComponent(sessionKey)}/ask/${encodeURIComponent(askId)}/answer`,
      { method: 'POST', body: JSON.stringify({ answer }) }
    ),
  /** 当前服务端画布草稿（会话切换时恢复产物渲染） */
  getSessionDocument: (sessionKey: string) =>
    request<any>(`/agent/session/${sessionKey}/document`),
  /** 会话产物列表（workflow / plan / test_report / release） */
  getArtifacts: (sessionKey: string) =>
    request<import('./types').AgentArtifactDto[]>(`/agent/session/${sessionKey}/artifacts`),
  /** 手动压缩会话历史（前半段摘要为一条 user 前情摘要，被压缩消息退出模型上下文） */
  compactSession: (sessionKey: string) =>
    request<{ compacted: boolean; message?: string; removed?: number; kept?: number; tokenPercentage?: number; estimatedTokens?: number; limit?: number }>(
      `/agent/session/${encodeURIComponent(sessionKey)}/compact`,
      { method: 'POST' },
    ),
  /** 版本历史条目 AI 摘要（右上角版本记录用；失败前端退回规则摘要） */
  snapshotSummaries: (sessionKey: string, snapshots: unknown[]) =>
    request<{ success: boolean; summaries?: Record<string, string>; error?: string }>(
      `/agent/session/${encodeURIComponent(sessionKey)}/snapshot-summaries`,
      { method: 'POST', body: JSON.stringify({ snapshots }) },
    ),

  // ===== 模型配置（owb 式多模型）=====
  listModels: () => request<{ items: any[]; activeModelId: number | null; globalThinking: string; compactionThreshold?: number; engineMode?: string }>(
    '/agent/models'),
  saveModel: (entry: Record<string, unknown>) =>
    request<{ success: boolean; id?: number; error?: string }>('/agent/models',
      { method: 'POST', body: JSON.stringify(entry) }),
  deleteModel: (id: number) =>
    request<{ success: boolean; error?: string }>(`/agent/models/${id}`, { method: 'DELETE' }),
  setActiveModel: (id: number | null) =>
    request<{ success: boolean; activeModelId: number | null }>('/agent/models/active',
      { method: 'POST', body: JSON.stringify({ id }) }),
  thinkingLevels: (modelId?: number) =>
    request<{ levels: { level: string; supported: boolean; note: string }[] }>(
      `/agent/models/thinking-levels${modelId ? `?modelId=${modelId}` : ''}`),
  setGlobalThinking: (level: string) =>
    request<{ success: boolean; globalThinking: string }>('/agent/models/thinking',
      { method: 'POST', body: JSON.stringify({ level }) }),
  setCompactionThreshold: (percent: number) =>
    request<{ success: boolean; compactionThreshold: number; error?: string }>('/agent/models/compaction-threshold',
      { method: 'POST', body: JSON.stringify({ percent }) }),
  testModel: (body: { id?: number; baseUrl?: string; apiKey?: string; modelId?: string }) =>
    request<{ success: boolean; latencyMs?: number; error?: string }>('/agent/models/test',
      { method: 'POST', body: JSON.stringify(body) }),
  modelHealth: () =>
    request<{ items: { model: string; total: number; errors: number; successRate: number; avgLatencyMs: number; healthy: boolean }[] }>(
      '/agent/models/health'),
  getSessionModel: (sessionKey: string) =>
    request<{ modelId: number | null; activeModelId: number | null; model?: any }>(
      `/agent/session/${sessionKey}/model`),
  setSessionModel: (sessionKey: string, modelId: number | null) =>
    request<{ success: boolean; modelId: number | null }>(
      `/agent/session/${sessionKey}/model`, { method: 'POST', body: JSON.stringify({ modelId }) }),

  /** 保存为版本（用户动作）：把当前会话草稿落为工作流版本（AI 无落版工具） */
  saveDraftAsVersion: (
    sessionKey: string,
    opts?: { workflowCode?: string; name?: string; versionDesc?: string; baseRevision?: number },
  ) =>
    request<{ success: boolean; message?: string; workflowCode?: string; versionNumber?: string; revision?: number; nodeCount?: number; error?: string }>(
      `/agent/session/${sessionKey}/save`,
      { method: 'POST', body: JSON.stringify(opts ?? {}) },
    ),

  /** 基于工作流当前落版初始化会话草稿（「基于工作流迭代」入口） */
  seedDraft: (sessionKey: string, workflowCode: string) =>
    request<{ success: boolean; versionNumber?: string; nodeCount?: number; error?: string }>(
      `/agent/session/${sessionKey}/seed-draft`,
      { method: 'POST', body: JSON.stringify({ workflowCode }) },
    ),

  /** 前端画布草稿回推：以本地画布为准更新服务端会话草稿（回滚后/提问前/保存前对齐） */
  pushDraft: (
    sessionKey: string,
    body: { dsl: unknown; workflowCode?: string; source?: string },
  ) =>
    request<{ success: boolean; nodeCount?: number; boundCode?: string | null; baseRevision?: number | null; error?: string }>(
      `/agent/session/${sessionKey}/push-draft`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  // 调试信息持久化
  saveDebugData: (sessionKey: string, debugData: string) =>
    request<boolean>(`/agent/session/${sessionKey}/debug`, {
      method: 'PUT',
      body: JSON.stringify({ debugData }),
    }),
  getDebugData: async (sessionKey: string): Promise<string> => {
    if (isReplayActive()) return '';
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

  // ===== 会话级观测 API（轨迹回放数据源）=====
  /** 会话的 run 列表（从 agent_session_event 派生：终态/失败链/时间账） */
  getSessionRuns: (sessionKey: string) =>
    request<any[]>(`/agent/metrics/sessions/${sessionKey}/runs?limit=100`),
  /** 会话事件流（跨 run，追加只写） */
  getSessionEvents: (sessionKey: string, limit = 500) =>
    request<any[]>(`/agent/metrics/sessions/${sessionKey}/events?limit=${limit}`),
  /** AgentScope Service 远端会话快照（as-service 引擎；Trajectory「Service 对话」视图数据源） */
  getAsServiceSession: (sessionKey: string) =>
    request<{
      linked: boolean;
      remoteSessionId?: string;
      remoteAgentId?: string;
      snapshot?: {
        items?: Array<{
          created_at?: number;
          data?: {
            item?: {
              type?: string;
              role?: string;
              status?: string;
              content?: Array<{
                type?: string;
                text?: string;
                name?: string;
                input?: unknown;
                output?: Array<{ text?: string }>;
                state?: string;
              }>;
            };
          };
        }>;
        session?: { status?: string };
        usage?: Record<string, unknown>;
      };
      snapshotError?: string;
    }>(`/agent/metrics/sessions/${sessionKey}/as-service`),
  /** LLM 调用账本（generation 级：prompt/输出摘要、usage、耗时、结局；limit 上限 1000） */
  getRunLlmCalls: (sessionKey: string, runId?: string, limit = 200) =>
    request<any[]>(
      `/agent/metrics/sessions/${sessionKey}/llm-calls?limit=${limit}${runId ? `&runId=${encodeURIComponent(runId)}` : ''}`
    ),
  /** 会话上下文容量（对话页「上下文容量」卡）：最近一次调用的真实规模 + 分类占比 + 缓存命中 + 压缩真线 */
  getContextStats: (sessionKey: string) =>
    request<{
      usedTokens: number;
      estimated: boolean;
      breakdown?: { systemPrompt: number; tools: number; messages: number; other: number };
      cacheHitRate?: number;
      sampledCalls?: number;
      lastCallAt?: string;
      model?: string;
      /** 模型上下文窗口（容量占比的分母，与压缩决策同源） */
      contextWindow?: number;
      /** 跨 run 压缩触发线（tokens）—— 容量药丸的出现/告警线，前端不算数 */
      compactThreshold?: number;
      /** 全会话对话调用累计账（旁路调用不计入） */
      session?: { promptTokens: number; cachedTokens: number; completionTokens: number };
    }>(`/agent/metrics/sessions/${sessionKey}/context-stats`),
  /** 按 run 聚合的单轮用量账本（「本轮用量」明细卡：输入/缓存/输出拆分 + 模型） */
  getTurnUsage: (sessionKey: string) =>
    request<
      Array<{
        runId: string;
        calls: number;
        promptTokens: number;
        cachedTokens: number;
        completionTokens: number;
        durationMs: number;
        model?: string;
        lastCallAt?: string;
      }>
    >(`/agent/metrics/sessions/${sessionKey}/turn-usage`),

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

  // Agent 配置
  listConfigs: (configType?: string) =>
    request<any[]>(`/agent/config/list${configType ? `?configType=${configType}` : ''}`),
  saveConfig: (config: any, applyImmediately = false) =>
    request<any>(`/agent/config/save${applyImmediately ? '?applyImmediately=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // 工具定义
  listToolDefinitions: (toolGroup?: string) =>
    request<any[]>(`/agent/tool-definition/list${toolGroup ? `?toolGroup=${toolGroup}` : ''}`),
  saveToolDefinition: (def: any) =>
    request<any>('/agent/tool-definition/save', { method: 'POST', body: JSON.stringify(def) }),

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
