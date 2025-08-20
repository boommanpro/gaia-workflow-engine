/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/document';

import { FlowNodeFormData } from '../flow-node-form-data';
import { FormModel } from '..';

export function isNodeFormReady(node: FlowNodeEntity) {
  return node.getData<FlowNodeFormData>(FlowNodeFormData).getFormModel<FormModel>().initialized;
}

export function getFormModel(node: FlowNodeEntity) {
  return node.getData<FlowNodeFormData>(FlowNodeFormData).formModel;
}
