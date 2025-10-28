/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Popover, Tag } from '@douyinfe/semi-ui';

import { useTypeManager } from '@/plugins';
import { DisplaySchemaTree } from '@/components/display-schema-tree';

import './styles.css';

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
        <div className="gedit-m-display-schema-tag-popover-content">
          <DisplaySchemaTree value={value} typeManager={typeManager} showIcon={showIconInTree} />
        </div>
      }
    >
      <Tag color={warning ? 'amber' : 'white'} className="gedit-m-display-schema-tag-tag">
        {icon &&
          React.cloneElement(icon, {
            className: 'tag-icon',
          })}
        {title && <span className="gedit-m-display-schema-tag-title">{title}</span>}
      </Tag>
    </Popover>
  );
}
