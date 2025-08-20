/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MaybePromise } from '@flowgram.ai/utils';

import { FieldName } from './field';
import { Context } from './common';

export enum FeedbackLevel {
  Error = 'error',
  Warning = 'warning',
}

export interface Feedback<FeedbackLevel> {
  /**
   * The data path (or field path) that generate this feedback
   */
  name: string;
  /**
   * The type of the feedback
   */
  type?: string;
  /**
   * Feedback level
   */
  level: FeedbackLevel;
  /**
   * Feedback message
   */
  message: string | React.ReactNode;
}

export type FieldError = Feedback<FeedbackLevel.Error>;
export type FieldWarning = Feedback<FeedbackLevel.Warning>;

export type FormErrorOptions = Omit<FieldError, 'name'>;
export type FormWarningOptions = Omit<FieldWarning, 'name'>;
export type FeedbackOptions<FeedbackLevel> = Omit<Feedback<FeedbackLevel>, 'name'>;

export type Validate<TFieldValue = any, TFormValues = any> = (props: {
  /**
   * Value of the data to validate
   */
  value: TFieldValue;
  /**
   * Complete form values
   */
  formValues: TFormValues;
  /**
   * The path of the data we are validating
   */
  name: FieldName;
  /**
   * The custom context set when init form
   */
  context: Context;
}) =>
  | MaybePromise<string>
  | MaybePromise<FormErrorOptions>
  | MaybePromise<FormWarningOptions>
  | MaybePromise<undefined>;

export function isFieldError(f: Feedback<any>): f is FieldError {
  if (f.level === FeedbackLevel.Error) {
    return true;
  }
  return false;
}

export function isFieldWarning(f: Feedback<any>): f is FieldWarning {
  if (f.level === FeedbackLevel.Warning) {
    return true;
  }
  return false;
}

export type Errors = Record<FieldName, FieldError[]>;
export type Warnings = Record<FieldName, FieldWarning[]>;

export enum ValidateTrigger {
  onChange = 'onChange',
  onBlur = 'onBlur',
}

export type FormValidateReturn = (FieldError | FieldWarning)[];
