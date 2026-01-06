import React from 'react';

import { RunMixPropertyEdit } from './run-mix-property-edit.tsx';

export interface PropertyItem {
  name: string;
  input: any;
}

export interface PropertiesEditProps {
  value?: PropertyItem[];
  onChange: (value: PropertyItem[]) => void;
}

export const RunMixPropertiesEdit: React.FC<PropertiesEditProps> = (props) => {
  const value = (props.value || []) as PropertyItem[];

  const updateProperty = (propertyKey: string, propertyValue: any) => {
    const updatedValue = [...value];
    const index = updatedValue.findIndex((item) => item.name === propertyKey);

    if (index !== -1) {
      updatedValue[index].input = propertyValue;
      props.onChange(updatedValue);
    }
  };

  return (
    <>
      {value.map((item) => (
        <RunMixPropertyEdit
          key={item.name}
          propertyKey={item.name}
          value={item.input}
          onChange={updateProperty}
        />
      ))}
    </>
  );
};
