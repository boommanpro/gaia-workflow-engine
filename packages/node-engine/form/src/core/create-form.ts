/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { CreateFormReturn, FormOptions } from '../types/form';
import { Field, FieldArray, FieldName, FieldValue } from '../types';
import { toForm } from './to-form';
import { toFieldArray } from './to-field-array';
import { toField } from './to-field';
import { FormModel } from './form-model';
import { FieldModel } from './field-model';
import { FieldArrayModel } from './field-array-model';

// export interface CreateFormOptions<TValues = any> extends FormOptions<TValues> {
//   parentContainer?: interfaces.Container;
// }

export type CreateFormOptions<T = any> = FormOptions<T> & {
  /**
   * 为 true 时，createForm 不会对form 初始化， 用户需要手动调用 control.init()
   * 该配置主要为了解决，用户需要去监听一些form 的初始化事件，那么他需要再配置完监听后再初始化。
   * 该配置默认为 false
   **/
  disableAutoInit?: boolean;
};

export function createForm<TValues>(
  options?: CreateFormOptions<TValues>
): CreateFormReturn<TValues> {
  const { disableAutoInit = false, ...formOptions } = options || {};
  const formModel = new FormModel();

  if (!disableAutoInit) {
    formModel.init(formOptions || {});
  }

  return {
    form: toForm(formModel),
    control: {
      _formModel: formModel,
      getField: <
        TFieldValue = FieldValue,
        TFieldModel extends Field<TFieldValue> | FieldArray<TFieldValue> = Field
      >(
        name: FieldName
      ) => {
        const fieldModel = formModel.getField(name);
        if (fieldModel) {
          return fieldModel instanceof FieldArrayModel
            ? toFieldArray<TFieldValue>(fieldModel as unknown as FieldArrayModel<TFieldValue>)
            : toField<TFieldValue>(fieldModel as unknown as FieldModel<TFieldValue>);
        }
      },
      init: () => formModel.init(formOptions || {}),
    },
  };
}
