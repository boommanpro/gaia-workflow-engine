import { FunctionComponent } from 'react';

import { Button, Tooltip } from 'antd';
import { SelectorBoxPopoverProps } from '@flowgram.ai/free-layout-editor';
import { WorkflowGroupCommand } from '@flowgram.ai/free-group-plugin';
import { CopyOutlined, DeleteOutlined, ExpandAltOutlined, ShrinkOutlined } from '@ant-design/icons';

import { FlowCommandId } from '@editor/shortcuts/constants';
import { IconGroup } from '../group';

const BUTTON_HEIGHT = 24;

export const SelectorBoxPopover: FunctionComponent<SelectorBoxPopoverProps> = ({
  bounds,
  children,
  flowSelectConfig,
  commandRegistry,
}) => (
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
      {/* <ButtonGroup
        size="small"
        style={{ display: 'flex', flexWrap: 'nowrap', height: BUTTON_HEIGHT }}
      > */}
      <Tooltip title={'Collapse'}>
        <Button
          icon={<ShrinkOutlined />}
          style={{ height: BUTTON_HEIGHT }}
          type="primary"
          // theme="solid"
          onMouseDown={(e) => {
            commandRegistry.executeCommand(FlowCommandId.COLLAPSE);
          }}
        />
      </Tooltip>

      <Tooltip title={'Expand'}>
        <Button
          icon={<ExpandAltOutlined />}
          style={{ height: BUTTON_HEIGHT }}
          type="primary"
          // theme="solid"
          onMouseDown={(e) => {
            commandRegistry.executeCommand(FlowCommandId.EXPAND);
          }}
        />
      </Tooltip>

      <Tooltip title={'Create Group'}>
        <Button
          icon={<IconGroup size={14} />}
          style={{ height: BUTTON_HEIGHT }}
          type="primary"
          // theme="solid"
          onClick={() => {
            commandRegistry.executeCommand(WorkflowGroupCommand.Group);
          }}
        />
      </Tooltip>

      <Tooltip title={'Copy'}>
        <Button
          icon={<CopyOutlined />}
          style={{ height: BUTTON_HEIGHT }}
          type="primary"
          // theme="solid"
          onClick={() => {
            commandRegistry.executeCommand(FlowCommandId.COPY);
          }}
        />
      </Tooltip>

      <Tooltip title={'Delete'}>
        <Button
          type="primary"
          // theme="solid"
          icon={<DeleteOutlined />}
          style={{ height: BUTTON_HEIGHT }}
          onClick={() => {
            commandRegistry.executeCommand(FlowCommandId.DELETE);
          }}
        />
      </Tooltip>
      {/* </ButtonGroup> */}
    </div>
    <div>{children}</div>
  </>
);
