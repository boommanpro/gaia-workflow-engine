import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INodeExecutor,
} from '@flowgram.ai/runtime-interface';

export class StartExecutor implements INodeExecutor {
  public type = FlowGramNode.Start;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return {
      outputs: context.runtime.ioCenter.inputs,
    };
  }
}
