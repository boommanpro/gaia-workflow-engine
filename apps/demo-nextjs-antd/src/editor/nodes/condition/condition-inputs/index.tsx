import { nanoid } from 'nanoid';
import { Button } from 'antd';
import { Field, FieldArray } from '@flowgram.ai/free-layout-editor';
import { ConditionRow, ConditionRowValueType } from '@flowgram.ai/form-antd-materials';
import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';

import { useNodeRenderContext } from '@editor/hooks';
import { FormItem } from '@editor/form-components';
import { Feedback } from '@editor/form-components';
import { ConditionPort } from './styles';

// TODO
// interface ConditionRowValueType{}
// function ConditionRow(params){
//   return <>{params.children}</>
// }

interface ConditionValue {
  key: string;
  value?: ConditionRowValueType;
}

export function ConditionInputs() {
  const { readonly } = useNodeRenderContext();
  return (
    <FieldArray name="conditions">
      {({ field }) => (
        <>
          {field.map((child, index) => (
            <Field<ConditionValue> key={child.name} name={child.name}>
              {({ field: childField, fieldState: childState }) => (
                <FormItem name="if" type="boolean" required={true} labelWidth={40}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ConditionRow
                      readonly={readonly}
                      style={{ flexGrow: 1 }}
                      value={childField.value.value}
                      onChange={(v) =>
                        childField.onChange({
                          value: v,
                          key: childField.value.key,
                        })
                      }
                    />

                    <Button
                      type="text"
                      icon={<CloseCircleOutlined />}
                      onClick={() => field.delete(index)}
                    />
                  </div>

                  <Feedback errors={childState?.errors} invalid={childState?.invalid} />
                  <ConditionPort data-port-id={childField.value.key} data-port-type="output" />
                </FormItem>
              )}
            </Field>
          ))}
          {!readonly && (
            <div>
              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() =>
                  field.append({
                    key: `if_${nanoid(6)}`,
                    value: { type: 'expression', content: '' },
                  })
                }
              >
                Add
              </Button>
            </div>
          )}
        </>
      )}
    </FieldArray>
  );
}
