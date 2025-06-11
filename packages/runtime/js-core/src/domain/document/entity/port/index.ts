import {
  WorkflowPortType,
  CreatePortParams,
  IEdge,
  INode,
  IPort,
} from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimePort implements IPort {
  public readonly id: string;

  public readonly node: INode;

  public readonly type: WorkflowPortType;

  private readonly _edges: IEdge[];

  constructor(params: CreatePortParams) {
    const { id, node } = params;
    this.id = id;
    this.node = node;
    this.type = params.type;
    this._edges = [];
  }

  public get edges() {
    return this._edges;
  }

  public addEdge(edge: IEdge) {
    this._edges.push(edge);
  }
}
