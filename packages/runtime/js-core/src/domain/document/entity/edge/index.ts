import {
  WorkflowEdgeSchema,
  CreateEdgeParams,
  IEdge,
  INode,
  IPort,
} from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimeEdge implements IEdge {
  public readonly id: string;

  public readonly from: INode;

  public readonly to: INode;

  private _fromPort: IPort;

  private _toPort: IPort;

  constructor(params: CreateEdgeParams) {
    const { id, from, to } = params;
    this.id = id;
    this.from = from;
    this.to = to;
  }

  public get fromPort() {
    return this._fromPort;
  }

  public set fromPort(port: IPort) {
    this._fromPort = port;
  }

  public get toPort() {
    return this._toPort;
  }

  public set toPort(port: IPort) {
    this._toPort = port;
  }

  public static createID(schema: WorkflowEdgeSchema): string {
    const { sourceNodeID, sourcePortID, targetNodeID, targetPortID } = schema;
    const sourcePart = sourcePortID ? `${sourceNodeID}:${sourcePortID}` : sourceNodeID;
    const targetPart = targetPortID ? `${targetNodeID}:${targetPortID}` : targetNodeID;
    return `${sourcePart}-${targetPart}`;
  }
}
