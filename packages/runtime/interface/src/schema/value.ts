// TODO copy packages/materials/form-materials/src/typings/flow-value/index.ts

export interface IFlowConstantValue {
  type: 'constant';
  content?: string | number | boolean;
}

export interface IFlowRefValue {
  type: 'ref';
  content?: string[];
}

export interface IFlowExpressionValue {
  type: 'expression';
  content?: string;
}

export interface IFlowTemplateValue {
  type: 'template';
  content?: string;
}

export type IFlowValue =
  | IFlowConstantValue
  | IFlowRefValue
  | IFlowExpressionValue
  | IFlowTemplateValue;

export type IFlowConstantRefValue = IFlowConstantValue | IFlowRefValue;
