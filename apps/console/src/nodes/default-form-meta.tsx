/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormRenderProps, FormMeta, ValidateTrigger } from '@flowgram.ai/free-layout-editor';
import {
  autoRenameRefEffect,
  provideJsonSchemaOutputs,
  syncVariableTitle,
  DisplayOutputs,
  validateFlowValue,
  validateWhenVariableSync,
  listenRefSchemaChange,
} from '@flowgram.ai/form-materials';
import { getNodeScope } from '@flowgram.ai/editor';
import { Divider } from '@douyinfe/semi-ui';

import { FlowNodeJSON } from '../typings';
import { FormHeader, FormContent, FormInputs } from '../form-components';

/**
 * 模板值校验（本地实现，替换 form-materials 的 validateFlowValue template 分支）：
 * 官方 getTemplateKeyPaths 用 slice(2,-2).split('.') 拆 key 段且不 trim——
 * `{{ start_1.text }}`（带空格）会拆出 [' start_1','text '] 而查不到变量，
 * 误报 "Unknown Variable" 并拦住试运行（后端校验与渲染两种写法都接受）。
 * 这里提取时按边界 \s* 收敛并 trim 各段，与后端 TEMPLATE_TOKEN 同口径。
 */
function validateTemplateFlowValue(
  value: any,
  ctx: {
    node: any;
    required: boolean;
    errorMessages?: { required?: string; unknownVariable?: string };
  }
): string | undefined {
  const { node, required, errorMessages } = ctx;
  const requiredMessage = errorMessages?.required ?? 'Field is required';
  const unknownMessage = errorMessages?.unknownVariable ?? 'Unknown Variable';
  const content = value?.content;
  if (required && (content == null || content === '')) {
    return requiredMessage;
  }
  if (!value || value.type !== 'template' || typeof content !== 'string') {
    return undefined;
  }
  const tokenReg = /\{\{\s*([^{}]+?)\s*}}/g;
  const seen = new Set<string>();
  let token: RegExpExecArray | null;
  while ((token = tokenReg.exec(content))) {
    const keyPath = token[1].split('.').map((segment) => segment.trim());
    const key = keyPath.join('.');
    if (seen.has(key)) continue;
    seen.add(key);
    if (!resolveKeyPath(node, keyPath)) {
      return `${unknownMessage}: {{${key}}}（画布上没有该节点/字段）`;
    }
  }
  return undefined;
}

/**
 * 变量树按 keyPath 查找；尾段为 length/size 时按「父路径存在」放行——
 * 后端 CollectionLengthAccessor 支持 collection/string 的 length/size 只读访问
 * （运行时合法），但 flowgram 变量树不暴露该成员，直接查会误报 Unknown。
 */
function resolveKeyPath(node: any, keyPath: string[]): boolean {
  if (getNodeScope(node).available.getByKeyPath(keyPath)) {
    return true;
  }
  const last = keyPath[keyPath.length - 1];
  if ((last === 'length' || last === 'size') && keyPath.length > 1) {
    return !!getNodeScope(node).available.getByKeyPath(keyPath.slice(0, -1));
  }
  return false;
}

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => (
  <>
    <FormHeader />
    <FormContent>
      <FormInputs />
      <Divider />
      <DisplayOutputs displayFromScope />
    </FormContent>
  </>
);

export const defaultFormMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  /**
   * Supported writing as:
   * 1: validate as options: { title: () => {} , ... }
   * 2: validate as dynamic function: (values,  ctx) => ({ title: () => {}, ... })
   */
  validate: {
    title: ({ value }) => (value ? undefined : 'Title is required'),
    'inputsValues.*': ({ value, context, formValues, name }) => {
      const valuePropertyKey = name.replace(/^inputsValues\./, '');
      const required = formValues.inputs?.required || [];

      // template 类型走本地宽容校验（官方实现对 {{ x.y }} 带空格形式误报 Unknown）；
      // 其余类型（constant/ref）沿用官方校验（ref 的 Unknown Variable 检查仍然生效）
      if (value && typeof value === 'object' && value.type === 'template') {
        return validateTemplateFlowValue(value, {
          node: context.node,
          required: required.includes(valuePropertyKey),
          errorMessages: { required: `${valuePropertyKey} is required` },
        });
      }
      return validateFlowValue(value, {
        node: context.node,
        required: required.includes(valuePropertyKey),
        errorMessages: { required: `${valuePropertyKey} is required` },
      });
    },
  },
  /**
   * Initialize (fromJSON) data transformation
   * 初始化(fromJSON) 数据转换
   * @param value
   * @param ctx
   */
  formatOnInit: (value, ctx) => value,
  /**
   * Save (toJSON) data transformation
   * 保存(toJSON) 数据转换
   * @param value
   * @param ctx
   */
  formatOnSubmit: (value, ctx) => value,
  effect: {
    title: syncVariableTitle,
    outputs: provideJsonSchemaOutputs,
    inputsValues: [...autoRenameRefEffect, ...validateWhenVariableSync({ scope: 'public' })],
    'inputsValues.*': listenRefSchemaChange((params) => {
      console.log(`[${params.context.node.id}][${params.name}] Schema Of Ref Updated`);
    }),
  },
};
