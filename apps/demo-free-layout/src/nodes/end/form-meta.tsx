import { mapValues } from 'lodash-es';
import { Field, FieldRenderProps, FormMeta } from '@flowgram.ai/free-layout-editor';
import { IFlowValue } from '@flowgram.ai/form-materials';

import { defaultFormMeta } from '../default-form-meta';
import { JsonSchema } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { FormHeader, FormContent, FormOutputs, PropertiesEdit } from '../../form-components';

export const renderForm = () => {
  const isSidebar = useIsSidebar();
  if (isSidebar) {
    return (
      <>
        <FormHeader />
        <FormContent>
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
          <FormOutputs name="inputs" />
        </FormContent>
      </>
    );
  }
  return (
    <>
      <FormHeader />
      <FormContent>
        <FormOutputs name="inputs" />
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta = {
  ...defaultFormMeta,
  render: renderForm,
};
