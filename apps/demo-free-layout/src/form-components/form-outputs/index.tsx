import { FC } from 'react';

import { Field } from '@flowgram.ai/free-layout-editor';

import { TypeTag } from '../type-tag';
import { JsonSchema } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { FormOutputsContainer } from './styles';

interface FormOutputsProps {
  name?: string;
}

export const FormOutputs: FC<FormOutputsProps> = ({ name = 'outputs' }) => {
  const isSidebar = useIsSidebar();
  if (isSidebar) {
    return null;
  }
  return (
    <Field<JsonSchema> name={name}>
      {({ field }) => {
        const properties = field.value?.properties;
        if (properties) {
          const content = Object.keys(properties).map((key) => {
            const property = properties[key];
            return <TypeTag key={key} name={key} type={property.type as string} />;
          });
          return <FormOutputsContainer>{content}</FormOutputsContainer>;
        }
        return <></>;
      }}
    </Field>
  );
};
