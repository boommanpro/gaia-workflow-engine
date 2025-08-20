/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';

import { isCheckBoxEvent, isReactChangeEvent } from '../utils';
import { Field, FieldModelState } from '../types/field';
import { ValidateTrigger } from '../types';
import { shouldValidate } from './utils';
import { FieldModel } from './field-model';

export function toField<TValue>(model: FieldModel): Field<TValue> {
  const res: Field<TValue> = {
    get name() {
      return model.name;
    },
    get value() {
      return model.value;
    },
    onChange: (e: unknown) => {
      if (isReactChangeEvent(e)) {
        model.value = isCheckBoxEvent(e)
          ? e.target.checked
          : (e as React.ChangeEvent<HTMLInputElement>).target.value;
      } else {
        model.value = e;
      }
    },
    onBlur() {
      if (shouldValidate(ValidateTrigger.onBlur, model.form.validationTrigger)) {
        model.validate();
      }
    },
    onFocus() {
      model.state.isTouched = true;
    },
  } as Field<TValue>;

  Object.defineProperty(res, 'key', {
    enumerable: false,
    get() {
      return model.id;
    },
  });

  Object.defineProperty(res, '_fieldModel', {
    enumerable: false,
    get() {
      return model;
    },
  });
  return res;
}

export function toFieldState(modelState: FieldModelState) {
  return {
    get isTouched() {
      return modelState.isTouched;
    },
    get invalid() {
      return modelState.invalid;
    },
    get isDirty() {
      return modelState.isDirty;
    },
    get isValidating() {
      return modelState.isValidating;
    },
    get errors() {
      if (modelState.errors) {
        return Object.values(modelState.errors).reduce((acc, arr) => acc.concat(arr), []);
      }
      return;
    },
    get warnings() {
      if (modelState.warnings) {
        return Object.values(modelState.warnings).reduce((acc, arr) => acc.concat(arr), []);
      }
      return;
    },
  };
}
