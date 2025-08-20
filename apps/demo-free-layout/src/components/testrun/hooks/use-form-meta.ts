/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import {
  FlowNodeFormData,
  FormModelV2,
  useService,
  WorkflowDocument,
} from '@flowgram.ai/free-layout-editor';
import { IJsonSchema, JsonSchemaBasicType } from '@flowgram.ai/form-materials';

import { TestRunFormMetaItem } from '../testrun-form/type';
import { WorkflowNodeType } from '../../../nodes';

const getWorkflowInputsDeclare = (document: WorkflowDocument): IJsonSchema => {
  const defaultDeclare = {
    type: 'object',
    properties: {},
  };

  const startNode = document.root.blocks.find(
    (node) => node.flowNodeType === WorkflowNodeType.Start
  );
  if (!startNode) {
    return defaultDeclare;
  }

  const startFormModel = startNode.getData(FlowNodeFormData).getFormModel<FormModelV2>();
  const declare = startFormModel.getValueIn<IJsonSchema>('outputs');

  if (!declare) {
    return defaultDeclare;
  }

  return declare;
};

export const useFormMeta = (): TestRunFormMetaItem[] => {
  const document = useService(WorkflowDocument);

  // Add state for form values
  const formMeta = useMemo(() => {
    const formFields: TestRunFormMetaItem[] = [];
    const workflowInputs = getWorkflowInputsDeclare(document);
    Object.entries(workflowInputs.properties!).forEach(([name, property]) => {
      formFields.push({
        type: property.type as JsonSchemaBasicType,
        name,
        defaultValue: property.default,
        required: workflowInputs.required?.includes(name) ?? false,
        itemsType: property.items?.type as JsonSchemaBasicType,
      });
    });
    return formFields;
  }, [document]);

  return formMeta;
};
