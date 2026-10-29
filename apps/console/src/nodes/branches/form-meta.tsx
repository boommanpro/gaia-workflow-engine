/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  ASTFactory,
  createEffectFromVariableProvider,
  FormMeta,
  FormRenderProps,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import { autoRenameRefEffect, JsonSchemaUtils } from '@flowgram.ai/form-materials';

import { FlowNodeJSON } from '../../typings';
import { FormContent, FormHeader } from '../../form-components';
import { BranchInputs } from './branch-inputs';
import { deriveBranchesOutputs } from '../derived-outputs';

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => (
  <>
    <FormHeader />
    <FormContent>
      <BranchInputs />
    </FormContent>
  </>
);

/**
 * branches[].id 的动态输出进变量引擎（与 condition 同一机制、同一规则源）：
 * 每个分支 id + else 的布尔命中结果，下游变量选择器/模板校验与引擎运行期同口径。
 */
const branchOutputsEffect = createEffectFromVariableProvider({
  parse: (branches: any, ctx) => [
    ASTFactory.createVariableDeclaration({
      key: `${ctx.node.id}`,
      meta: {
        title: ctx.node.form?.getValueIn('title') || ctx.node.id,
        icon: ctx.node.getNodeRegistry().info?.icon,
      },
      type: JsonSchemaUtils.schemaToAST(deriveBranchesOutputs(branches)),
    }),
  ],
});

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }: { value: string }) => (value ? undefined : 'Title is required'),
    'branches.*.conditions.*': ({ value }) => {
      if (!value?.value) return 'Condition is required';
      return undefined;
    },
  },
  formatOnSubmit: (value: any) => {
    // 保存时物化派生输出（后端 NodeDataNormalizer 同规则重算，双入口收敛同一规范形）
    value.outputs = deriveBranchesOutputs(value.branches);
    return value;
  },
  effect: {
    branches: branchOutputsEffect,
    'branches.*.conditions': autoRenameRefEffect,
  },
};
