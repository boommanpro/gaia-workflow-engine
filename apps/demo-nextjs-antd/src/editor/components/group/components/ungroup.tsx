import { CSSProperties, FC } from 'react';

import { Button, Tooltip } from 'antd';
import { CommandRegistry, WorkflowNodeEntity, useService } from '@flowgram.ai/free-layout-editor';
import { WorkflowGroupCommand } from '@flowgram.ai/free-group-plugin';

import { IconUngroup } from './icon-group';

interface UngroupButtonProps {
  node: WorkflowNodeEntity;
  style?: CSSProperties;
}

export const UngroupButton: FC<UngroupButtonProps> = ({ node, style }) => {
  const commandRegistry = useService(CommandRegistry);
  return (
    <Tooltip title="Ungroup">
      <div className="workflow-group-ungroup" style={style}>
        <Button
          icon={<IconUngroup size={14} />}
          style={{ height: 30, width: 30 }}
          type="text"
          onClick={() => {
            commandRegistry.executeCommand(WorkflowGroupCommand.Ungroup, node);
          }}
        />
      </div>
    </Tooltip>
  );
};
