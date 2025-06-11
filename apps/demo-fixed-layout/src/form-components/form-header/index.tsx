import { useContext, useCallback, useMemo, useState } from 'react';

import { useClientContext } from '@flowgram.ai/fixed-layout-editor';
import { IconButton, Dropdown, Button } from '@douyinfe/semi-ui';
import { IconSmallTriangleDown, IconSmallTriangleLeft } from '@douyinfe/semi-icons';
import { IconMore } from '@douyinfe/semi-icons';

import { FlowNodeRegistry } from '../../typings';
import { FlowCommandId } from '../../shortcuts/constants';
import { useIsSidebar } from '../../hooks';
import { NodeRenderContext } from '../../context';
import { getIcon } from './utils';
import { TitleInput } from './title-input';
import { Header, Operators } from './styles';

function DropdownContent(props: { updateTitleEdit: (editing: boolean) => void }) {
  const { updateTitleEdit } = props;
  const { node, deleteNode } = useContext(NodeRenderContext);
  const clientContext = useClientContext();
  const registry = node.getNodeRegistry<FlowNodeRegistry>();
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

  const handleEditTitle = useCallback(() => {
    updateTitleEdit(true);
  }, [updateTitleEdit]);

  const deleteDisabled = useMemo(() => {
    if (registry.canDelete) {
      return !registry.canDelete(clientContext, node);
    }
    return registry.meta!.deleteDisable;
  }, [registry, node]);

  return (
    <Dropdown.Menu>
      <Dropdown.Item onClick={handleEditTitle}>Edit Title</Dropdown.Item>
      <Dropdown.Item onClick={handleCopy} disabled={registry.meta!.copyDisable === true}>
        Copy
      </Dropdown.Item>
      <Dropdown.Item onClick={handleDelete} disabled={deleteDisabled}>
        Delete
      </Dropdown.Item>
    </Dropdown.Menu>
  );
}

export function FormHeader() {
  const { node, expanded, startDrag, toggleExpand, readonly } = useContext(NodeRenderContext);
  const [titleEdit, updateTitleEdit] = useState<boolean>(false);

  const isSidebar = useIsSidebar();
  const handleExpand = (e: React.MouseEvent) => {
    toggleExpand();
    e.stopPropagation(); // Disable clicking prevents the sidebar from opening
  };

  return (
    <Header
      onMouseDown={(e) => {
        // trigger drag node
        startDrag(e);
        // e.stopPropagation();
      }}
    >
      {getIcon(node)}
      <TitleInput readonly={readonly} titleEdit={titleEdit} updateTitleEdit={updateTitleEdit} />
      {node.renderData.expandable && !isSidebar && (
        <Button
          type="primary"
          icon={expanded ? <IconSmallTriangleDown /> : <IconSmallTriangleLeft />}
          size="small"
          theme="borderless"
          onClick={handleExpand}
        />
      )}
      {readonly ? undefined : (
        <Operators>
          <Dropdown
            trigger="hover"
            position="bottomRight"
            render={<DropdownContent updateTitleEdit={updateTitleEdit} />}
          >
            <IconButton
              color="secondary"
              size="small"
              theme="borderless"
              icon={<IconMore />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </Operators>
      )}
    </Header>
  );
}
