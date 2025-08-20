/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface IFormItem<T = any> {
  value: T;
}

export enum FormItemEventName {
  onFormValueChange = 'onFormValueChange',
  onFormItemInit = 'onFormItemInit',
}

export type FormModelValid = boolean | null;

export type FeedbackStatus = 'error' | 'warning' | 'pending';
export type FeedbackText = string;

export interface FormItemFeedback {
  feedbackStatus?: FeedbackStatus;
  feedbackText?: FeedbackText;
}

export interface FormFeedback {
  feedbackStatus?: FeedbackStatus;
  feedbackText?: FeedbackText;
  path: string;
}

export interface FormItemDomRef {
  current: HTMLElement | null;
}
