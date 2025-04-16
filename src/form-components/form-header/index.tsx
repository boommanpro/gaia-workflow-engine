import { type MouseEvent, useCallback, useRef, useState } from 'react';

import {
  Field,
  FieldRenderProps,
  useClientContext,
  useService,
} from '@flowgram.ai/free-layout-editor';
import { NodeIntoContainerService } from '@flowgram.ai/free-container-plugin';
import { Button, Dropdown, IconButton, Input, Typography } from '@douyinfe/semi-ui';
import { IconMore, IconPlay } from '@douyinfe/semi-icons';

import { Feedback } from '../feedback';
import { FlowNodeRegistry } from '../../typings';
import { FlowCommandId } from '../../shortcuts';
import { useIsSidebar, useNodeRenderContext } from '../../hooks';
import { getIcon } from './utils';
import { Header, Operators, Title } from './styles';

const { Text } = Typography;

function DropdownContent() {
  const [key, setKey] = useState(0);
  const { node, deleteNode } = useNodeRenderContext();
  const clientContext = useClientContext();
  const registry = node.getNodeRegistry<FlowNodeRegistry>();
  const nodeIntoContainerService = useService<NodeIntoContainerService>(NodeIntoContainerService);
  const canMoveOut = nodeIntoContainerService.canMoveOutContainer(node);

  const rerenderMenu = useCallback(() => {
    setKey((prevKey) => prevKey + 1);
  }, []);

  const handleMoveOut = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      nodeIntoContainerService.moveOutContainer({ node });
      nodeIntoContainerService.removeNodeLines(node);
      requestAnimationFrame(rerenderMenu);
    },
    [nodeIntoContainerService, node, rerenderMenu]
  );

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      clientContext.playground.commandService.executeCommand(FlowCommandId.COPY, node);
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
    },
    [clientContext, node]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      deleteNode();
      e.stopPropagation(); // Disable clicking prevents the sidebar from opening
    },
    [clientContext, node]
  );

  return (
    <Dropdown
      trigger="hover"
      position="bottomRight"
      onVisibleChange={rerenderMenu}
      render={
        <Dropdown.Menu key={key}>
          {canMoveOut && <Dropdown.Item onClick={handleMoveOut}>Move out</Dropdown.Item>}
          <Dropdown.Item onClick={handleCopy} disabled={registry.meta!.copyDisable === true}>
            Copy
          </Dropdown.Item>
          <Dropdown.Item
            onClick={handleDelete}
            disabled={!!(registry.canDelete?.(clientContext, node) || registry.meta!.deleteDisable)}
          >
            Delete
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <IconButton
        color="secondary"
        size="small"
        theme="borderless"
        icon={<IconMore />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
}

export function FormHeader() {
  const { node, expanded, toggleExpand, readonly } = useNodeRenderContext();
  const registry = node.getNodeRegistry<FlowNodeRegistry>();
  const isSidebar = useIsSidebar();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    if (!readonly) {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleBlur = (onChange: (value: string) => void, value: string) => {
    onChange(value);
    setIsEditing(false);
  };

  const handleExpand = (e: React.MouseEvent) => {
    toggleExpand();
    e.stopPropagation(); // Disable clicking prevents the sidebar from opening
  };

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation(); // Disable clicking prevents the sidebar from opening
  };

  return (
    <>
      <Header>
        {getIcon(node)}
        <Title onDoubleClick={handleDoubleClick}>
          <Field name="title">
            {({ field: { value, onChange }, fieldState }: FieldRenderProps<string>) => (
              <div style={{ height: 24 }}>
                {isEditing ? (
                  <Input
                    ref={inputRef}
                    defaultValue={value}
                    onBlur={() => handleBlur(onChange, inputRef.current?.value || '')}
                    onEnterPress={() => handleBlur(onChange, inputRef.current?.value || '')}
                  />
                ) : (
                  <Text ellipsis={{ showTooltip: true }}>{value}</Text>
                )}
                <Feedback errors={fieldState?.errors} />
              </div>
            )}
          </Field>
        </Title>
        <span>{node.id}</span>
        {!isSidebar && !registry.meta!.runDisable && (
          <Button
            type="tertiary"
            icon={<IconPlay />}
            size="small"
            theme="borderless"
            onClick={handleRun}
          />
        )}
        {isSidebar || readonly || registry.meta!.hiddenOperators ? undefined : (
          <Operators>
            <DropdownContent />
          </Operators>
        )}
      </Header>
    </>
  );
}
