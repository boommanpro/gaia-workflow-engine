/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { FormModel, IFormMeta, NodeContext } from '@flowgram.ai/form-core';
import { FieldName, FieldValue } from '@flowgram.ai/form';
import {
  FormRenderProps,
  IForm,
  Validate as FormValidate,
  ValidateTrigger,
} from '@flowgram.ai/form';

import { FormPlugin } from './form-plugin';
import { FormModelV2 } from './form-model-v2';

export interface Node {}

export interface Flow {}

export type Validate<TFieldValue = any, TFormValues = any> = (props: {
  value: TFieldValue;
  formValues: TFormValues;
  context: NodeContext;
  name: FieldName;
}) => ReturnType<FormValidate<TFieldValue, TFormValues>>;

export enum DataEvent {
  /* When value change */
  onValueChange = 'onValueChange',
  /**
   * When value Init，it triggers when
   * - defaultValue is configured in formMeta, it will trigger when form is initializing.
   * - defaultValue is configured in Field, it will trigger when this Field is initializing if no initial value is set to this field.
   */
  onValueInit = 'onValueInit',
  /**
   * When Value Init or change
   */
  onValueInitOrChange = 'onValueInitOrChange',
  /* It will trigger when ArrayField.append is called. It relies on ArrayField's rendering. If ArrayField is possibly not rendered in your case, please avoid using this event */
  onArrayAppend = 'onArrayAppend',
  /* It will trigger when ArrayField.delete is called. It relies on ArrayField's rendering. If ArrayField is possibly not rendered in your case, please avoid using this event */
  onArrayDelete = 'onArrayDelete',
}

export type EffectReturn = () => void;

export interface EffectFuncProps<TFieldValue = any, TFormValues = any> {
  name: FieldName;
  value: TFieldValue;
  prevValue?: TFieldValue;
  formValues: TFormValues;
  form: IForm;
  context: NodeContext;
}

export type Effect<TFieldValue = any, TFormValues = any> = (
  props: EffectFuncProps<TFieldValue, TFormValues>
) => void | EffectReturn;

export type ArrayAppendEffect<TFieldValue = any, TFormValues = any> = (props: {
  index: number;
  value: TFieldValue;
  arrayValues: Array<TFieldValue>;
  formValues: TFormValues;
  form: IForm;
  context: NodeContext;
}) => void | EffectReturn;

export type ArrayDeleteEffect<TFieldValue = any, TFormValues = any> = (props: {
  index: number;
  arrayValue: Array<TFieldValue>;
  formValues: TFormValues;
  form: IForm;
  context: NodeContext;
}) => void | EffectReturn;

export type EffectOptions =
  | { effect: Effect; event: DataEvent }
  | { effect: ArrayAppendEffect; event: DataEvent }
  | { effect: ArrayDeleteEffect; event: DataEvent };

export interface FormMeta<TValues = any> {
  /**
   * The render method of the node form content. <Form /> is already integrated, so you don't need to wrap your components with <Form />
   * @param props
   */
  render: (props: FormRenderProps<any>) => React.ReactElement;
  /**
   * When to trigger the validation.
   */
  validateTrigger?: ValidateTrigger;
  /**
   * Form data's validation rules. It's a key value map, where the key is a pattern of data's path (or field name), the value is a validate function.
   */
  validate?:
    | Record<FieldName, Validate>
    | ((values: TValues, ctx: NodeContext) => Record<FieldName, Validate>);
  /**
   * Form data's effects. It's a key value map, where the key is a pattern of data's path (or field name), the value is an array of effect configuration.
   */
  effect?: Record<FieldName, EffectOptions[]>;
  /**
   * Form data's complete default value. it will not be sent to formatOnInit, but used directly as form's value when needed.
   */
  defaultValues?: TValues | ((context: NodeContext) => TValues);
  /**
   * This function is to format the value when initiate the form, the returned value will be used as the initial value of the form.
   * @param value value input to node as initialValue.
   * @param context
   */
  formatOnInit?: (value: any, context: NodeContext) => any;
  /**
   * This function is to format the value when FormModel.toJSON is called, the returned value will be used as the final value to be saved .
   * @param value value sent by form before format.
   * @param context
   */
  formatOnSubmit?: (value: any, context: NodeContext) => any;
  /**
   * Form's plugins
   */
  plugins?: FormPlugin[];
}

export function isFormModelV2(fm: FormModel | FormModelV2): fm is FormModelV2 {
  return 'onFormValuesChange' in fm;
}

export function isFormMetaV2(formMeta: IFormMeta | FormMeta) {
  return 'render' in formMeta;
}

export type FormPluginCtx = {
  formModel: FormModelV2;
} & NodeContext;

export type FormPluginSetupMetaCtx = {
  mergeEffect: (effect: Record<string, EffectOptions[]>) => void;
  mergeValidate: (validate: Record<FieldName, Validate>) => void;
  addFormatOnInit: (formatOnInit: FormMeta['formatOnInit']) => void;
  addFormatOnSubmit: (formatOnSubmit: FormMeta['formatOnSubmit']) => void;
} & NodeContext;

export interface onFormValueChangeInPayload<TValue = FieldValue, TFormValues = FieldValue> {
  value: TValue;
  prevValue: TValue;
  formValues: TFormValues;
  prevFormValues: TFormValues;
}
