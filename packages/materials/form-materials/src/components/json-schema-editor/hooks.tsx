/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef, useState } from 'react';

import { difference, omit } from 'lodash';
import { produce } from 'immer';
import { IJsonSchema, type JsonSchemaTypeManager, useTypeManager } from '@flowgram.ai/json-schema';

import { PropertyValueType } from './types';

let _id = 0;
function genId() {
  return _id++;
}

export function usePropertiesEdit(
  value?: PropertyValueType,
  onChange?: (value: PropertyValueType) => void
) {
  const typeManager = useTypeManager() as JsonSchemaTypeManager;

  // Get drilldown properties (array.items.items.properties...)
  const drilldownSchema = typeManager.getPropertiesParent(value || {});
  const canAddField = typeManager.canAddField(value || {});

  const [propertyList, setPropertyList] = useState<PropertyValueType[]>([]);

  const effectVersion = useRef(0);
  const changeVersion = useRef(0);

  useEffect(() => {
    effectVersion.current = effectVersion.current + 1;
    if (effectVersion.current === changeVersion.current) {
      return;
    }
    effectVersion.current = changeVersion.current;

    // If the value is changed, update the property list
    setPropertyList((_list) => {
      const newNames = Object.entries(drilldownSchema?.properties || {})
        .sort(([, a], [, b]) => (a.extra?.index ?? 0) - (b.extra?.index ?? 0))
        .map(([key]) => key);

      const oldNames = _list.map((item) => item.name).filter(Boolean) as string[];
      const addNames = difference(newNames, oldNames);

      return _list
        .filter((item) => !item.name || newNames.includes(item.name))
        .map((item) => ({
          key: item.key,
          name: item.name,
          isPropertyRequired: drilldownSchema?.required?.includes(item.name || '') || false,
          ...(drilldownSchema?.properties?.[item.name || ''] || item || {}),
        }))
        .concat(
          addNames.map((_name) => ({
            key: genId(),
            name: _name,
            isPropertyRequired: drilldownSchema?.required?.includes(_name) || false,
            ...(drilldownSchema?.properties?.[_name] || {}),
          }))
        );
    });
  }, [drilldownSchema]);

  const updatePropertyList = (updater: (list: PropertyValueType[]) => PropertyValueType[]) => {
    changeVersion.current = changeVersion.current + 1;

    setPropertyList((_list) => {
      const next = updater(_list);

      // onChange to parent
      const nextProperties: Record<string, IJsonSchema> = {};
      const nextRequired: string[] = [];

      for (const _property of next) {
        if (!_property.name) {
          continue;
        }

        nextProperties[_property.name] = omit(_property, ['key', 'name', 'isPropertyRequired']);

        if (_property.isPropertyRequired) {
          nextRequired.push(_property.name);
        }
      }

      onChange?.(
        produce(value || {}, (draft) => {
          const propertiesParent = typeManager.getPropertiesParent(draft);

          if (propertiesParent) {
            propertiesParent.properties = nextProperties;
            propertiesParent.required = nextRequired;
            return;
          }
        })
      );

      return next;
    });
  };

  const onAddProperty = () => {
    // set property list only, not trigger updatePropertyList
    setPropertyList((_list) => [
      ..._list,
      { key: genId(), name: '', type: 'string', extra: { index: _list.length + 1 } },
    ]);
  };

  const onRemoveProperty = (key: number) => {
    updatePropertyList((_list) => _list.filter((_property) => _property.key !== key));
  };

  const onEditProperty = (key: number, nextValue: PropertyValueType) => {
    updatePropertyList((_list) =>
      _list.map((_property) => (_property.key === key ? nextValue : _property))
    );
  };

  useEffect(() => {
    if (!canAddField) {
      setPropertyList([]);
    }
  }, [canAddField]);

  return {
    propertyList,
    canAddField,
    onAddProperty,
    onRemoveProperty,
    onEditProperty,
  };
}
