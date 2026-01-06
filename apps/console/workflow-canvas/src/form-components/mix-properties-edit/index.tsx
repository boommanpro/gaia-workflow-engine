import React, { useState } from 'react';

import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { PropertyEdit } from '../properties-edit/property-edit.tsx';
import { JsonSchema } from '../../typings';
import { useNodeRenderContext } from '../../hooks';
import { MixPropertyEdit } from './mix-property-edit.tsx';

export interface PropertiesEditProps {
  value?: Record<string, JsonSchema>;
  onChange: (value: Record<string, JsonSchema>) => void;
  onlyFieldName?: boolean;
}

export const MixPropertiesEdit: React.FC<PropertiesEditProps> = (props) => {
  const value = (props.value || {}) as Record<string, JsonSchema>;
  const { readonly } = useNodeRenderContext();

  // 修改状态类型为单个 PropertyItem
  const [newProperty, updateNewPropertyFromCache] = useState<{ key: string; value: JsonSchema }>({
    key: '',
    value: { type: 'string' },
  });

  const [newPropertyVisible, setNewPropertyVisible] = useState<boolean>(false);

  const clearCache = () => {
    updateNewPropertyFromCache({ key: '', value: { type: 'string' } });
    setNewPropertyVisible(false);
  };

  const updateProperty = (
    propertyValue: JsonSchema,
    propertyKey: string,
    newPropertyKey?: string
  ) => {
    const newValue = { ...value };
    if (newPropertyKey) {
      delete newValue[propertyKey];
      newValue[newPropertyKey] = propertyValue;
    } else {
      newValue[propertyKey] = propertyValue;
    }
    props.onChange(newValue);
  };

  // 更新新属性的处理函数
  const updateNewProperty = (
    propertyValue: JsonSchema,
    propertyKey: string,
    newPropertyKey?: string
  ) => {
    // const newValue = { ...value }
    if (newPropertyKey) {
      if (!(newPropertyKey in value)) {
        updateProperty(propertyValue, propertyKey, newPropertyKey);
      }
      clearCache();
    } else {
      updateNewPropertyFromCache({
        key: newPropertyKey || propertyKey,
        value: propertyValue,
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
      {Object.keys(props.value || {}).map((key) => {
        const property = (value[key] || {}) as JsonSchema;
        return (
          <MixPropertyEdit
            key={key}
            propertyKey={key}
            value={property}
            disabled={readonly}
            onChange={updateProperty}
            onDelete={() => {
              const newValue = { ...value };
              delete newValue[key];
              props.onChange(newValue);
            }}
          />
        );
      })}
      {newPropertyVisible && (
        <MixPropertyEdit
          propertyKey={newProperty.key}
          value={newProperty.value}
          onChange={updateNewProperty}
          onDelete={() => {
            const key = newProperty.key;
            // after onblur
            setTimeout(() => {
              const newValue = { ...value };
              delete newValue[key];
              props.onChange(newValue);
              clearCache();
            }, 10);
          }}
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
