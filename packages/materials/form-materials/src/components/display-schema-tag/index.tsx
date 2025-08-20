/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Popover } from '@douyinfe/semi-ui';

import { useTypeManager } from '@/plugins';
import { DisplaySchemaTree } from '@/components/display-schema-tree';

import { PopoverContent, StyledTag, TitleSpan } from './styles';

interface PropsType {
  title?: JSX.Element | string;
  value?: IJsonSchema;
  showIconInTree?: boolean;
  warning?: boolean;
}

export function DisplaySchemaTag({ value = {}, showIconInTree, title, warning }: PropsType) {
  const typeManager = useTypeManager();
  const icon =
    typeManager?.getDisplayIcon(value) || typeManager.getDisplayIcon({ type: 'unknown' });

  return (
    <Popover
      content={
        <PopoverContent>
          <DisplaySchemaTree value={value} typeManager={typeManager} showIcon={showIconInTree} />
        </PopoverContent>
      }
    >
      <StyledTag color={warning ? 'amber' : 'white'}>
        {icon &&
          React.cloneElement(icon, {
            className: 'tag-icon',
          })}
        {title && <TitleSpan>{title}</TitleSpan>}
      </StyledTag>
    </Popover>
  );
}
