import React, { useState } from 'react';

import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { JsonSchema } from '../../typings';
import { useNodeRenderContext } from '../../hooks';
import { MixPropertyEdit } from './mix-property-edit.tsx';

export interface PropertyItem {
  name: string;
  input: any;
}

export interface PropertiesEditProps {
  value?: PropertyItem[];
  onChange: (value: PropertyItem[]) => void;
  onlyFieldName?: boolean;
}

export const MixPropertiesEdit: React.FC<PropertiesEditProps> = (props) => {
  const value = (props.value || []) as PropertyItem[];
  const { readonly } = useNodeRenderContext();

  // 修改状态类型为单个 PropertyItem
  const [newProperty, updateNewPropertyFromCache] = useState<PropertyItem>({
    name: '',
    input: { type: 'string', value: {} },
  });

  const [newPropertyVisible, setNewPropertyVisible] = useState<boolean>(false);

  const clearCache = () => {
    updateNewPropertyFromCache({ name: '', input: { type: 'string', value: {} } });
    setNewPropertyVisible(false);
  };

  // 更新已存在属性的处理函数
  const updateProperty = (
    propertyValue: PropertyItem,
    propertyKey: string,
    newPropertyKey?: string
  ) => {
    const updatedValue = [...value];
    const index = updatedValue.findIndex((item) => item.name === propertyKey);

    if (index !== -1) {
      if (newPropertyKey) {
        updatedValue[index].name = newPropertyKey;
      }
      updatedValue[index].input = propertyValue;
      props.onChange(updatedValue);
    }
  };

  // 更新新属性的处理函数
  const updateNewProperty = (
    propertyValue: PropertyItem,
    propertyKey: string,
    newPropertyKey?: string
  ) => {
    if (newPropertyKey) {
      // 检查新属性名是否已存在
      if (!value.some((item) => item.name === newPropertyKey)) {
        props.onChange([...value, { name: newPropertyKey, input: propertyValue }]);
        clearCache();
      }
    } else {
      updateNewPropertyFromCache({
        name: propertyKey,
        input: propertyValue,
      });
    }
  };

  // 删除属性的处理函数
  const handleDelete = (propertyKey: string) => {
    const updatedValue = value.filter((item) => item.name !== propertyKey);
    props.onChange(updatedValue);
  };

  return (
    <>
      {value.map((item) => (
        <MixPropertyEdit
          key={item.name}
          propertyKey={item.name}
          onlyFieldName={props.onlyFieldName}
          value={item.input}
          disabled={readonly}
          onChange={updateProperty}
          onDelete={() => handleDelete(item.name)}
        />
      ))}

      {newPropertyVisible && (
        <MixPropertyEdit
          propertyKey={newProperty.name}
          value={newProperty.input}
          onlyFieldName={props.onlyFieldName}
          onChange={updateNewProperty}
          onDelete={() => setNewPropertyVisible(false)}
        />
      )}

      {!readonly && (
        <div>
          <Button
            theme="borderless"
            icon={<IconPlus />}
            onClick={() => setNewPropertyVisible(true)}
          >
            Add
          </Button>
        </div>
      )}
    </>
  );
};
