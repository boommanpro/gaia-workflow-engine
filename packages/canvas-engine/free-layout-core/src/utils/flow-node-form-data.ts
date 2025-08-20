/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeFormData } from '@flowgram.ai/form-core';
import { FlowNodeEntity, FlowNodeJSON } from '@flowgram.ai/document';

import { type WorkflowDocument } from '../workflow-document';
import { WorkflowContentChangeType, type WorkflowNodeRegistry } from '../typings';

export function getFlowNodeFormData(node: FlowNodeEntity) {
  return node.getData(FlowNodeFormData) as FlowNodeFormData;
}

export function toFormJSON(node: FlowNodeEntity) {
  const formData = node.getData(FlowNodeFormData) as FlowNodeFormData;
  if (!formData || !(node.getNodeRegistry() as WorkflowNodeRegistry).formMeta) return undefined;
  return formData.toJSON();
}

export function initFormDataFromJSON(
  node: FlowNodeEntity,
  json: FlowNodeJSON,
  isFirstCreate: boolean
) {
  const formData = node.getData(FlowNodeFormData)!;
  const registry = node.getNodeRegistry();
  const { formMeta } = registry;

  if (formData && formMeta) {
    if (isFirstCreate) {
      formData.createForm(formMeta, json.data);
      formData.onDataChange(() => {
        (node.document as WorkflowDocument).fireContentChange({
          type: WorkflowContentChangeType.NODE_DATA_CHANGE,
          toJSON: () => formData.toJSON(),
          entity: node,
        });
      });
    } else {
      formData.updateFormValues(json.data);
    }
  }
}
