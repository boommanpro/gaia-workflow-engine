import { isNil } from 'lodash-es';
import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  IEngine,
  INodeExecutor,
  IVariableParseResult,
  WorkflowVariableType,
} from '@flowgram.ai/runtime-interface';

type LoopArray = Array<any>;

export interface LoopExecutorInputs {
  batchFor: LoopArray;
}

export class LoopExecutor implements INodeExecutor {
  public type = FlowGramNode.Loop;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const loopNodeID = context.node.id;
    const loopArrayResult = context.runtime.state.parseRef<LoopArray>(context.node.data.batchFor)!;
    this.checkLoopArray(loopArrayResult);

    const loopArray = loopArrayResult.value;
    const itemsType = loopArrayResult.itemsType!;
    const engine = context.container.get<IEngine>(IEngine);
    const subNodes = context.node.children;
    const startSubNodes = subNodes.filter((node) => node.prev.length === 0);

    if (loopArray.length === 0 || startSubNodes.length === 0) {
      return {
        outputs: {},
      };
    }

    // not use Array method to make error stack more concise, and better performance
    for (let i = 0; i < loopArray.length; i++) {
      const loopItem = loopArray[i];
      const subContext = context.runtime.sub();
      subContext.variableStore.setVariable({
        nodeID: `${loopNodeID}_locals`,
        key: 'item',
        type: itemsType,
        value: loopItem,
      });
      await Promise.all(
        startSubNodes.map((node) =>
          engine.executeNode({
            context: subContext,
            node,
          })
        )
      );
    }

    return {
      outputs: {},
    };
  }

  private checkLoopArray(loopArrayResult: IVariableParseResult<LoopArray> | null): void {
    const loopArray = loopArrayResult?.value;
    if (!loopArray || isNil(loopArray) || !Array.isArray(loopArray)) {
      throw new Error('batchFor is required');
    }
    const loopArrayType = loopArrayResult.type;
    if (loopArrayType !== WorkflowVariableType.Array) {
      throw new Error('batchFor must be an array');
    }
    const loopArrayItemType = loopArrayResult.itemsType;
    if (isNil(loopArrayItemType)) {
      throw new Error('batchFor items must be array items');
    }
  }
}
