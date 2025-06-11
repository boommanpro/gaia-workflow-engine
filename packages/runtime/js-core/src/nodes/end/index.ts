import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INodeExecutor,
} from '@flowgram.ai/runtime-interface';

export class EndExecutor implements INodeExecutor {
  public type = FlowGramNode.End;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    context.runtime.ioCenter.setOutputs(context.inputs);
    return {
      outputs: context.inputs,
    };
  }
}
