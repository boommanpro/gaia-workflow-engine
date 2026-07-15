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

  // Execute workflow
  executeWorkflow: (workflowCode: string, inputs: Record<string, any>) =>
    request<{ success: boolean; data?: any; message: string }>(
      `/execute/${workflowCode}`,
      { method: 'POST', body: JSON.stringify(inputs) }
    ),

  // Health check
  health: () => request<{ status: string; message: string; timestamp: number }>('/health'),
};
