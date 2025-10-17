/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum WorkflowPortType {
  Input = 'input',
  Output = 'output',
}

export enum WorkflowVariableType {
  String = 'string',
  Integer = 'integer',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Map = 'map',
  DateTime = 'date-time',
  Null = 'null',
}
