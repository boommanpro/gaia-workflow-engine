import { PositionSchema } from './xy';

export interface WorkflowNodeMetaSchema {
  position: PositionSchema;
  canvasPosition?: PositionSchema;
}
