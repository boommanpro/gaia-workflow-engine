import React, { useCallback } from 'react';

import {
  Field,
  FieldRenderProps,
  FormMeta,
  FormRenderProps,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import Label from '@douyinfe/semi-ui/lib/es/form/label';
import { Divider, Select } from '@douyinfe/semi-ui';

import { FlowNodeJSON, JsonSchema } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { MixPropertiesEdit } from '../../form-components/mix-properties-edit';
import { FormContent, FormHeader, FormOutputs, PropertiesEdit } from '../../form-components';
import { CodeEditorField } from '../../components/code-editor-field';
import {IFlowValue} from "@flowgram.ai/form-materials";
import {mapValues} from "lodash-es";

export interface CodeConfig {
  language: string;
  code: string;
}

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => {
  const isSidebar = useIsSidebar();
  return (
    <>
      <FormHeader />
      <FormContent>
        {isSidebar && (
          <>
            <Divider margin="12px" />
            <span>输入配置</span>
            <Field
                name="inputs.properties"
                render={({
                           field: { value: propertiesSchemaValue, onChange: propertiesSchemaChange },
                         }: FieldRenderProps<Record<string, JsonSchema>>) => (
                    <Field<Record<string, IFlowValue>> name="inputsValues">
                      {({ field: { value: propertiesValue, onChange: propertiesValueChange } }) => {
                        const onChange = (newProperties: Record<string, JsonSchema>) => {
                          const newPropertiesValue = mapValues(newProperties, (v) => v.default);
                          const newPropetiesSchema = mapValues(newProperties, (v) => {
                            delete v.default;
                            return v;
                          });
                          propertiesValueChange(newPropertiesValue);
                          propertiesSchemaChange(newPropetiesSchema);
                        };
                        const value = mapValues(propertiesSchemaValue, (v, key) => ({
                          ...v,
                          default: propertiesValue?.[key],
                        }));
                        return (
                            <>
                              <PropertiesEdit value={value} onChange={onChange} useFx={true} />
                            </>
                        );
                      }}
                    </Field>
                )}
            />
            <Divider margin="12px" />
            <span>代码配置</span>
            <Field
              name="config"
              render={({
                field: { value, onChange },
                fieldState,
              }: FieldRenderProps<CodeConfig>) => {
                const handleLanguageChange = useCallback(
                  (selectedValue: string | number | any[] | Record<string, any> | undefined) => {
                    if (typeof selectedValue === 'string') {
                      onChange({ ...value, language: selectedValue });
                    }
                  },
                  [value, onChange]
                );

                const handleCodeChange = useCallback(
                  (newCode: string) => {
                    onChange({ ...value, code: newCode });
                  },
                  [value, onChange]
                );

                return (
                  <>
                    <Label>
                      language:
                      <Select
                        defaultValue={value.language}
                        style={{ width: 200, marginLeft: '8px' }}
                        onChange={handleLanguageChange}
                      >
                        <Select.Option value="javaScriptFunc">javaScriptFunc</Select.Option>
                        <Select.Option value="python">python</Select.Option>
                        <Select.Option value="javascript">javascript</Select.Option>
                        <Select.Option value="typescript">typescript</Select.Option>
                        <Select.Option value="java">java</Select.Option>
                        <Select.Option value="aviator">aviator</Select.Option>
                      </Select>
                    </Label>
                    <CodeEditorField
                      value={value.code}
                      onChange={handleCodeChange}
                      language={value.language}
                    />
                  </>
                );
              }}
            />
            <Divider margin="12px" />
            <span>输出配置</span>
            <Field
                name="outputs.properties"
                render={({
                           field: { value: propertiesSchemaValue, onChange: propertiesSchemaChange },
                         }: FieldRenderProps<Record<string, JsonSchema>>) => (
                    <Field<Record<string, IFlowValue>> name="outputsValues">
                      {({ field: { value: propertiesValue, onChange: propertiesValueChange } }) => {
                        const onChange = (newProperties: Record<string, JsonSchema>) => {
                          const newPropertiesValue = mapValues(newProperties, (v) => v.default);
                          const newPropetiesSchema = mapValues(newProperties, (v) => {
                            delete v.default;
                            return v;
                          });
                          propertiesValueChange(newPropertiesValue);
                          propertiesSchemaChange(newPropetiesSchema);
                        };
                        const value = mapValues(propertiesSchemaValue, (v, key) => ({
                          ...v,
                          default: propertiesValue?.[key],
                        }));
                        return (
                            <>
                              <PropertiesEdit value={value} onChange={onChange} useFx={true} />
                            </>
                        );
                      }}
                    </Field>
                )}
            />
            <FormOutputs name="outputs" />
          </>
        )}
        <FormOutputs />
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }: { value: string }) => (value ? undefined : 'Title is required'),
  },
};
