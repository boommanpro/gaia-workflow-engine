/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type CSSProperties, type FC } from 'react';

import {
  useService,
  useStartDragNode,
  FlowGroupService,
  type FlowNodeEntity,
  type FlowGroupController,
  useClientContext,
} from '@flowgram.ai/fixed-layout-editor';
import { Button, ButtonGroup, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconDeleteStroked,
  IconExpand,
  IconHandle,
  IconShrink,
} from '@douyinfe/semi-icons';

import { writeData } from '../../shortcuts/utils';
import { IconUngroupOutlined } from './icons';

interface GroupToolsProps {
  groupNode: FlowNodeEntity;
  groupController: FlowGroupController;
  visible: boolean;
  style?: CSSProperties;
}

const BUTTON_HEIGHT = 24;

export const GroupTools: FC<GroupToolsProps> = (props) => {
  const { groupNode, groupController, visible, style = {} } = props;

  const groupService = useService<FlowGroupService>(FlowGroupService);
  const { operation, playground, clipboard } = useClientContext();

  const { startDrag } = useStartDragNode();

  const buttonStyle = {
    cursor: 'pointer',
    height: BUTTON_HEIGHT,
  };
  if (playground.config.readonly) return null;

  return (
    <div
      style={{
        display: 'flex',
        opacity: visible ? 1 : 0,
        gap: 5,
        paddingBottom: 5,
        color: 'rgb(97, 69, 211)',
        ...style,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <ButtonGroup size="small" theme="borderless" style={{ display: 'flex', flexWrap: 'nowrap' }}>
        <Tooltip content="Drag">
          <Button
            style={{ ...buttonStyle, cursor: 'grab' }}
            icon={<IconHandle />}
            type="primary"
            theme="borderless"
            onMouseDown={(e) => {
              e.stopPropagation();
              startDrag(e, {
                dragStartEntity: groupNode,
                dragEntities: [groupNode],
              });
            }}
          />
        </Tooltip>

        <Tooltip content={groupController?.collapsed ? 'Expand' : 'Collapse'}>
          <Button
            style={buttonStyle}
            icon={groupController?.collapsed ? <IconExpand /> : <IconShrink />}
            type="primary"
            theme="borderless"
            onClick={(e) => {
              if (!groupController) {
                return;
              }
              e.stopPropagation();
              if (groupController.collapsed) {
                groupController.expand();
              } else {
                groupController.collapse();
              }
            }}
          />
        </Tooltip>
        <Tooltip content="Ungroup">
          <Button
            style={buttonStyle}
            icon={<IconUngroupOutlined />}
            type="primary"
            theme="borderless"
            onClick={() => {
              groupService.ungroup(groupNode);
            }}
          />
        </Tooltip>
        <Tooltip content="Copy">
          <Button
            icon={<IconCopy />}
            style={buttonStyle}
            type="primary"
            theme="borderless"
            onClick={() => {
              const nodeJSON = groupNode.toJSON();

              writeData([nodeJSON], clipboard);
              Toast.success({
                content: 'Copied. You can move to any [+] to paste.',
              });
            }}
          />
        </Tooltip>
        <Tooltip content="Delete">
          <Button
            style={buttonStyle}
            type="primary"
            theme="borderless"
            icon={<IconDeleteStroked />}
            onClick={() => {
              operation.deleteNode(groupNode);
            }}
          />
        </Tooltip>
      </ButtonGroup>
    </div>
  );
};
