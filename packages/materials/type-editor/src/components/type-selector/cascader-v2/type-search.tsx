/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, {
  type FC,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import classNames from 'classnames';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Typography } from '@douyinfe/semi-ui';

import { type SearchResultItem, type Props, TypeSelectorRef } from '../type';
import { useHighlightKeyword } from '../hooks/use-hight-light';
import { useTypeTransform } from '../hooks/option-value';
import { useFocusItemSearch } from '../hooks/focus-item';
import { TypeEditorRegistry } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import { SearchIcon, SearchText, StyledSearchList, TextGlobalStyle, TypeSearchText } from './style';

const defaultDeep = 2;

interface CacheItem {
  /** array-array-string **/
  key: string;
  type: string;
  disabled?: string;
}

const SearchItem: FC<{
  item: SearchResultItem;
  query: string;
  focusValue: string;
  selectValue: string;
  onSelect: (item: SearchResultItem, value: IJsonSchema) => void;
}> = ({ item, query, focusValue, onSelect, selectValue }) => {
  const typeService = useTypeDefinitionManager();

  const { convertOptionValueToModeValue } = useTypeTransform();

  const config = typeService.getTypeByName(item.type);

  const typeSchema = useMemo(
    () => convertOptionValueToModeValue(item.value) as IJsonSchema,
    [item.value]
  );

  const text = useMemo(() => config?.getDisplayText(typeSchema), [typeSchema, config]);

  const label = useHighlightKeyword(
    text || '',
    query,
    {
      color: 'var(--semi-color-primary)',
      fontWeight: 600,
    },
    item.value
  );

  return (
    <li
      key={item.value}
      onClick={() => (item.disabled ? undefined : onSelect(item, typeSchema))}
      style={{
        minWidth: 'unset',
        background: focusValue === item.value ? 'var(--semi-color-fill-0)' : undefined,
      }}
      className={classNames(
        'semi-cascader-option',
        item.disabled && 'semi-cascader-option-disabled',
        selectValue === item.value && 'semi-cascader-option-select'
      )}
    >
      <TextGlobalStyle />
      <SearchText disabled={!!item.disabled}>
        <SearchIcon>{config?.getDisplayIcon?.(typeSchema)}</SearchIcon>
        <Typography.Text ellipsis={{ showTooltip: true }}>
          <span>{label}</span>
        </Typography.Text>
      </SearchText>
    </li>
  );
};
// eslint-disable-next-line react/display-name
export const TypeSearchPanel = forwardRef<
  TypeSelectorRef,
  Props<IJsonSchema> & {
    query: string;
    triggerRef: React.RefObject<HTMLDivElement | null>;
    onSearchChange: (query: string) => void;
  }
>(({ query, disableTypes = [], onChange, triggerRef, value, onSearchChange }, ref) => {
  const typeService = useTypeDefinitionManager();
  const {
    convertValueToOptionValue,
    checkHasChildren,
    convertOptionValueToModeValue,
    getModeOptionChildrenType,
  } = useTypeTransform();

  const customDisableType = useMemo(() => {
    const map = new Map<string, string>();

    disableTypes.forEach((v) => {
      map.set(v.type, v.reason);
    });
    return map;
  }, [disableTypes]);

  const selectValue = useMemo(() => convertValueToOptionValue(value), [value]);

  const [searchResult, setSearchResult] = useState<SearchResultItem[]>([]);

  const levelCache = useRef<CacheItem[][]>([]);

  const handleGenLevelInfo = useCallback(
    (level: number) => {
      for (let i = 0; i < level; i++) {
        if (levelCache.current[i]) {
          continue;
        }

        if (i === 0) {
          const newRootTypes = typeService.getTypeRegistriesWithParentType();
          levelCache.current[i] = newRootTypes.map((type) => ({
            key: type.type,
            type: type.type,
            parentLabels: [],
            disabled: customDisableType.get(type.type),
          }));
        } else {
          const lastLevelCache = levelCache.current[i - 1];
          const newCacheTypes: CacheItem[] = [];
          levelCache.current[i] = newCacheTypes;
          lastLevelCache.forEach((type) => {
            // disabled 的就不用下钻了
            if (type.disabled) {
              return;
            }
            const config = typeService.getTypeByName(type.type);

            const parentTypes = type.key.split('-');
            if (
              config &&
              checkHasChildren(config as TypeEditorRegistry<IJsonSchema>, {
                level: i,
              })
            ) {
              const childrenTypes = getModeOptionChildrenType(
                config as TypeEditorRegistry<IJsonSchema>,
                {
                  parentType: type.type,
                  level: i,
                  parentTypes,
                }
              );

              childrenTypes.forEach((child) => {
                const childConfig = typeService.getTypeByName(child.type);

                newCacheTypes.push({
                  type: child.type,
                  key: [...parentTypes, child.type].join('-'),
                  disabled:
                    child.disabled ||
                    (childConfig?.customDisabled
                      ? childConfig.customDisabled({
                          level: i + 1,
                          parentType: type.type,
                          parentTypes,
                        })
                      : undefined),
                });
              });
            }
          });
        }
      }
    },
    [customDisableType]
  );

  const handleGenSearchResult = useCallback(() => {
    const len = levelCache.current.length;
    if (!query) {
      setSearchResult([]);
      return;
    }

    const newSearchResult: SearchResultItem[] = [];
    for (let i = 0; i < len; i++) {
      const cacheTypes = levelCache.current[i] || [];

      cacheTypes.forEach((type) => {
        const config = typeService.getTypeByName(type.type);

        if (config && config.label.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1) {
          newSearchResult.push({
            value: type.key,
            icon: config.icon,
            disabled: type.disabled,
            level: i,
            type: type.type,
          });
        }
      });
    }

    setSearchResult(newSearchResult);
  }, [query]);

  useEffect(() => {
    handleGenLevelInfo(defaultDeep);
  }, [handleGenLevelInfo]);

  useEffect(() => {
    handleGenSearchResult();
  }, [query]);

  const viewValue = useMemo(
    () =>
      searchResult.filter((item) => {
        const config = typeService.getTypeByName(item.type);
        return (
          config &&
          !checkHasChildren(config as TypeEditorRegistry<IJsonSchema>, {
            level: item.level,
          })
        );
      }),
    [searchResult, typeService]
  );

  const { focusValue } = useFocusItemSearch({
    ref,
    viewValue,
    onChange: (v) => {
      const newVal = convertOptionValueToModeValue(v);
      onChange?.(newVal as IJsonSchema, { source: 'custom-panel' });
      onSearchChange('');
    },
  });

  return (
    <div
      className={classNames('semi-cascader-option-lists')}
      style={triggerRef.current ? { width: Math.max(triggerRef.current.clientWidth, 150) } : {}}
    >
      <StyledSearchList className={classNames('semi-cascader-option-list')}>
        <>
          {viewValue.length === 0 ? (
            <TypeSearchText type="secondary">No results.</TypeSearchText>
          ) : (
            <>
              {viewValue.map((item) => (
                <SearchItem
                  selectValue={selectValue}
                  key={item.value}
                  query={query}
                  focusValue={focusValue}
                  item={item}
                  onSelect={(_, v) => onChange?.(v, { source: 'type-selector' })}
                />
              ))}
            </>
          )}
        </>
      </StyledSearchList>
    </div>
  );
});
