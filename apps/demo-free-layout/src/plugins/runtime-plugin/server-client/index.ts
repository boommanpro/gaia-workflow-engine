import {
  FlowGramAPIName,
  IRuntimeClient,
  TaskCancelInput,
  TaskCancelOutput,
  TaskReportInput,
  TaskReportOutput,
  TaskResultInput,
  TaskResultOutput,
  TaskRunInput,
  TaskRunOutput,
} from '@flowgram.ai/runtime-interface';
import { injectable } from '@flowgram.ai/free-layout-editor';

import type { ServerError } from './type';
import { DEFAULT_SERVER_CONFIG } from './constant';
import { ServerConfig } from '../type';

@injectable()
export class WorkflowRuntimeServerClient implements IRuntimeClient {
  private config: ServerConfig = DEFAULT_SERVER_CONFIG;

  constructor() {}

  public init(config: ServerConfig) {
    this.config = config;
  }

  public async [FlowGramAPIName.TaskRun](input: TaskRunInput): Promise<TaskRunOutput | undefined> {
    try {
      const body = JSON.stringify(input);
      const response = await fetch(this.getURL('/api/task/run'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
        redirect: 'follow',
      });
      const output: TaskRunOutput | ServerError = await response.json();
      if (this.isError(output)) {
        console.error('TaskRun failed', output);
        return;
      }
      return output;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  public async [FlowGramAPIName.TaskReport](
    input: TaskReportInput
  ): Promise<TaskReportOutput | undefined> {
    try {
      const response = await fetch(this.getURL(`/api/task/report?taskID=${input.taskID}`), {
        method: 'GET',
        redirect: 'follow',
      });
      const output: TaskReportOutput | ServerError = await response.json();
      if (this.isError(output)) {
        console.error('TaskReport failed', output);
        return;
      }
      return output;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  public async [FlowGramAPIName.TaskResult](
    input: TaskResultInput
  ): Promise<TaskResultOutput | undefined> {
    try {
      const response = await fetch(this.getURL(`/api/task/result?taskID=${input.taskID}`), {
        method: 'GET',
        redirect: 'follow',
      });
      const output: TaskResultOutput | ServerError = await response.json();
      if (this.isError(output)) {
        console.error('TaskReport failed', output);
        return {
          success: false,
        };
      }
      return output;
    } catch (e) {
      console.error(e);
      return {
        success: false,
      };
    }
  }

  public async [FlowGramAPIName.TaskCancel](input: TaskCancelInput): Promise<TaskCancelOutput> {
    try {
      const body = JSON.stringify(input);
      const response = await fetch(this.getURL(`/api/task/cancel`), {
        method: 'PUT',
        redirect: 'follow',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
      const output: TaskCancelOutput | ServerError = await response.json();
      if (this.isError(output)) {
        console.error('TaskReport failed', output);
        return {
          success: false,
        };
      }
      return output;
    } catch (e) {
      console.error(e);
      return {
        success: false,
      };
    }
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
