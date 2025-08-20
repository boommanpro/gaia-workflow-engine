/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { usePlaygroundTools } from '@flowgram.ai/fixed-layout-editor';
import { Checkbox, IconButton, Space, Tooltip } from '@douyinfe/semi-ui';
import { IconUndo, IconRedo, IconShrink, IconExpand, IconGridView } from '@douyinfe/semi-icons';

export const PlaygroundTools = ({ layoutText }: { layoutText?: string }) => {
  const tools = usePlaygroundTools();
  const { zoom } = tools;

  return (
    <Space>
      <Checkbox onChange={() => tools.changeLayout()} checked={!tools.isVertical}>
        {layoutText || 'isHorizontal'}
      </Checkbox>
      <Tooltip content="fit view">
        <IconButton icon={<IconGridView />} onClick={() => tools.fitView()} />
      </Tooltip>
      <Tooltip content="zoom out">
        <IconButton icon={<IconShrink />} onClick={() => tools.zoomout()} />
      </Tooltip>
      <Tooltip content="zoom in">
        <IconButton icon={<IconExpand />} onClick={() => tools.zoomin()} />
      </Tooltip>
      <Tooltip content="undo">
        <IconButton icon={<IconUndo />} disabled={tools.canUndo} onClick={() => tools.undo()} />
      </Tooltip>
      <Tooltip content="redo">
        <IconButton icon={<IconRedo />} disabled={tools.canRedo} onClick={() => tools.redo()} />
      </Tooltip>
      <span>{Math.floor(zoom * 100)}%</span>
    </Space>
  );
};
