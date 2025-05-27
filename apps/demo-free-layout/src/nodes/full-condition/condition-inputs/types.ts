import {FlowLiteralValueSchema, FlowRefValueSchema} from "../../../typings";

export interface Condition {
  operator: number;
  left: FlowLiteralValueSchema | FlowRefValueSchema;
  right: FlowLiteralValueSchema | FlowRefValueSchema;
}

export interface ConditionValue {
  logic: number;
  conditions: Condition[];
}

export interface ConditionGroup {
  condition: ConditionValue;
}

export interface GroupProps {
  group: any;
  readonly: boolean;
  groupIndex: number;
  onRemove: (index: number) => void;
}

export interface ConditionItemProps {
  condition: Condition;
  readonly: boolean;
  showRemove: boolean;
  index: number;
  onUpdate: (path: string[], value: any) => void;
  onRemove: () => void;
}

