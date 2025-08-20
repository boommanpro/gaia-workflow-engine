/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowGramAPIName,
  IRuntimeClient,
  TaskCancelDefine,
  TaskCancelInput,
  TaskCancelOutput,
  TaskReportDefine,
  TaskReportInput,
  TaskReportOutput,
  TaskResultDefine,
  TaskResultInput,
  TaskResultOutput,
  TaskRunDefine,
  TaskRunInput,
  TaskRunOutput,
  TaskValidateDefine,
  TaskValidateInput,
  TaskValidateOutput,
} from '@flowgram.ai/runtime-interface';
import { injectable } from '@flowgram.ai/free-layout-editor';

import { ServerConfig } from '../../type';
import type { ServerError } from './type';
import { DEFAULT_SERVER_CONFIG } from './constant';

@injectable()
export class WorkflowRuntimeServerClient implements IRuntimeClient {
  private config: ServerConfig = DEFAULT_SERVER_CONFIG;

  constructor() {}

  public init(config: ServerConfig) {
    this.config = config;
  }

  public async [FlowGramAPIName.TaskRun](input: TaskRunInput): Promise<TaskRunOutput | undefined> {
    return this.request<TaskRunOutput>(TaskRunDefine.path, TaskRunDefine.method, {
      body: input,
      errorMessage: 'TaskRun failed',
    });
  }

  public async [FlowGramAPIName.TaskReport](
    input: TaskReportInput
  ): Promise<TaskReportOutput | undefined> {
    return this.request<TaskReportOutput>(TaskReportDefine.path, TaskReportDefine.method, {
      queryParams: { taskID: input.taskID },
      errorMessage: 'TaskReport failed',
    });
  }

  public async [FlowGramAPIName.TaskResult](
    input: TaskResultInput
  ): Promise<TaskResultOutput | undefined> {
    return this.request<TaskResultOutput>(TaskResultDefine.path, TaskResultDefine.method, {
      queryParams: { taskID: input.taskID },
      errorMessage: 'TaskResult failed',
      fallbackValue: { success: false },
    });
  }

  public async [FlowGramAPIName.TaskCancel](input: TaskCancelInput): Promise<TaskCancelOutput> {
    const result = await this.request<TaskCancelOutput>(
      TaskCancelDefine.path,
      TaskCancelDefine.method,
      {
        body: input,
        errorMessage: 'TaskCancel failed',
        fallbackValue: { success: false },
      }
    );
    return result ?? { success: false };
  }

  public async [FlowGramAPIName.TaskValidate](
    input: TaskValidateInput
  ): Promise<TaskValidateOutput | undefined> {
    return this.request<TaskValidateOutput>(TaskValidateDefine.path, TaskValidateDefine.method, {
      body: input,
      errorMessage: 'TaskValidate failed',
    });
  }

  // Generic request method to reduce code duplication
  private async request<T>(
    path: string,
    method: string,
    options: {
      body?: unknown;
      queryParams?: Record<string, string>;
      errorMessage: string;
      fallbackValue?: T;
    }
  ): Promise<T | undefined> {
    try {
      const url = this.url(path, options.queryParams);
      const requestOptions: RequestInit = {
        method,
        redirect: 'follow',
      };

      if (options.body) {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
        requestOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, requestOptions);
      const output: T | ServerError = await response.json();

      if (this.isError(output)) {
        console.error(options.errorMessage, output);
        return options.fallbackValue;
      }

      return output;
    } catch (error) {
      console.error(error);
      return options.fallbackValue;
    }
  }

  // Build URL with query parameters
  private url(path: string, queryParams?: Record<string, string>): string {
    const baseURL = this.getURL(`/api${path}`);
    if (!queryParams) {
      return baseURL;
    }

    const searchParams = new URLSearchParams(queryParams);
    return `${baseURL}?${searchParams.toString()}`;
  }

  private isError(output: unknown | undefined): output is ServerError {
    return !!output && (output as ServerError).code !== undefined;
  }

  private getURL(path: string): string {
    const protocol = this.config.protocol ?? window.location.protocol;
    const host = this.config.port
      ? `${this.config.domain}:${this.config.port}`
      : this.config.domain;
    return `${protocol}://${host}${path}`;
  }
}
