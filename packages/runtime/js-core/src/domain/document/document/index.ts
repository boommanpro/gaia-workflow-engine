import {
  type WorkflowSchema,
  FlowGramNode,
  type IDocument,
  type IEdge,
  type INode,
} from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';
import { flatSchema } from './flat-schema';
import { createStore, DocumentStore } from './create-store';

export class WorkflowRuntimeDocument implements IDocument {
  public readonly id: string;

  private store: DocumentStore;

  constructor() {
    this.id = uuid();
  }

  public get root(): INode {
    const rootNode = this.getNode(FlowGramNode.Root);
    if (!rootNode) {
      throw new Error('Root node not found');
    }
    return rootNode;
  }

  public get start(): INode {
    const startNode = this.nodes.find((n) => n.type === FlowGramNode.Start);
    if (!startNode) {
      throw new Error('Start node not found');
    }
    return startNode;
  }

  public get end(): INode {
    const endNode = this.nodes.find((n) => n.type === FlowGramNode.End);
    if (!endNode) {
      throw new Error('End node not found');
    }
    return endNode;
  }

  public getNode(id: string): INode | null {
    return this.store.nodes.get(id) ?? null;
  }

  public getEdge(id: string): IEdge | null {
    return this.store.edges.get(id) ?? null;
  }

  public get nodes(): INode[] {
    return Array.from(this.store.nodes.values());
  }

  public get edges(): IEdge[] {
    return Array.from(this.store.edges.values());
  }

  public init(schema: WorkflowSchema): void {
    const flattenSchema = flatSchema(schema);
    this.store = createStore(flattenSchema);
  }

  public dispose(): void {
    this.store.edges.clear();
    this.store.nodes.clear();
    this.store.ports.clear();
  }
}
