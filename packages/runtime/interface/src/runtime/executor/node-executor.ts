import { FlowGramNode } from '@node/index';
import { INode } from '../document';
import { IContext } from '../context';
import { IContainer } from '../container';
import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface ExecutionContext {
  node: INode;
  inputs: WorkflowInputs;
  container: IContainer;
  runtime: IContext;
}

export interface ExecutionResult {
  outputs: WorkflowOutputs;
  branch?: string;
}

export interface INodeExecutor {
  type: FlowGramNode;
  execute: (context: ExecutionContext) => Promise<ExecutionResult>;
}

export interface INodeExecutorFactory {
  new (): INodeExecutor;
}
