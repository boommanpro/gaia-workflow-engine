/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { find, mergeWith } from 'lodash-es';
import { FormFeedback, FormPathService } from '@flowgram.ai/form-core';
import type { FieldError, FieldWarning, FormValidateReturn } from '@flowgram.ai/form';
import { type FieldModel, FieldName } from '@flowgram.ai/form';

import { DataEvent, EffectOptions, EffectReturn } from './types';

export function findMatchedInMap<T = any>(
  field: FieldModel<any>,
  validateMap: Record<FieldName, T> | undefined
): T | undefined {
  if (!validateMap) {
    return;
  }
  if (validateMap[field.name]) {
    return validateMap[field.name];
  }

  const found = find(Object.keys(validateMap), (key) => {
    if (key.startsWith('regex:')) {
      const regex = RegExp(key.split(':')[1]);
      return regex.test(field.name);
    }
    return false;
  });

  if (found) {
    return validateMap[found];
  }
}

export function formFeedbacksToNodeCoreFormFeedbacks(
  formFeedbacks: FormValidateReturn
): FormFeedback[] {
  return formFeedbacks.map(
    (f: FieldError | FieldWarning) =>
      ({
        feedbackStatus: f.level,
        feedbackText: f.message,
        path: f.name,
      } as FormFeedback)
  );
}

export function convertGlobPath(path: string) {
  if (path.startsWith('/')) {
    const parts = FormPathService.normalize(path).slice(1).split('/');
    return parts.join('.');
  }
  return path;
}

export function mergeEffectMap(
  origin: Record<string, EffectOptions[]>,
  source: Record<string, EffectOptions[]>
) {
  return mergeWith(origin, source, function (objValue: EffectOptions[], srcValue: EffectOptions[]) {
    return (objValue || []).concat(srcValue);
  });
}

export function mergeEffectReturn(origin?: EffectReturn, source?: EffectReturn): EffectReturn {
  return () => {
    origin?.();
    source?.();
  };
}

export function runAndDeleteEffectReturn(
  effectReturnMap: Map<DataEvent, Record<string, EffectReturn>>,
  name: string,
  events: DataEvent[]
) {
  events.forEach((event) => {
    const eventMap = effectReturnMap.get(event);
    if (eventMap?.[name]) {
      eventMap[name]();
      delete eventMap[name];
    }
  });
}
