import React, { useContext, useRef, useState } from 'react';

import { Field, FieldRenderProps, FlowNodeRegistry } from '@flowgram.ai/free-layout-editor';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { TextArea } from '@douyinfe/semi-ui';

import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { NodeRenderContext } from '../../context';
import { FormTitleDescription, FormWrapper } from './styles';
import { Feedback } from '../feedback';
import { getNodeDescription } from '../../nodes/i18n';

/**
 * @param props
 * @constructor
 */
export function FormContent(props: { children?: React.ReactNode }) {
  const { node } = useNodeRenderContext();
  const { readonly } = useContext(NodeRenderContext);

  const isSidebar = useIsSidebar();
  const registry = node.getNodeRegistry<FlowNodeRegistry>();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<any>(null);

  const handleDoubleClick = () => {
    if (!readonly && isSidebar) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleBlur = (onChange: (value: string) => void, value: string) => {
    onChange(value);
    setIsEditing(false);
  };

  return (
    <FormWrapper>
      <>
        <FormTitleDescription onDoubleClick={handleDoubleClick}>
          <Field name="description">
            {({ field: { value, onChange }, fieldState }: FieldRenderProps<string>) => (
              <div>
                {isEditing ? (
                  <TextArea
                    ref={inputRef}
                    defaultValue={value || getNodeDescription(registry.type as string) || ''}
                    onBlur={() => handleBlur(onChange, inputRef.current?.value || '')}
                    onEnterPress={() => handleBlur(onChange, inputRef.current?.value || '')}
                  />
                ) : (
                  <Text>{value || getNodeDescription(registry.type as string) || ''}</Text>
                )}
                <Feedback errors={fieldState?.errors} />
              </div>
            )}
          </Field>
        </FormTitleDescription>
        {props.children}
      </>
    </FormWrapper>
  );
}
