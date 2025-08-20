/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '../../typings';

export interface Strategy<Value = any> {
  hit: (schema: IJsonSchema) => boolean;
  Renderer: React.FC<RendererProps<Value>>;
}

export interface RendererProps<Value = any> {
  value?: Value;
  onChange?: (value: Value) => void;
  readonly?: boolean;
}

export interface PropsType extends RendererProps {
  schema: IJsonSchema;
  strategies?: Strategy[];
  [key: string]: any;
}
