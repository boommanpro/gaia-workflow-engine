import {
  ContainerService,
  IContainer,
  IEngine,
  IExecutor,
  IValidation,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeNodeExecutors } from '@nodes/index';
import { WorkflowRuntimeValidation } from '../validation';
import { WorkflowRuntimeExecutor } from '../executor';
import { WorkflowRuntimeEngine } from '../engine';

export class WorkflowRuntimeContainer implements IContainer {
  constructor(private readonly services: Record<string, ContainerService>) {}

  public get<T = ContainerService>(key: any): T {
    return this.services[key] as T;
  }

  private static _instance: IContainer;

  public static get instance(): IContainer {
    if (this._instance) {
      return this._instance;
    }
    const services = this.create();
    this._instance = new WorkflowRuntimeContainer(services);
    return this._instance;
  }

  private static create(): Record<symbol, ContainerService> {
    // services
    const Validation = new WorkflowRuntimeValidation();
    const Executor = new WorkflowRuntimeExecutor(WorkflowRuntimeNodeExecutors);
    const Engine = new WorkflowRuntimeEngine({
      Executor,
    });

    return {
      [IValidation]: Validation,
      [IExecutor]: Executor,
      [IEngine]: Engine,
    };
  }
}
