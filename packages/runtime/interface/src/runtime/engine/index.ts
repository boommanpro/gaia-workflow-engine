import { ITask } from '../task';
import { IExecutor } from '../executor';
import { INode } from '../document';
import { IContext } from '../context';
import { InvokeParams } from '../base';

export interface EngineServices {
  Executor: IExecutor;
}

export interface IEngine {
  invoke(params: InvokeParams): ITask;
  executeNode(params: { context: IContext; node: INode }): Promise<void>;
}

export const IEngine = Symbol.for('Engine');
