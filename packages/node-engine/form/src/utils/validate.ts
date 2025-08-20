/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Errors,
  Feedback,
  FeedbackLevel,
  FieldError,
  FieldName,
  FieldWarning,
  FormErrorOptions,
  FormWarningOptions,
} from '../types';

export function toFeedback(
  result: string | FormErrorOptions | FormWarningOptions | undefined,
  name: FieldName
): FieldError | FieldWarning | undefined {
  if (typeof result === 'string') {
    return {
      name,
      message: result,
      level: FeedbackLevel.Error,
    };
  } else if (result?.message) {
    return {
      ...result,
      name,
    };
  }
}

export function feedbackToFieldErrorsOrWarnings<T>(name: string, feedback?: Feedback<any>) {
  return {
    [name]: feedback ? [feedback] : [],
  } as T;
}

export const hasError = (errors: Errors) =>
  Object.keys(errors).some((key) => errors[key]?.length > 0);
