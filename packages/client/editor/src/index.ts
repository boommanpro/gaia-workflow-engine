/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import 'reflect-metadata';
import { FormModelV2 } from '@flowgram.ai/node';

/* 核心 模块导出 */
export * from '@flowgram.ai/utils';
export * from '@flowgram.ai/core';
export * from '@flowgram.ai/document';
export * from '@flowgram.ai/renderer';
export * from '@flowgram.ai/variable-plugin';
export * from '@flowgram.ai/shortcuts-plugin';
export * from '@flowgram.ai/node-core-plugin';
export * from '@flowgram.ai/i18n-plugin';
export {
  ReactiveState,
  ReactiveBaseState,
  Tracker,
  useReactiveState,
  useReadonlyReactiveState,
  useObserve,
  observe,
} from '@flowgram.ai/reactive';
export {
  type interfaces,
  injectable,
  postConstruct,
  named,
  Container,
  ContainerModule,
  AsyncContainerModule,
  inject,
  multiInject,
} from 'inversify';

export { FlowNodeFormData, NodeRender, type NodeRenderProps } from '@flowgram.ai/form-core';

export type {
  FormState,
  FieldState,
  FieldArrayRenderProps,
  FieldRenderProps,
  FormRenderProps,
  Validate,
  FormControl,
  FieldName,
  FieldError,
  FieldWarning,
  IField,
  IFieldArray,
  IForm,
  Errors,
  Warnings,
} from '@flowgram.ai/form';

export {
  Form,
  Field,
  FieldArray,
  useForm,
  useField,
  useCurrentField,
  useCurrentFieldState,
  useFieldValidate,
  useWatch,
  ValidateTrigger,
  FeedbackLevel,
} from '@flowgram.ai/form';
export * from '@flowgram.ai/node';
export { FormModelV2 as FormModel };

/**
 * 固定布局模块导出
 */
export * from './preset';
export * from './components';
export * from './hooks';
export * from './clients';

/**
 * Plugin 导出
 */

export * from '@flowgram.ai/node-variable-plugin';

export { createPlaygroundReactPreset } from '@flowgram.ai/playground-react';
