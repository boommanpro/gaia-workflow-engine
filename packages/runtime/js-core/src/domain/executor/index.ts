import { FlowGramNode } from '@flowgram.ai/runtime-interface';
import {
  ExecutionContext,
  ExecutionResult,
  IExecutor,
  INodeExecutor,
  INodeExecutorFactory,
} from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimeExecutor implements IExecutor {
  private nodeExecutors: Map<FlowGramNode, INodeExecutor> = new Map();

  constructor(nodeExecutors: INodeExecutorFactory[]) {
    // register node executors
    nodeExecutors.forEach((executor) => {
      this.register(new executor());
    });
  }

  public register(executor: INodeExecutor): void {
    this.nodeExecutors.set(executor.type, executor);
  }

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const nodeType = context.node.type;
    const nodeExecutor = this.nodeExecutors.get(nodeType);
    if (!nodeExecutor) {
      throw new Error(`no executor found for node type ${nodeType}`);
    }
    const output = await nodeExecutor.execute(context);
    return output;
  }
}
