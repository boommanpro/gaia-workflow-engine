/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {Field, FieldRenderProps, FormMeta, FormRenderProps, ValidateTrigger,} from '@flowgram.ai/free-layout-editor';
import {
    DisplayInputsValues,
    DisplayOutputs,
    IFlowValue,
    provideJsonSchemaOutputs,
    syncVariableTitle,
} from '@flowgram.ai/form-materials';
import {Button, Divider, Space, Typography} from '@douyinfe/semi-ui';
import {IconPlayCircle} from '@douyinfe/semi-icons';

import {FlowNodeJSON} from '../../typings';
import {useIsSidebar} from '../../hooks';
import {FormContent, FormHeader} from '../../form-components';
import {FormInputs} from '../../form-components/form-inputs';
import {WorkflowListSelectorField} from './components/workflow-list-selector';

const {Text} = Typography;

export const renderForm = ({form}: FormRenderProps<FlowNodeJSON>) => {
    const isSidebar = useIsSidebar();

    if (isSidebar) {
        return (
            <>
                <FormHeader/>
                <FormContent>
                    <Field
                        name="workflowId"
                        render={({field: {value, onChange}}: FieldRenderProps<string>) => (
                            <WorkflowListSelectorField
                                value={value}
                                onWorkflowChange={(workflowId, workflow) => {
                                    // 当选择 workflow 时，自动填充其输入输出参数
                                    if (workflow && workflow.inputs && workflow.outputs) {
                                        // 使用正确的表单 API
                                        form.setValueIn('workflowId', workflowId);
                                        form.setValueIn('workflowName', workflow.name);
                                        form.setValueIn('workflowDescription', workflow.description);
                                        // 更新 inputs schema
                                        form.setValueIn('inputs', workflow.inputs);
                                        // 根据 workflow 的 schema 设置默认参数值
                                        const defaultInputsValues: Record<string, any> = {};

                                        form.setValueIn('inputsValues', defaultInputsValues);
                                        // 更新 outputs schema
                                        form.setValueIn('outputs', workflow.outputs);
                                    } else {
                                        // 清除选择时，重置相关字段
                                        form.setValueIn('workflowId', workflowId);
                                        form.setValueIn('workflowName', '');
                                        form.setValueIn('workflowDescription', '');
                                        form.setValueIn('inputs', {type: 'object', properties: {}});
                                        form.setValueIn('inputsValues', {});
                                        form.setValueIn('outputs', {type: 'object', properties: {}});
                                    }
                                }}
                            />
                        )}
                    />

                    {/* 使用 FormInputs 组件来支持输入参数的关联变量和常量设置 */}
                    <FormInputs/>
                </FormContent>
            </>
        );
    }

    // 添加一个字段来显示选择的workflow信息
    const selectedWorkflowId = form.getValue('workflowId');
    const availableWorkflows = form.getValue('availableWorkflows') || [];
    const selectedWorkflow = availableWorkflows.find((w: any) => w.id === selectedWorkflowId);

    return (
        <>
            <FormHeader/>
            <FormContent>
                {/* 显示已选择的workflow信息 */}
                {selectedWorkflow && (
                    <>
                        <div style={{
                            padding: '12px',
                            marginBottom: '16px',
                            backgroundColor: '#f0f5ff',
                            border: '1px solid #1890ff',
                            borderRadius: '6px'
                        }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong>已选择工作流</Text>
                                    <Button
                                        type="link"
                                        size="small"
                                        icon={<IconPlayCircle />}
                                        onClick={() => {
                                            console.log('查看workflow详情:', selectedWorkflow.id);
                                        }}
                                    >
                                        查看详情
                                    </Button>
                                </div>
                                <Text>ID: </Text><Text code>{selectedWorkflow.id}</Text>
                                <Text>名称: </Text><Text>{selectedWorkflow.name}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{selectedWorkflow.description}</Text>
                            </Space>
                        </div>
                        <Divider />
                    </>
                )}

                {/* 使用标准的 DisplayInputsValues 组件，与 LLM 节点样式保持一致 */}
                <Field<Record<string, IFlowValue | undefined> | undefined> name="inputsValues">
                    {({field: {value}}) => (
                        <>
                            <DisplayInputsValues value={value}/>
                        </>
                    )}
                </Field>
                <Divider/>
                <DisplayOutputs displayFromScope/>
            </FormContent>
        </>
    );
};

export const formMeta: FormMeta<FlowNodeJSON> = {
    render: renderForm,
    validateTrigger: ValidateTrigger.onChange,
    validate: {
        title: ({value}: { value: string }) => (value ? undefined : 'Title is required'),
        workflowId: ({value}: { value: string }) => (value ? undefined : '请选择一个工作流'),
    },
    effect: {
        title: syncVariableTitle,
        outputs: provideJsonSchemaOutputs,
    },
};

