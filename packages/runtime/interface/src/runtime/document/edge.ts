import { IPort } from './port';
import { INode } from './node';

export interface IEdge {
  id: string;
  from: INode;
  to: INode;
  fromPort: IPort;
  toPort: IPort;
}

export interface CreateEdgeParams {
  id: string;
  from: INode;
  to: INode;
}
