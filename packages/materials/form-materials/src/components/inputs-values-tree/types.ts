/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { ConstantInputStrategy } from '@/components/constant-input';

export interface PropsType {
  value?: any;
  onChange: (value?: any) => void;
  readonly?: boolean;
  hasError?: boolean;
  schema?: IJsonSchema;
  style?: React.CSSProperties;
  constantProps?: {
    strategies?: ConstantInputStrategy[];
    [key: string]: any;
  };
}
