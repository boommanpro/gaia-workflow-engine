/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  ASTFactory,
  createEffectFromVariableProvider,
  FormRenderProps,
  FormMeta,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import { autoRenameRefEffect, JsonSchemaUtils } from '@flowgram.ai/form-materials';

import { FlowNodeJSON } from '../../typings';
import { FormHeader, FormContent } from '../../form-components';
import { ConditionInputs } from './condition-inputs';
import { deriveConditionOutputs } from '../derived-outputs';

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => (
  <>
    <FormHeader />
    <FormContent>
      <ConditionInputs />
    </FormContent>
  </>
);

/**
 * conditions 的动态输出进变量引擎（与 variable 节点 createInferAssignPlugin 同一机制）：
 * 此前 condition 节点 scope 无输出，下游变量选择器查不到 condition_x.<key>/else，
 * 模板 {{ condition_1.if_pass }} 被误报 Unknown Variable，而引擎运行期明明产出这些布尔值。
 */
const conditionOutputsEffect = createEffectFromVariableProvider({
  parse: (conditions: any, ctx) => [
    ASTFactory.createVariableDeclaration({
      key: `${ctx.node.id}`,
      meta: {
        title: ctx.node.form?.getValueIn('title') || ctx.node.id,
        icon: ctx.node.getNodeRegistry().info?.icon,
      },
      type: JsonSchemaUtils.schemaToAST(deriveConditionOutputs(conditions)),
    }),
  ],
});

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }: { value: string }) => (value ? undefined : 'Title is required'),
    'conditions.*': ({ value }) => {
      if (!value?.value) return 'Condition is required';
      return undefined;
    },
  },
  formatOnSubmit: (value: any) => {
    // 保存时物化派生输出（后端 NodeDataNormalizer 同规则重算，双入口收敛同一规范形）
    value.outputs = deriveConditionOutputs(value.conditions);
    return value;
  },
  effect: {
    conditions: [...autoRenameRefEffect, ...conditionOutputsEffect],
  },
};
