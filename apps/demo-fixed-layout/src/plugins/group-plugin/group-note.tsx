/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useRef, useState, type CSSProperties, type FC } from 'react';

import {
  type FlowGroupController,
  type FlowNodeEntity,
  useClientContext,
} from '@flowgram.ai/fixed-layout-editor';
import type { AutosizeRow } from '@douyinfe/semi-ui/lib/es/input/textarea';
import { Tooltip } from '@douyinfe/semi-ui';

import MultiLineEditor from './multilang-textarea-editor';

interface GroupNoteProps {
  groupNode: FlowNodeEntity;
  groupController: FlowGroupController;
  autoSize?: AutosizeRow | boolean;
  textStyle?: CSSProperties;
  containerStyle?: CSSProperties;
  enableTooltip?: boolean;
}

export const GroupNote: FC<GroupNoteProps> = (props) => {
  const {
    groupController,
    containerStyle = {},
    textStyle = {},
    autoSize = true,
    enableTooltip = false,
  } = props;

  const [editingValue, setEditingValue] = useState<string>('');

  const ref = useRef<HTMLDivElement>(null);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const { playground } = useClientContext();
  const [editing, setEditing] = useState<boolean>(false);

  if (!groupController) {
    return <></>;
  }

  return (
    <div
      className="gedit-group-note"
      ref={ref}
      style={containerStyle}
      onMouseEnter={() => {
        if (!editingValue || !enableTooltip || editing) {
          if (tooltipVisible) {
            setTooltipVisible(false);
          }
          return;
        }
        setTooltipVisible(true);
      }}
      onMouseLeave={() => {
        setTooltipVisible(false);
      }}
    >
      <Tooltip
        className="gedit-group-note-tooltip"
        trigger="custom"
        visible={tooltipVisible}
        content={editingValue}
      >
        <MultiLineEditor
          value={editingValue}
          onChange={(note) => {
            setEditingValue(note || '');
          }}
          readonly={playground.config.readonly}
          placeholder="Please enter note"
          style={textStyle}
          autoSize={autoSize}
          onEditingChange={(editingState) => {
            if (editingState) {
              setTooltipVisible(false);
            }
            setEditing(editingState);
          }}
        />
      </Tooltip>
    </div>
  );
};
