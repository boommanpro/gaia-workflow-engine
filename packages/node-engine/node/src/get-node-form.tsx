/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Disposable, Event } from '@flowgram.ai/utils';
import { FlowNodeFormData, NodeRender, OnFormValuesChangePayload } from '@flowgram.ai/form-core';
import { FieldName, FieldValue, FormState } from '@flowgram.ai/form';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { onFormValueChangeInPayload } from './types';
import { FormModelV2 } from './form-model-v2';

export interface NodeFormProps<TValues> {
  /**
   * The initialValues of the form.
   */
  initialValues: TValues;
  /**
   * Form values. Returns a deep copy of the data in the store.
   */
  values: TValues;
  /**
   * Form state
   */
  state: FormState;
  /**
   * Get value in certain path
   * @param name path
   */
  getValueIn<TValue = FieldValue>(name: FieldName): TValue;

  /**
   * Set value in certain path.
   * It will trigger the re-rendering of the Field Component if a Field is related to this path
   * @param name path
   */
  setValueIn<TValue>(name: FieldName, value: TValue): void;
  /**
   * set form values
   */
  updateFormValues(values: any): void;
  /**
   * Render form
   */
  render: () => React.ReactNode;
  /**
   * Form value change event
   */
  onFormValuesChange: Event<OnFormValuesChangePayload>;
  /**
   * Trigger form validate
   */
  validate: () => Promise<boolean>;
  /**
   * Form validate event
   */
  onValidate: Event<FormState>;
  /**
   * Form field value change event
   */
  onFormValueChangeIn<TValue = FieldValue, TFormValue = FieldValue>(
    name: FieldName,
    callback: (payload: onFormValueChangeInPayload<TValue, TFormValue>) => void
  ): Disposable;
}

/**
 * Only support FormModelV2
 * @param node
 */
export function getNodeForm<TValues = FieldValue>(
  node: FlowNodeEntity
): NodeFormProps<TValues> | undefined {
  const formModel = node.getData<FlowNodeFormData>(FlowNodeFormData)?.getFormModel<FormModelV2>();
  const nativeFormModel = formModel?.nativeFormModel;

  if (!formModel || !nativeFormModel) return undefined;

  const result: NodeFormProps<TValues> = {
    initialValues: nativeFormModel.initialValues,
    get values() {
      return nativeFormModel.values;
    },

    state: nativeFormModel.state,
    getValueIn: (name: FieldName) => nativeFormModel.getValueIn(name),
    setValueIn: (name: FieldName, value: any) => nativeFormModel.setValueIn(name, value),
    updateFormValues: (values: any) => {
      formModel.updateFormValues(values);
    },
    render: () => <NodeRender node={node} />,
    onFormValuesChange: formModel.onFormValuesChange.bind(formModel),
    onFormValueChangeIn: formModel.onFormValueChangeIn.bind(formModel),
    onValidate: formModel.nativeFormModel.onValidate,
    validate: formModel.validate.bind(formModel),
  };

  Object.defineProperty(result, '_formModel', {
    enumerable: false,
    get() {
      return formModel;
    },
  });
  return result;
}
