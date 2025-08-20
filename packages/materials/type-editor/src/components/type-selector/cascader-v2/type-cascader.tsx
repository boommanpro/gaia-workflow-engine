/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { type FC, forwardRef, useCallback, useMemo, useState } from 'react';

import classNames from 'classnames';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconCheckboxTick, IconChevronRight } from '@douyinfe/semi-icons';

import { typeSelectorUtils } from '../utils';
import { TypeSelectorRef, type CascaderOption, type Props } from '../type';
import { useTypeTransform } from '../hooks/option-value';
import { useFocusItemCascader } from '../hooks/focus-item';
import { useCascaderRootTypes } from '../hooks';
import { FlowSchemaInitCtx, TypeEditorRegistry } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import { CascaderDropdown, CascaderOptionItem, DropdownGlobalStyle } from './style';
interface OptionListProps {
  options: Array<CascaderOption>;

  /**
   * 蓝色背景，用于父类型展开/收起
   */
  activeType?: string;
  /**
   * 蓝色字体，用于表示选中的值
   */
  selectValue?: string;
  /**
   * 灰色背景，当前 focus 的类型
   */
  focusValue?: string;
  onCollapse?: (val: string) => void;
  onSelect?: (
    value: string,
    source?: Parameters<Required<Props<IJsonSchema>>['onChange']>[1]['source']
  ) => void;
}

const OptionList: FC<OptionListProps> = ({
  options,
  activeType,
  selectValue,
  onCollapse,
  onSelect,
  focusValue,
}) => (
  <ul className="semi-cascader-option-list">
    {options.map((opt) => {
      const child = (
        <CascaderOptionItem
          focus={focusValue === opt.value}
          onClick={
            !opt.disabled
              ? () =>
                  opt.isLeaf
                    ? onSelect?.(
                        opt.value,
                        opt.source as Parameters<
                          Required<Props<IJsonSchema>>['onChange']
                        >[1]['source']
                      )
                    : onCollapse?.(opt.type)
              : undefined
          }
          key={opt.value}
          className={classNames(
            'semi-cascader-option',
            activeType === opt.type && 'semi-cascader-option-active',
            selectValue === opt.value && 'semi-cascader-option-select',

            opt.disabled && 'semi-cascader-option-disabled'
          )}
        >
          <span className="semi-cascader-option-label">
            {selectValue === opt.value ? (
              <IconCheckboxTick
                className={classNames('semi-cascader-option-icon')}
                style={{
                  color: selectValue === opt.value ? 'var(--semi-color-primary)' : undefined,
                }}
              />
            ) : (
              <span className="semi-cascader-option-icon semi-cascader-option-icon-empty" />
            )}
            {typeof opt.label === 'string' ? <span>{opt.label}</span> : opt.label}
          </span>
          {!opt.isLeaf && <IconChevronRight />}
        </CascaderOptionItem>
      );

      return opt.disabled ? <Tooltip content={opt.disabled}>{child}</Tooltip> : child;
    })}
  </ul>
);

const useGenerateCascaderTypes = () => {
  const typeService = useTypeDefinitionManager();

  const generateCascaderTypes = useCallback(
    (value?: string) => {
      const res: string[] = [];

      const types = value?.split('-') || [];
      const arr = types.splice(0, types.length - 1) || [];

      while (arr.length > 0) {
        const type = arr.shift();
        if (type) {
          const config = type ? typeService.getTypeByName(type) : undefined;

          if (config?.customChildOptionValue) {
            const extras = config.customChildOptionValue();
            arr.splice(0, extras.length);
          }
          res.push(type);
        }
      }

      return res;
    },
    [typeService]
  );

  return generateCascaderTypes;
};

const generateCustomPanelType = (value?: string) => (value?.split('-') || []).pop() || '';

// eslint-disable-next-line react/display-name
export const TypeCascader = forwardRef<
  TypeSelectorRef,
  Props<IJsonSchema> & {
    onContextChange: (ctx: FlowSchemaInitCtx) => void;
    onRePos: () => void;
  }
>(({ value: originValue, onChange, onContextChange, onRePos, disableTypes = [] }, ref) => {
  const typeService = useTypeDefinitionManager();

  const {
    convertOptionValueToModeValue,
    convertValueToOptionValue,

    getModeOptionChildrenType,
  } = useTypeTransform();

  const customDisableType = useMemo(() => {
    const map = new Map<string, string>();

    disableTypes.forEach((v) => {
      map.set(v.type, v.reason);
    });
    return map;
  }, [disableTypes]);

  const rootTypes = useCascaderRootTypes(customDisableType);

  const generateCascaderTypes = useGenerateCascaderTypes();

  const value = useMemo(() => convertValueToOptionValue(originValue), [originValue]);

  const [cascaderTypes, setCascaderLTypes] = useState<string[]>(generateCascaderTypes(value));

  const [customPanelType, setCustomPanelType] = useState(generateCustomPanelType(value));

  const handleChange = useCallback(
    (
      newOptionValue: string,
      source: Parameters<Required<Props<IJsonSchema>>['onChange']>[1]['source'] = 'type-selector'
    ) => {
      if (newOptionValue === value) {
        setCascaderLTypes(generateCascaderTypes(newOptionValue));
        setCustomPanelType(generateCustomPanelType(newOptionValue));
        onRePos();

        return;
      }
      const newValue = convertOptionValueToModeValue(newOptionValue);

      if (onChange) {
        onChange(newValue as IJsonSchema, {
          source,
        });
      }

      setCascaderLTypes(generateCascaderTypes(newOptionValue));

      setCustomPanelType(generateCustomPanelType(newOptionValue));

      const newCtx =
        (newValue &&
          typeService.getTypeBySchema(newValue)?.typeCascaderConfig?.generateInitCtx?.(newValue)) ||
        {};

      onContextChange(newCtx);
    },
    [onChange, onContextChange, value]
  );

  const renderData = useMemo(
    () =>
      cascaderTypes.map((item, level) => {
        const parentDef = typeService.getTypeByName(item);

        const childrenType = getModeOptionChildrenType(
          parentDef as TypeEditorRegistry<IJsonSchema>,
          {
            parentType: item,
            level: level + 1,
            parentTypes: [...cascaderTypes].splice(0, level),
          }
        );

        const prefix = [...cascaderTypes]
          .splice(0, level + 1)
          .map((type) => {
            const config = typeService.getTypeByName(type);
            if (config?.customChildOptionValue) {
              return [type, config.customChildOptionValue()];
            }
            return type;
          })
          .flat()
          .join('-');

        const options: CascaderOption[] = childrenType
          .map((child) => {
            const def = typeService.getTypeByName(child.type);
            if (def) {
              return typeSelectorUtils.definitionToCascaderOption({
                config: def,
                customDisableType,
                prefix,
                // parentConfig: parentDef,
                level: level + 1,
                disabled: child.disabled,
                parentType: item,
                parentTypes: [...cascaderTypes].splice(0, level + 1),
              });
            }
          })
          .filter(Boolean) as CascaderOption[];

        return {
          item,
          options,
        };
      }),
    [cascaderTypes, customDisableType]
  );

  const handleCollapse = useCallback(
    (type: string, level: number) => {
      const newCascaderTypes = [...cascaderTypes];

      if (cascaderTypes[level] !== type) {
        newCascaderTypes.splice(level);
        newCascaderTypes.push(type);
      } else {
        newCascaderTypes.splice(level);
      }
      setCustomPanelType('');
      onRePos();
      setCascaderLTypes(newCascaderTypes);
    },
    [cascaderTypes]
  );

  const { focusValue } = useFocusItemCascader({
    rootTypes,
    onCollapse: handleCollapse,
    renderData,
    cascaderTypes,
    onChange: (v) => handleChange(v, 'type-selector'),
    ref,
  });

  return (
    <CascaderDropdown>
      <DropdownGlobalStyle />
      <div className="semi-cascader-option-lists">
        <OptionList
          activeType={cascaderTypes[0]}
          selectValue={value}
          options={rootTypes}
          focusValue={focusValue}
          onSelect={handleChange}
          onCollapse={(type) => handleCollapse(type, 0)}
        />

        {renderData.map(({ item, options }, level) => (
          <OptionList
            onSelect={handleChange}
            key={item + level}
            focusValue={focusValue}
            activeType={cascaderTypes[level + 1]}
            selectValue={value}
            options={options}
            onCollapse={(type) => handleCollapse(type, level + 1)}
          />
        ))}

        {(originValue &&
          typeService.getTypeByName(customPanelType)?.typeCascaderConfig?.customCascaderPanel?.({
            typeSchema: originValue,
            onChange: ((newVal: IJsonSchema) => {
              onChange?.(newVal, {
                source: 'custom-panel',
              });
              const newCtx =
                typeService
                  .getTypeBySchema(newVal)
                  ?.typeCascaderConfig?.generateInitCtx?.(newVal) || {};

              onContextChange(newCtx);
            }) as (typeSchema: Partial<IJsonSchema>) => void,
          })) ||
          null}
      </div>
    </CascaderDropdown>
  );
});
