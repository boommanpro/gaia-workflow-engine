import { WorkflowSchema } from '@schema/index';
import { INode } from './node';
import { IEdge } from './edge';

export interface IDocument {
  id: string;
  nodes: INode[];
  edges: IEdge[];
  root: INode;
  start: INode;
  end: INode;
  init(schema: WorkflowSchema): void;
  dispose(): void;
}
