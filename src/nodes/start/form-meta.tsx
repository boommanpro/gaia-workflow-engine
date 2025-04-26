import {
  Field,
  FieldRenderProps,
  FormRenderProps,
  FormMeta,
  ValidateTrigger,
  FieldArray,
} from '@flowgram.ai/free-layout-editor';

import { FlowNodeJSON, JsonSchema } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { FormHeader, FormContent, FormOutputs, PropertiesEdit } from '../../form-components';

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => {
  const isSidebar = useIsSidebar();
  if (isSidebar) {
    return (
      <>
        <FormHeader />
        <FormContent>
          <Field
            name="outputs.properties"
            render={({
              field: { value, onChange },
              fieldState,
            }: FieldRenderProps<Record<string, JsonSchema>>) => (
              <>
                <PropertiesEdit value={value} onChange={onChange} />
              </>
            )}
          />
          <FieldArray name="outputs">
            {({ field: { value, onChange } }) => {

              return <></>;
            }}
          </FieldArray>
        </FormContent>
      </>
    );
  }
  return (
    <>
      <FormHeader />
      <FormContent>
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
