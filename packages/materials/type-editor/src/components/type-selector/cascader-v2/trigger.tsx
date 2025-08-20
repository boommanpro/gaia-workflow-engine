/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';

import classNames from 'classnames';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Input } from '@douyinfe/semi-ui';
import { IconChevronDown } from '@douyinfe/semi-icons';

import { TypeSelectorRef, type Props } from '../type';
import { useTypeSelectorHotKey } from '../hooks/hot-key';
import { FlowSchemaInitCtx } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import { TriggerGlobalStyle, StyledFullContainer, TriggerText } from './style';

export const Trigger = ({
  value: originValue,
  ctx,
  typeSelectorRef,
  triggerRef,
  searchValue,
  onSearchChange,
}: Props<IJsonSchema> & {
  ctx: FlowSchemaInitCtx;
  searchValue: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  typeSelectorRef: React.MutableRefObject<TypeSelectorRef | null>;
  onSearchChange: (query: string) => void;
}) => {
  const typeService = useTypeDefinitionManager();

  const value = useMemo(() => {
    if (!originValue) {
      return;
    }
    const type = typeService.getTypeBySchema(originValue);

    return type?.getStringValueByTypeSchema?.(originValue) || '';
  }, [originValue]);

  const [focus, setFocus] = useState(false);

  const hotkeys = useTypeSelectorHotKey(typeSelectorRef);

  const reverseLabel = useMemo(() => {
    if (!value || !originValue) {
      return;
    }

    const def = typeService.getTypeBySchema(originValue);

    return def ? def.getDisplayLabel(originValue) : <>{value}</>;
  }, [originValue, value]);

  return (
    <StyledFullContainer
      ref={triggerRef as React.RefObject<HTMLDivElement>}
      className={classNames(
        'semi-cascader semi-cascader-focus semi-cascader-single semi-cascader-filterable'
      )}
    >
      <TriggerGlobalStyle />
      <div className="semi-cascader-selection">
        <div className="semi-cascader-search-wrapper">
          {!searchValue && (
            <TriggerText
              style={{
                opacity: focus ? 0.5 : 1,
              }}
              className={classNames('semi-cascader-selection-text-inactive')}
            >
              <>{reverseLabel}</>
            </TriggerText>
          )}

          <div className="semi-input-wrapper semi-input-wrapper-focus semi-input-wrapper-default">
            <Input
              autoFocus
              onFocus={() => {
                setFocus(true);
              }}
              onKeyDown={(e) => {
                const hotKey = hotkeys.find((item) => item.matcher(e));
                hotKey?.callback();
                if (hotKey?.preventDefault) {
                  e.preventDefault();
                }
              }}
              value={searchValue}
              onChange={(newVal) => {
                onSearchChange(newVal);
              }}
              className="semi-cascader-input"
              onBlur={() => {
                setFocus(false);
              }}
            />
          </div>
        </div>
      </div>
      <div className="semi-cascader-arrow">
        <IconChevronDown />
      </div>
    </StyledFullContainer>
  );
};
