import { Field } from '@flowgram.ai/free-layout-editor';
import { DynamicValueInput } from '@flowgram.ai/form-antd-materials';

import { JsonSchema } from '@editor/typings';
import { useNodeRenderContext } from '@editor/hooks';
import { FormItem } from '../form-item';
import { Feedback } from '../feedback';

export function FormInputs() {
  const { readonly } = useNodeRenderContext();
  return (
    <Field<JsonSchema> name="inputs">
      {({ field: inputsField }) => {
        const required = inputsField.value?.required || [];
        const properties = inputsField.value?.properties;
        if (!properties) {
          return <></>;
        }
        const content = Object.keys(properties).map((key) => {
          const property = properties[key];
          return (
            <Field key={key} name={`inputsValues.${key}`} defaultValue={property.default}>
              {({ field, fieldState }) => (
                <FormItem
                  name={key}
                  type={property.type as string}
                  required={required.includes(key)}
                >
                  <DynamicValueInput
                    value={field.value}
                    onChange={field.onChange}
                    readonly={readonly}
                    hasError={Object.keys(fieldState?.errors || {}).length > 0}
                    schema={property}
                  />
                  <Feedback errors={fieldState?.errors} />
                </FormItem>
              )}
            </Field>
          );
        });
        return <>{content}</>;
      }}
    </Field>
  );
}
