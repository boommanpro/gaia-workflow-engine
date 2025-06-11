import {
  EngineServices,
  IEngine,
  IExecutor,
  INode,
  WorkflowOutputs,
  IContext,
  InvokeParams,
  ITask,
  FlowGramNode,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeTask } from '../task';
import { WorkflowRuntimeContext } from '../context';
import { WorkflowRuntimeContainer } from '../container';

export class WorkflowRuntimeEngine implements IEngine {
  private readonly executor: IExecutor;

  constructor(service: EngineServices) {
    this.executor = service.Executor;
  }

  public invoke(params: InvokeParams): ITask {
    const context = WorkflowRuntimeContext.create();
    context.init(params);
    const processing = this.process(context);
    processing.then(() => {
      context.dispose();
    });
    return WorkflowRuntimeTask.create({
      processing,
      context,
    });
  }

  public async executeNode(params: { context: IContext; node: INode }) {
    const { node, context } = params;
    if (!this.canExecuteNode({ node, context })) {
      return;
    }
    context.statusCenter.nodeStatus(node.id).process();
    try {
      const inputs = context.state.getNodeInputs(node);
      const snapshot = context.snapshotCenter.create({
        nodeID: node.id,
        data: node.data,
        inputs,
      });
      const result = await this.executor.execute({
        node,
        inputs,
        runtime: context,
        container: WorkflowRuntimeContainer.instance,
      });
      if (context.statusCenter.workflow.terminated) {
        return;
      }
      const { outputs, branch } = result;
      snapshot.addData({ outputs, branch });
      context.state.setNodeOutputs({ node, outputs });
      context.state.addExecutedNode(node);
      context.statusCenter.nodeStatus(node.id).success();
      const nextNodes = this.getNextNodes({ node, branch, context });
      await this.executeNext({ node, nextNodes, context });
    } catch (e) {
      context.statusCenter.nodeStatus(node.id).fail();
      console.error(e);
      return;
    }
  }

  private async process(context: IContext): Promise<WorkflowOutputs> {
    const startNode = context.document.start;
    context.statusCenter.workflow.process();
    try {
      await this.executeNode({ node: startNode, context });
      const outputs = context.ioCenter.outputs;
      context.statusCenter.workflow.success();
      return outputs;
    } catch (e) {
      context.statusCenter.workflow.fail();
      throw e;
    }
  }

  private canExecuteNode(params: { context: IContext; node: INode }) {
    const { node, context } = params;
    const prevNodes = node.prev;
    if (prevNodes.length === 0) {
      return true;
    }
    return prevNodes.every((prevNode) => context.state.isExecutedNode(prevNode));
  }

  private getNextNodes(params: { context: IContext; node: INode; branch?: string }) {
    const { node, branch, context } = params;
    const allNextNodes = node.next;
    if (!branch) {
      return allNextNodes;
    }
    const targetPort = node.ports.outputs.find((port) => port.id === branch);
    if (!targetPort) {
      throw new Error(`branch ${branch} not found`);
    }
    const nextNodeIDs: Set<string> = new Set(targetPort.edges.map((edge) => edge.to.id));
    const nextNodes = allNextNodes.filter((nextNode) => nextNodeIDs.has(nextNode.id));
    const skipNodes = allNextNodes.filter((nextNode) => !nextNodeIDs.has(nextNode.id));
    skipNodes.forEach((skipNode) => {
      context.state.addExecutedNode(skipNode);
    });
    return nextNodes;
  }

  private async executeNext(params: { context: IContext; node: INode; nextNodes: INode[] }) {
    const { context, node, nextNodes } = params;
    if (node.type === FlowGramNode.End) {
      return;
    }
    if (nextNodes.length === 0) {
      // throw new Error(`node ${node.id} has no next nodes`); // inside loop node may have no next nodes
      return;
    }
    await Promise.all(
      nextNodes.map((nextNode) =>
        this.executeNode({
          node: nextNode,
          context,
        })
      )
    );
  }
}
