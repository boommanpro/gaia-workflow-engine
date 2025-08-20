/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable no-console */
import {
  InvokeParams,
  IContainer,
  IEngine,
  ITask,
  IReport,
  WorkflowOutputs,
  IValidation,
  ValidationResult,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeContainer } from '@workflow/container';

export class WorkflowApplication {
  private container: IContainer;

  public tasks: Map<string, ITask>;

  constructor() {
    this.container = WorkflowRuntimeContainer.instance;
    this.tasks = new Map();
  }

  public run(params: InvokeParams): string {
    const engine = this.container.get<IEngine>(IEngine);
    const task = engine.invoke(params);
    this.tasks.set(task.id, task);
    console.log('> POST TaskRun - taskID: ', task.id);
    console.log(params.inputs);
    task.processing.then((output) => {
      console.log('> LOG Task finished: ', task.id);
      console.log(output);
    });
    return task.id;
  }

  public cancel(taskID: string): boolean {
    console.log('> PUT TaskCancel - taskID: ', taskID);
    const task = this.tasks.get(taskID);
    if (!task) {
      return false;
    }
    task.cancel();
    return true;
  }

  public report(taskID: string): IReport | undefined {
    const task = this.tasks.get(taskID);
    console.log('> GET TaskReport - taskID: ', taskID);
    if (!task) {
      return;
    }
    return task.context.reporter.export();
  }

  public result(taskID: string): WorkflowOutputs | undefined {
    console.log('> GET TaskResult - taskID: ', taskID);
    const task = this.tasks.get(taskID);
    if (!task) {
      return;
    }
    if (!task.context.statusCenter.workflow.terminated) {
      return;
    }
    return task.context.ioCenter.outputs;
  }

  public validate(params: InvokeParams): ValidationResult {
    const validation = this.container.get<IValidation>(IValidation);
    const result = validation.invoke(params);
    console.log('> POST TaskValidate - valid: ', result.valid);
    return result;
  }

  private static _instance: WorkflowApplication;

  public static get instance(): WorkflowApplication {
    if (this._instance) {
      return this._instance;
    }
    this._instance = new WorkflowApplication();
    return this._instance;
  }
}
