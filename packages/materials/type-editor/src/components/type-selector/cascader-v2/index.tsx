/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Popover } from '@douyinfe/semi-ui';

import { TypeSelectorRef, type Props } from '../type';
import { FlowSchemaInitCtx } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import { TypeSearchPanel } from './type-search';
import { TypeCascader } from './type-cascader';
import { Trigger } from './trigger';
import { CascaderContainer, CustomCascaderContainer } from './style';

export const CascaderV2 = (
  props: Props<IJsonSchema> & {
    onInit?: (typeEditorRef: TypeSelectorRef) => void;
  }
) => {
  const {
    triggerRender,
    disabled,
    defaultOpen,
    onInit,
    value,
    onDropdownVisibleChange,
    getPopupContainer = () => document.body,
  } = props;

  const triggerRef = useRef<HTMLDivElement>(null);

  const typeSelectorRef = useRef<TypeSelectorRef>(null);

  const [searchValue, setSearchValue] = useState('');

  const typeService = useTypeDefinitionManager();

  useEffect(() => {
    if (typeSelectorRef.current) {
      onInit?.(typeSelectorRef.current);
    }
  }, [typeSelectorRef.current, onInit]);

  const [rePosKey, setReposKey] = useState(0);
  const [context, setContext] = useState<FlowSchemaInitCtx>(
    (value && typeService.getTypeBySchema(value)?.typeCascaderConfig?.generateInitCtx?.(value)) ||
      {}
  );

  const [visible, setVisible] = useState(defaultOpen);

  if (disabled) {
    return (
      <>
        {triggerRender ? (
          <CustomCascaderContainer>{triggerRender()}</CustomCascaderContainer>
        ) : (
          <CascaderContainer>
            <Trigger
              typeSelectorRef={typeSelectorRef}
              triggerRef={triggerRef}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              ctx={context}
              {...props}
            />
          </CascaderContainer>
        )}
      </>
    );
  }

  return (
    <>
      <Popover
        rePosKey={rePosKey}
        visible={visible}
        onVisibleChange={(v) => {
          setVisible(v);
          if (onDropdownVisibleChange) {
            onDropdownVisibleChange(v);
          }
          if (v) {
            setReposKey((key) => key + 1);
          }
        }}
        autoAdjustOverflow
        trigger="click"
        position="bottomLeft"
        getPopupContainer={getPopupContainer}
        content={
          !searchValue ? (
            <TypeCascader
              ref={typeSelectorRef}
              onContextChange={setContext}
              onRePos={() => setReposKey((pre) => pre + 1)}
              {...props}
            />
          ) : (
            <TypeSearchPanel
              onSearchChange={setSearchValue}
              ref={typeSelectorRef}
              triggerRef={triggerRef}
              query={searchValue}
              {...props}
            />
          )
        }
      >
        {triggerRender ? (
          <CustomCascaderContainer>{triggerRender()}</CustomCascaderContainer>
        ) : (
          <CascaderContainer>
            <Trigger
              triggerRef={triggerRef}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              typeSelectorRef={typeSelectorRef}
              ctx={context}
              {...props}
            />
          </CascaderContainer>
        )}
      </Popover>
    </>
  );
};
