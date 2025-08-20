/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { DisposableCollection, Event, MaybePromise } from '@flowgram.ai/utils';
import { type FlowNodeEntity } from '@flowgram.ai/document';

import { FormFeedback, FormModelValid, IFormItem } from '../types';
import { FormManager } from '../services/form-manager';
import { type FormItem } from '.';

export type FormModelFactory = (entity: FlowNodeEntity) => FormModel;
export const FormModelFactory = Symbol('FormModelFactory');
export const FormModelEntity = Symbol('FormModelEntity');

@injectable()
export abstract class FormModel {
  readonly onValidate: Event<FormModel>;

  readonly onValidChange: Event<FormModelValid>;

  readonly onFeedbacksChange: Event<FormFeedback[]>;

  readonly onInitialized: Event<FormModel>;

  protected toDispose: DisposableCollection = new DisposableCollection();

  /**
   * @deprecated
   * use `formModel.node` instead in FormModelV2
   */
  abstract get flowNodeEntity(): FlowNodeEntity;

  /**
   * @deprecated
   */
  abstract get formManager(): FormManager;

  abstract get formMeta(): any;

  abstract get initialized(): boolean;

  abstract get valid(): FormModelValid;

  abstract updateFormValues(value: any): void;

  /**
   * @deprecated
   * use `formModel.getFieldIn` instead in FormModelV2 to get the model of a form field
   * do not use this in FormModelV2 since  it only return an empty Map.
   */
  abstract get formItemPathMap(): Map<string, IFormItem>;

  /**
   * @deprecated
   */
  abstract clearValid(): void;

  abstract validate(): Promise<boolean>;

  abstract validateWithFeedbacks(): Promise<FormFeedback[]>;

  abstract init(formMetaOrFormMetaGenerator: any, initialValue?: any): MaybePromise<void>;

  abstract toJSON(): any;

  /**
   * @deprecated
   * use `formModel.getField` instead in FormModelV2
   */
  abstract getFormItemByPath(path: string): FormItem | undefined;

  /**
   * @deprecated
   * use `formModel.getFieldValue` instead in FormModelV2 to get the model of a form field by path
   */
  abstract getFormItemValueByPath<T = any>(path: string): any | undefined;

  abstract render(): any;

  abstract dispose(): void;
}
