/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FunctionComponent, useMemo } from 'react';

import {
  useStartDragNode,
  FlowNodeRenderData,
  FlowNodeBaseType,
  FlowGroupService,
  type FlowNodeEntity,
  SelectorBoxPopoverProps,
} from '@flowgram.ai/fixed-layout-editor';
import { Button, ButtonGroup, Tooltip } from '@douyinfe/semi-ui';
import {
  IconCopy,
  IconDeleteStroked,
  IconExpand,
  IconHandle,
  IconShrink,
} from '@douyinfe/semi-icons';

import { FlowCommandId } from '../../shortcuts/constants';
import { IconGroupOutlined } from '../../plugins/group-plugin/icons';

const BUTTON_HEIGHT = 24;

export const SelectorBoxPopover: FunctionComponent<SelectorBoxPopoverProps> = ({
  bounds,
  children,
  flowSelectConfig,
  commandRegistry,
}) => {
  const selectNodes = flowSelectConfig.selectedNodes;

  const { startDrag } = useStartDragNode();

  const draggable = selectNodes[0]?.getData(FlowNodeRenderData)?.draggable;

  // Does the selected component have a group node? (High-cost computation must use memo)
  const hasGroup: boolean = useMemo(() => {
    if (!selectNodes || selectNodes.length === 0) {
      return false;
    }
    const findGroupInNodes = (nodes: FlowNodeEntity[]): boolean =>
      nodes.some((node) => {
        if (node.flowNodeType === FlowNodeBaseType.GROUP) {
          return true;
        }
        if (node.blocks && node.blocks.length) {
          return findGroupInNodes(node.blocks);
        }
        return false;
      });
    return findGroupInNodes(selectNodes);
  }, [selectNodes]);

  const canGroup = !hasGroup && FlowGroupService.validate(selectNodes);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: bounds.right,
          top: bounds.top,
          transform: 'translate(-100%, -100%)',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <ButtonGroup
          size="small"
          style={{ display: 'flex', flexWrap: 'nowrap', height: BUTTON_HEIGHT }}
        >
          {draggable && (
            <Tooltip content="Drag">
              <Button
                style={{ cursor: 'grab', height: BUTTON_HEIGHT }}
                icon={<IconHandle />}
                type="primary"
                theme="solid"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startDrag(e, {
                    dragStartEntity: selectNodes[0],
                    dragEntities: selectNodes,
                  });
                }}
              />
            </Tooltip>
          )}

          <Tooltip content={'Collapse'}>
            <Button
              icon={<IconShrink />}
              style={{ height: BUTTON_HEIGHT }}
              type="primary"
              theme="solid"
              onMouseDown={(e) => {
                commandRegistry.executeCommand(FlowCommandId.COLLAPSE);
              }}
            />
          </Tooltip>

          <Tooltip content={'Expand'}>
            <Button
              icon={<IconExpand />}
              style={{ height: BUTTON_HEIGHT }}
              type="primary"
              theme="solid"
              onMouseDown={(e) => {
                commandRegistry.executeCommand(FlowCommandId.EXPAND);
              }}
            />
          </Tooltip>

          <Tooltip content={'Group'}>
            <Button
              icon={<IconGroupOutlined />}
              type="primary"
              theme="solid"
              style={{
                display: canGroup ? 'inherit' : 'none',
                height: BUTTON_HEIGHT,
              }}
              onClick={() => {
                commandRegistry.executeCommand(FlowCommandId.GROUP);
              }}
            />
          </Tooltip>

          <Tooltip content={'Copy'}>
            <Button
              icon={<IconCopy />}
              style={{ height: BUTTON_HEIGHT }}
              type="primary"
              theme="solid"
              onClick={() => {
                commandRegistry.executeCommand(FlowCommandId.COPY);
              }}
            />
          </Tooltip>

          <Tooltip content={'Delete'}>
            <Button
              type="primary"
              theme="solid"
              icon={<IconDeleteStroked />}
              style={{ height: BUTTON_HEIGHT }}
              onClick={() => {
                commandRegistry.executeCommand(FlowCommandId.DELETE);
              }}
            />
          </Tooltip>
        </ButtonGroup>
      </div>
      <div
        style={{ cursor: draggable ? 'grab' : 'auto' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          startDrag(e, {
            dragStartEntity: selectNodes[0],
            dragEntities: selectNodes,
          });
        }}
      >
        {children}
      </div>
    </>
  );
};
