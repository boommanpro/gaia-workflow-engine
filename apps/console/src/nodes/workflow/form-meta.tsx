/**
 * Copyright (c) 2025 Bytedance Ltd. and its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useParams } from 'react-router-dom';
import {
  Field,
  FieldRenderProps,
  FormMeta,
  FormRenderProps,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import {
  DisplayInputsValues,
  DisplayOutputs,
  IFlowValue,
  provideJsonSchemaOutputs,
  syncVariableTitle,
} from '@flowgram.ai/form-materials';
import { Button, Divider, Space, Typography } from '@douyinfe/semi-ui';
import { IconPlayCircle } from '@douyinfe/semi-icons';

import { FlowNodeJSON } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { FormInputs } from '../../form-components/form-inputs';
import { FormContent, FormHeader } from '../../form-components';
import { WorkflowListSelectorField } from './components/workflow-list-selector';
import { useLanguage, t } from '../../i18n';

const { Text } = Typography;

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => {
  const isSidebar = useIsSidebar();
  const { workflowCode } = useParams<{ workflowCode: string }>();
  useLanguage();

  if (isSidebar) {
    return (
      <>
        <FormHeader />
        <FormContent>
          <Field
            name="workflowId"
            render={({ field: { value, onChange } }: FieldRenderProps<string>) => (
              <WorkflowListSelectorField
                value={value}
                excludeCode={workflowCode}
                onWorkflowChange={(workflowCode, workflow) => {
                  // 当选择 workflow 时，自动填充其输入输出参数
                  if (workflow) {
                    form.setValueIn('workflowId', workflowCode);
                    form.setValueIn('workflowName', workflow.name);
                    form.setValueIn('workflowDescription', workflow.description || '');
                    // 更新 inputs schema（后端从目标工作流当前生效版提取）
                    form.setValueIn('inputs', workflow.inputs || { type: 'object', properties: {} });
                    form.setValueIn('inputsValues', {});
                    // 更新 outputs schema
                    form.setValueIn('outputs', workflow.outputs || { type: 'object', properties: {} });
                    onChange?.(workflowCode);
                  } else {
                    // 清除选择时，重置相关字段
                    form.setValueIn('workflowId', workflowCode);
                    form.setValueIn('workflowName', '');
                    form.setValueIn('workflowDescription', '');
                    form.setValueIn('inputs', { type: 'object', properties: {} });
                    form.setValueIn('inputsValues', {});
                    form.setValueIn('outputs', { type: 'object', properties: {} });
                  }
                }}
              />
            )}
          />

          {/* 使用 FormInputs 组件来支持输入参数的关联变量和常量设置 */}
          <FormInputs />
        </FormContent>
      </>
    );
  }

  // 画布态：直接读表单里已存的选择信息（workflowId 即目标工作流 code）
  const selectedWorkflowCode = form.getValueIn('workflowId');
  const selectedWorkflowName = form.getValueIn('workflowName');

  return (
    <>
      <FormHeader />
      <FormContent>
        {/* 显示已选择的workflow信息 */}
        {selectedWorkflowCode && (
          <>
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#f0f5ff',
                border: '1px solid #1890ff',
                borderRadius: '6px',
              }}
            >
              <Space vertical style={{ width: '100%' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text strong>{t('workflow.selected')}</Text>
                  <Button
                    theme="borderless"
                    size="small"
                    icon={<IconPlayCircle />}
                    onClick={() => {
                      // 新标签打开目标工作流编辑器
                      const base = (process.env.ASSET_PREFIX || '').replace(/\/+$/, '');
                      window.open(`${base}/editor/${selectedWorkflowCode}`, '_blank', 'noopener');
                    }}
                  >
                    {t('workflow.viewDetails')}
                  </Button>
                </div>
                {selectedWorkflowName && (
                  <Text>
                    {t('workflow.name')}
                    {selectedWorkflowName}
                  </Text>
                )}
                <Text code>{selectedWorkflowCode}</Text>
              </Space>
            </div>
            <Divider />
          </>
        )}

        {/* 使用标准的 DisplayInputsValues 组件，与 LLM 节点样式保持一致 */}
        <Field<Record<string, IFlowValue | undefined> | undefined> name="inputsValues">
          {({ field: { value } }) => (
            <>
              <DisplayInputsValues value={value} />
            </>
          )}
        </Field>
        <Divider />
        <DisplayOutputs displayFromScope />
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }: { value: string }) => (value ? undefined : 'Title is required'),
    workflowId: ({ value }: { value: string }) => (value ? undefined : t('workflow.validate.required')),
  },
  effect: {
    title: syncVariableTitle,
    outputs: provideJsonSchemaOutputs,
  },
};
